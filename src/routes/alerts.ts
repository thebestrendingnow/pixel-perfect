// ============================================================
// Price Alerts Routes: /api/alerts
// ============================================================
import { Hono } from 'hono'
import { CloudflareBindings, TIER_LIMITS, SubscriptionTier } from '../lib/types'
import { requireAuth, requireTier } from '../middleware/auth'
import { generateId } from '../lib/auth'
import { sendEmail, priceAlertEmailHTML } from '../lib/email'

type Variables = { user: any }

const alerts = new Hono<{ Bindings: CloudflareBindings; Variables: Variables }>()

// GET /api/alerts - list user price alerts
alerts.get('/', requireAuth, requireTier('traveler'), async (c) => {
  const user = c.get('user')

  const { results } = await c.env.DB.prepare(`
    SELECT pa.*, hc.name as hotel_name_cached, hc.image_url, hc.affiliate_link
    FROM price_alerts pa
    LEFT JOIN hotel_cache hc ON pa.hotel_id = hc.id OR pa.hotel_id = hc.travelpayouts_id
    WHERE pa.user_id = ?
    ORDER BY pa.created_at DESC
  `).bind(user.sub).all<any>()

  return c.json({ alerts: results, count: results.length })
})

// POST /api/alerts - create price alert
alerts.post('/', requireAuth, requireTier('traveler'), async (c) => {
  try {
    const user = c.get('user')
    const { hotel_id, hotel_name, target_price, current_price, currency, check_in, check_out } = await c.req.json<{
      hotel_id: string
      hotel_name?: string
      target_price: number
      current_price?: number
      currency?: string
      check_in?: string
      check_out?: string
    }>()

    if (!hotel_id || !target_price) {
      return c.json({ error: 'hotel_id and target_price are required' }, 400)
    }

    // Check tier alert limit
    const tier = (user.tier as SubscriptionTier) || 'free'
    const limits = TIER_LIMITS[tier]
    const alertLimit = limits.price_alerts

    if (alertLimit !== Infinity) {
      const { results: existing } = await c.env.DB.prepare(
        'SELECT COUNT(*) as cnt FROM price_alerts WHERE user_id = ? AND status = ?'
      ).bind(user.sub, 'active').all<any>()
      
      const count = existing[0]?.cnt || 0
      if (count >= alertLimit) {
        return c.json({
          error: 'Alert limit reached',
          message: `Your ${tier} tier allows ${alertLimit} active price alerts`,
          current: count,
          limit: alertLimit,
          upgrade_url: 'https://travelpayout.app/upgrade'
        }, 429)
      }
    }

    // Get hotel name from cache if not provided
    let finalHotelName = hotel_name
    if (!finalHotelName) {
      const hotelData = await c.env.DB.prepare(
        'SELECT name FROM hotel_cache WHERE id = ? OR travelpayouts_id = ?'
      ).bind(hotel_id, hotel_id).first<any>()
      finalHotelName = hotelData?.name || 'Hotel'
    }

    const id = generateId()
    await c.env.DB.prepare(`
      INSERT INTO price_alerts (id, user_id, hotel_id, hotel_name, target_price, current_price, currency, check_in, check_out, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
    `).bind(id, user.sub, hotel_id, finalHotelName, target_price, current_price || null, 
            currency || 'USD', check_in || null, check_out || null).run()

    return c.json({ success: true, alert_id: id }, 201)
  } catch (err: any) {
    return c.json({ error: 'Failed to create alert', message: err.message }, 500)
  }
})

// DELETE /api/alerts/:id - remove price alert
alerts.delete('/:id', requireAuth, async (c) => {
  const user = c.get('user')
  const alertId = c.req.param('id')

  const result = await c.env.DB.prepare(
    'DELETE FROM price_alerts WHERE id = ? AND user_id = ?'
  ).bind(alertId, user.sub).run()

  if (result.meta.changes === 0) return c.json({ error: 'Alert not found' }, 404)
  return c.json({ success: true })
})

// PATCH /api/alerts/:id - pause/resume alert
alerts.patch('/:id', requireAuth, async (c) => {
  const user = c.get('user')
  const alertId = c.req.param('id')
  const { status } = await c.req.json<{ status: 'active' | 'paused' }>()

  if (!['active', 'paused'].includes(status)) {
    return c.json({ error: 'Invalid status' }, 400)
  }

  const result = await c.env.DB.prepare(
    'UPDATE price_alerts SET status = ?, updated_at = datetime(\'now\') WHERE id = ? AND user_id = ?'
  ).bind(status, alertId, user.sub).run()

  if (result.meta.changes === 0) return c.json({ error: 'Alert not found' }, 404)
  return c.json({ success: true })
})

// POST /api/alerts/check - manually trigger price check (internal/admin use)
// This is also called by the cron job
export async function checkPriceAlerts(env: CloudflareBindings): Promise<void> {
  console.log('[CRON] Running price alert check...')

  // Get all active alerts
  const { results: activeAlerts } = await env.DB.prepare(`
    SELECT pa.*, u.email, u.name
    FROM price_alerts pa
    JOIN users u ON pa.user_id = u.id
    WHERE pa.status = 'active'
    ORDER BY pa.created_at ASC
  `).all<any>()

  console.log(`[CRON] Checking ${activeAlerts.length} active alerts`)

  for (const alert of activeAlerts) {
    try {
      // Fetch current price from Travelpayouts
      const url = new URL(`https://engine.hotellook.com/api/v2/cache.json`)
      url.searchParams.set('token', env.TRAVELPAYOUTS_API_KEY)
      url.searchParams.set('hotelId', alert.hotel_id)
      url.searchParams.set('currency', alert.currency || 'USD')

      const response = await fetch(url.toString(), { signal: AbortSignal.timeout(5000) })
      if (!response.ok) continue

      const data = await response.json() as any
      const hotels = Array.isArray(data) ? data : (data.result || data.hotels || [])
      const hotelData = hotels.find((h: any) => String(h.hotelId || h.id) === String(alert.hotel_id))
      
      if (!hotelData) continue

      const currentPrice = hotelData.minPrice || hotelData.price
      if (!currentPrice) continue

      // Update current price in DB
      await env.DB.prepare(
        'UPDATE price_alerts SET current_price = ?, updated_at = datetime(\'now\') WHERE id = ?'
      ).bind(currentPrice, alert.id).run()

      // Check if target price is reached
      if (currentPrice <= alert.target_price) {
        console.log(`[CRON] Alert triggered: ${alert.hotel_name} - $${currentPrice} <= $${alert.target_price}`)

        // Mark as triggered
        await env.DB.prepare(
          'UPDATE price_alerts SET status = \'triggered\', notified_at = datetime(\'now\') WHERE id = ?'
        ).bind(alert.id).run()

        // Get affiliate link
        const hotelCache = await env.DB.prepare(
          'SELECT affiliate_link FROM hotel_cache WHERE travelpayouts_id = ?'
        ).bind(alert.hotel_id).first<any>()
        const affiliateLink = hotelCache?.affiliate_link || 
          `https://www.travelpayouts.com/hotels/${alert.hotel_id}?marker=314682`

        // Send email notification
        if (env.RESEND_API_KEY && alert.email) {
          await sendEmail({
            to: alert.email,
            subject: `🏨 Price Drop Alert: ${alert.hotel_name}`,
            html: priceAlertEmailHTML({
              userName: alert.name || 'Traveler',
              hotelName: alert.hotel_name,
              location: alert.location || '',
              targetPrice: alert.target_price,
              currentPrice,
              currency: alert.currency || 'USD',
              affiliateLink
            })
          }, env.RESEND_API_KEY)
        }
      }
    } catch (err) {
      console.error(`[CRON] Error checking alert ${alert.id}:`, err)
    }
  }

  console.log('[CRON] Price alert check complete')
}

export default alerts
