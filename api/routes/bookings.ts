// ============================================================
// Bookings Routes: /api/bookings
// ============================================================
import { Hono } from 'hono'
import { CloudflareBindings } from '../lib/types'
import { requireAuth, requireTier } from '../middleware/auth'
import { generateId } from '../lib/auth'

type Variables = { user: any }

const bookings = new Hono<{ Bindings: CloudflareBindings; Variables: Variables }>()

// GET /api/bookings - list user bookings
bookings.get('/', requireAuth, async (c) => {
  const user = c.get('user')
  const status = c.req.query('status')
  const limit = parseInt(c.req.query('limit') || '20')

  let query = `
    SELECT * FROM bookings 
    WHERE user_id = ?
  `
  const bindings: any[] = [user.sub]

  if (status) {
    query += ` AND status = ?`
    bindings.push(status)
  }

  query += ` ORDER BY created_at DESC LIMIT ?`
  bindings.push(limit)

  const { results } = await c.env.DB.prepare(query).bind(...bindings).all<any>()

  return c.json({
    bookings: results,
    count: results.length,
    total_commission: results.reduce((sum: number, b: any) => sum + (b.commission_earned || 0), 0)
  })
})

// POST /api/bookings - record a booking (called when user clicks affiliate link)
bookings.post('/', requireAuth, async (c) => {
  try {
    const user = c.get('user')
    const { hotel_id, hotel_name, check_in, check_out, guests, rooms, currency, affiliate_link } = await c.req.json<{
      hotel_id: string
      hotel_name: string
      check_in: string
      check_out: string
      guests?: number
      rooms?: number
      currency?: string
      affiliate_link?: string
    }>()

    if (!hotel_id || !hotel_name || !check_in || !check_out) {
      return c.json({ error: 'hotel_id, hotel_name, check_in, check_out are required' }, 400)
    }

    const id = generateId()
    await c.env.DB.prepare(`
      INSERT INTO bookings (id, user_id, hotel_id, hotel_name, check_in, check_out, guests, rooms, currency, affiliate_link, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `).bind(
      id, user.sub, hotel_id, hotel_name, check_in, check_out,
      guests || 1, rooms || 1, currency || 'USD',
      affiliate_link || `https://www.travelpayouts.com/hotels/${hotel_id}?marker=314682`
    ).run()

    return c.json({ success: true, booking_id: id }, 201)
  } catch (err: any) {
    return c.json({ error: 'Failed to record booking', message: err.message }, 500)
  }
})

// GET /api/bookings/export - export as CSV for expense report (Business+ tier)
bookings.get('/export', requireAuth, requireTier('business'), async (c) => {
  const user = c.get('user')
  const { start_date, end_date } = c.req.query() as any

  let query = 'SELECT * FROM bookings WHERE user_id = ?'
  const bindings: any[] = [user.sub]

  if (start_date) { query += ' AND check_in >= ?'; bindings.push(start_date) }
  if (end_date) { query += ' AND check_out <= ?'; bindings.push(end_date) }
  query += ' ORDER BY check_in ASC'

  const { results } = await c.env.DB.prepare(query).bind(...bindings).all<any>()

  const csvHeader = 'Booking ID,Hotel,Check-in,Check-out,Guests,Rooms,Total Price,Currency,Status,Booking Date\n'
  const csvRows = results.map(b => 
    `"${b.id}","${b.hotel_name}","${b.check_in}","${b.check_out}",${b.guests},${b.rooms},${b.total_price || ''},${b.currency},"${b.status}","${b.created_at}"`
  ).join('\n')

  return new Response(csvHeader + csvRows, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="bookings-export-${new Date().toISOString().split('T')[0]}.csv"`
    }
  })
})

// GET /api/bookings/:id - single booking detail
bookings.get('/:id', requireAuth, async (c) => {
  const user = c.get('user')
  const bookingId = c.req.param('id')

  const booking = await c.env.DB.prepare(
    'SELECT * FROM bookings WHERE id = ? AND user_id = ?'
  ).bind(bookingId, user.sub).first<any>()

  if (!booking) return c.json({ error: 'Booking not found' }, 404)
  return c.json({ booking })
})

export default bookings
