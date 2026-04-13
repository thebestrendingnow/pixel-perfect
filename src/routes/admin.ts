// ============================================================
// Admin / Dashboard Routes: /api/admin
// ============================================================
import { Hono } from 'hono'
import { CloudflareBindings } from '../lib/types'
import { requireAuth, requireTier } from '../middleware/auth'

type Variables = { user: any }

const admin = new Hono<{ Bindings: CloudflareBindings; Variables: Variables }>()

// GET /api/admin/dashboard - agency/business stats
admin.get('/dashboard', requireAuth, requireTier('business'), async (c) => {
  try {
    const user = c.get('user')

    // Total bookings & commission
    const bookingStats = await c.env.DB.prepare(`
      SELECT 
        COUNT(*) as total_bookings,
        SUM(commission_earned) as total_commission,
        AVG(total_price) as avg_booking_value,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_bookings
      FROM bookings WHERE user_id = ?
    `).bind(user.sub).first<any>()

    // Monthly breakdown
    const { results: monthlyStats } = await c.env.DB.prepare(`
      SELECT 
        strftime('%Y-%m', check_in) as month,
        COUNT(*) as bookings,
        SUM(commission_earned) as commission,
        SUM(total_price) as revenue
      FROM bookings WHERE user_id = ?
      GROUP BY month
      ORDER BY month DESC
      LIMIT 12
    `).bind(user.sub).all<any>()

    // Top hotels booked
    const { results: topHotels } = await c.env.DB.prepare(`
      SELECT hotel_name, COUNT(*) as times_booked, SUM(commission_earned) as total_commission
      FROM bookings WHERE user_id = ?
      GROUP BY hotel_name
      ORDER BY times_booked DESC
      LIMIT 10
    `).bind(user.sub).all<any>()

    // Active alerts
    const alertCount = await c.env.DB.prepare(
      'SELECT COUNT(*) as cnt FROM price_alerts WHERE user_id = ? AND status = \'active\''
    ).bind(user.sub).first<any>()

    // Recent bookings
    const { results: recentBookings } = await c.env.DB.prepare(`
      SELECT id, hotel_name, check_in, check_out, total_price, commission_earned, currency, status, created_at
      FROM bookings WHERE user_id = ?
      ORDER BY created_at DESC LIMIT 10
    `).bind(user.sub).all<any>()

    return c.json({
      summary: {
        total_bookings: bookingStats?.total_bookings || 0,
        total_commission: parseFloat((bookingStats?.total_commission || 0).toFixed(2)),
        avg_booking_value: parseFloat((bookingStats?.avg_booking_value || 0).toFixed(2)),
        completed_bookings: bookingStats?.completed_bookings || 0,
        active_alerts: alertCount?.cnt || 0
      },
      monthly_stats: monthlyStats,
      top_hotels: topHotels,
      recent_bookings: recentBookings
    })
  } catch (err: any) {
    return c.json({ error: 'Dashboard error', message: err.message }, 500)
  }
})

// GET /api/admin/commission-report - full commission report (agency only)
admin.get('/commission-report', requireAuth, requireTier('agency'), async (c) => {
  const user = c.get('user')
  const { year, month } = c.req.query() as any

  let dateFilter = ''
  const bindings: any[] = [user.sub]

  if (year && month) {
    dateFilter = `AND strftime('%Y', check_in) = ? AND strftime('%m', check_in) = ?`
    bindings.push(year, month.padStart(2, '0'))
  } else if (year) {
    dateFilter = `AND strftime('%Y', check_in) = ?`
    bindings.push(year)
  }

  const { results } = await c.env.DB.prepare(`
    SELECT 
      id, hotel_name, check_in, check_out, 
      total_price, commission_earned, currency, status,
      created_at
    FROM bookings
    WHERE user_id = ? ${dateFilter}
    ORDER BY check_in DESC
  `).bind(...bindings).all<any>()

  const totalCommission = results.reduce((sum: number, b: any) => sum + (b.commission_earned || 0), 0)
  const totalRevenue = results.reduce((sum: number, b: any) => sum + (b.total_price || 0), 0)

  return c.json({
    report: {
      period: year ? (month ? `${year}-${month.padStart(2, '0')}` : year) : 'all-time',
      total_bookings: results.length,
      total_revenue: parseFloat(totalRevenue.toFixed(2)),
      total_commission: parseFloat(totalCommission.toFixed(2)),
      avg_commission_rate: totalRevenue > 0 
        ? parseFloat(((totalCommission / totalRevenue) * 100).toFixed(1)) 
        : 0
    },
    bookings: results
  })
})

// GET /api/admin/users (agency only - for white-label/team)
admin.get('/users', requireAuth, requireTier('agency'), async (c) => {
  const { results } = await c.env.DB.prepare(`
    SELECT id, email, name, subscription_tier, search_count_today, created_at
    FROM users
    ORDER BY created_at DESC
    LIMIT 100
  `).all<any>()

  return c.json({ users: results, count: results.length })
})

export default admin
