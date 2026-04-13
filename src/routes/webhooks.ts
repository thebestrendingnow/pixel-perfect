// ============================================================
// Webhook Routes: /api/webhook/stripe, /api/webhook/whop
// ============================================================
import { Hono } from 'hono'
import { CloudflareBindings } from '../lib/types'

const webhooks = new Hono<{ Bindings: CloudflareBindings }>()

// Helper: Stripe signature verification using Web Crypto API
async function verifyStripeSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    const parts = signature.split(',')
    const timestamp = parts.find(p => p.startsWith('t='))?.slice(2)
    const v1 = parts.find(p => p.startsWith('v1='))?.slice(3)

    if (!timestamp || !v1) return false

    const signedPayload = `${timestamp}.${payload}`
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    )
    const signature_bytes = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload))
    const expectedSig = Array.from(new Uint8Array(signature_bytes))
      .map(b => b.toString(16).padStart(2, '0')).join('')

    return expectedSig === v1
  } catch {
    return false
  }
}

// Helper: Whop signature verification
async function verifyWhopSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    )
    const sig_bytes = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
    const expected = 'sha256=' + Array.from(new Uint8Array(sig_bytes))
      .map(b => b.toString(16).padStart(2, '0')).join('')
    return expected === signature
  } catch {
    return false
  }
}

function tierFromPlanId(planId: string): string {
  const p = planId.toLowerCase()
  if (p.includes('agency')) return 'agency'
  if (p.includes('business')) return 'business'
  if (p.includes('traveler') || p.includes('traveller') || p.includes('pro')) return 'traveler'
  return 'free'
}

// POST /api/webhook/stripe
webhooks.post('/stripe', async (c) => {
  const sig = c.req.header('stripe-signature')
  if (!sig) return c.json({ error: 'Missing signature' }, 400)

  const payload = await c.req.text()

  // Verify signature (skip if no secret configured)
  if (c.env.STRIPE_WEBHOOK_SECRET) {
    const valid = await verifyStripeSignature(payload, sig, c.env.STRIPE_WEBHOOK_SECRET)
    if (!valid) return c.json({ error: 'Invalid signature' }, 401)
  }

  let event: any
  try {
    event = JSON.parse(payload)
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400)
  }

  const eventType = event.type || ''
  const obj = event.data?.object || {}

  console.log(`[Stripe Webhook] Event: ${eventType}`)

  try {
    switch (eventType) {
      // Subscription created or updated
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const customerId = obj.customer
        const planId = obj.items?.data?.[0]?.price?.id || ''
        const tier = tierFromPlanId(planId)
        const status = obj.status

        // Map to active/cancelled
        const dbStatus = ['active', 'trialing'].includes(status) ? tier : 'free'

        await c.env.DB.prepare(`
          UPDATE users 
          SET subscription_tier = ?, stripe_customer_id = ?, updated_at = datetime('now')
          WHERE stripe_customer_id = ?
        `).bind(dbStatus, customerId, customerId).run()

        console.log(`[Stripe] Customer ${customerId} updated to tier: ${dbStatus}`)
        break
      }

      case 'customer.subscription.deleted': {
        const customerId = obj.customer
        await c.env.DB.prepare(
          'UPDATE users SET subscription_tier = \'free\', updated_at = datetime(\'now\') WHERE stripe_customer_id = ?'
        ).bind(customerId).run()
        console.log(`[Stripe] Customer ${customerId} downgraded to free`)
        break
      }

      // One-time booking payment
      case 'checkout.session.completed': {
        const sessionId = obj.id
        const customerId = obj.customer
        const metadata = obj.metadata || {}
        const bookingId = metadata.booking_id

        if (bookingId) {
          await c.env.DB.prepare(
            'UPDATE bookings SET status = \'confirmed\', updated_at = datetime(\'now\') WHERE id = ?'
          ).bind(bookingId).run()
          console.log(`[Stripe] Booking ${bookingId} confirmed`)
        }
        break
      }

      // Commission earned via Travelpayouts affiliate
      case 'payment_intent.succeeded': {
        const metadata = obj.metadata || {}
        const bookingId = metadata.booking_id
        const commission = parseFloat(metadata.commission || '0')

        if (bookingId && commission > 0) {
          await c.env.DB.prepare(
            'UPDATE bookings SET commission_earned = ?, status = \'completed\', updated_at = datetime(\'now\') WHERE id = ?'
          ).bind(commission, bookingId).run()
        }
        break
      }

      default:
        console.log(`[Stripe] Unhandled event: ${eventType}`)
    }
  } catch (err) {
    console.error('[Stripe Webhook] DB error:', err)
    return c.json({ error: 'Processing error' }, 500)
  }

  return c.json({ received: true })
})

// POST /api/webhook/whop
webhooks.post('/whop', async (c) => {
  const sig = c.req.header('whop-signature') || c.req.header('x-whop-signature')
  const payload = await c.req.text()

  // Verify signature
  if (c.env.WHOP_WEBHOOK_SECRET && sig) {
    const valid = await verifyWhopSignature(payload, sig, c.env.WHOP_WEBHOOK_SECRET)
    if (!valid) return c.json({ error: 'Invalid signature' }, 401)
  }

  let event: any
  try {
    event = JSON.parse(payload)
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400)
  }

  const action = event.action || event.event || ''
  const data = event.data || event || {}

  console.log(`[Whop Webhook] Action: ${action}`)

  try {
    switch (action) {
      case 'membership.went_valid':
      case 'membership.created': {
        const whopUserId = data.user?.id || data.user_id
        const userEmail = data.user?.email
        const planId = data.plan?.id || data.product_id || ''
        const tier = tierFromPlanId(planId)
        const expiresAt = data.expires_at ? new Date(data.expires_at * 1000).toISOString() : null

        if (!whopUserId) break

        // Upsert whop subscription
        await c.env.DB.prepare(`
          INSERT INTO whop_subscriptions (id, whop_user_id, tier, status, whop_plan_id, expires_at)
          VALUES (lower(hex(randomblob(16))), ?, ?, 'active', ?, ?)
          ON CONFLICT(whop_user_id) DO UPDATE SET
            tier = excluded.tier, status = 'active',
            whop_plan_id = excluded.whop_plan_id,
            expires_at = excluded.expires_at,
            updated_at = datetime('now')
        `).bind(whopUserId, tier, planId, expiresAt).run()

        // Update user tier if we can match by email
        if (userEmail) {
          await c.env.DB.prepare(`
            UPDATE users SET 
              subscription_tier = ?, whop_user_id = ?, updated_at = datetime('now')
            WHERE email = ?
          `).bind(tier, whopUserId, userEmail.toLowerCase()).run()
        }

        console.log(`[Whop] User ${whopUserId} granted ${tier} tier`)
        break
      }

      case 'membership.went_invalid':
      case 'membership.deleted':
      case 'membership.expired': {
        const whopUserId = data.user?.id || data.user_id

        if (!whopUserId) break

        await c.env.DB.prepare(
          'UPDATE whop_subscriptions SET status = \'expired\', updated_at = datetime(\'now\') WHERE whop_user_id = ?'
        ).bind(whopUserId).run()

        await c.env.DB.prepare(
          'UPDATE users SET subscription_tier = \'free\', updated_at = datetime(\'now\') WHERE whop_user_id = ?'
        ).bind(whopUserId).run()

        console.log(`[Whop] User ${whopUserId} reverted to free`)
        break
      }

      case 'membership.renewed': {
        const whopUserId = data.user?.id || data.user_id
        const expiresAt = data.expires_at ? new Date(data.expires_at * 1000).toISOString() : null

        if (whopUserId) {
          await c.env.DB.prepare(`
            UPDATE whop_subscriptions SET 
              status = 'active', expires_at = ?, updated_at = datetime('now')
            WHERE whop_user_id = ?
          `).bind(expiresAt, whopUserId).run()
        }
        break
      }

      default:
        console.log(`[Whop] Unhandled action: ${action}`)
    }
  } catch (err) {
    console.error('[Whop Webhook] Error:', err)
    return c.json({ error: 'Processing error' }, 500)
  }

  return c.json({ received: true })
})

export default webhooks
