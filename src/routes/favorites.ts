// ============================================================
// Favorites Routes: /api/favorites
// ============================================================
import { Hono } from 'hono'
import { CloudflareBindings } from '../lib/types'
import { requireAuth } from '../middleware/auth'
import { generateId } from '../lib/auth'

type Variables = { user: any }

const favorites = new Hono<{ Bindings: CloudflareBindings; Variables: Variables }>()

// GET /api/favorites - list user favorites
favorites.get('/', requireAuth, async (c) => {
  const user = c.get('user')
  
  const { results } = await c.env.DB.prepare(`
    SELECT f.id as favorite_id, f.created_at as favorited_at,
           h.id, h.travelpayouts_id, h.name, h.location, h.city, h.country,
           h.stars, h.rating, h.price, h.currency, h.image_url,
           h.affiliate_link, h.latitude, h.longitude, h.amenities,
           h.has_parking, h.has_truck_parking, h.is_family_friendly
    FROM favorites f
    JOIN hotel_cache h ON f.hotel_id = h.id
    WHERE f.user_id = ?
    ORDER BY f.created_at DESC
  `).bind(user.sub).all<any>()

  return c.json({
    favorites: results.map(h => ({
      ...h,
      amenities: tryParseJSON(h.amenities, [])
    })),
    count: results.length
  })
})

// POST /api/favorites/:hotelId - add to favorites
favorites.post('/:hotelId', requireAuth, async (c) => {
  const user = c.get('user')
  const hotelId = c.req.param('hotelId')

  // Verify hotel exists
  const hotel = await c.env.DB.prepare(
    'SELECT id FROM hotel_cache WHERE id = ? OR travelpayouts_id = ?'
  ).bind(hotelId, hotelId).first<any>()

  if (!hotel) {
    return c.json({ error: 'Hotel not found' }, 404)
  }

  const id = generateId()
  try {
    await c.env.DB.prepare(`
      INSERT INTO favorites (id, user_id, hotel_id)
      VALUES (?, ?, ?)
    `).bind(id, user.sub, hotel.id).run()
    
    return c.json({ success: true, favorite_id: id }, 201)
  } catch (err: any) {
    if (err.message?.includes('UNIQUE')) {
      return c.json({ error: 'Already in favorites' }, 409)
    }
    return c.json({ error: 'Failed to add favorite' }, 500)
  }
})

// DELETE /api/favorites/:hotelId - remove from favorites
favorites.delete('/:hotelId', requireAuth, async (c) => {
  const user = c.get('user')
  const hotelId = c.req.param('hotelId')

  const result = await c.env.DB.prepare(`
    DELETE FROM favorites 
    WHERE user_id = ? AND (hotel_id = ? OR hotel_id IN (
      SELECT id FROM hotel_cache WHERE travelpayouts_id = ?
    ))
  `).bind(user.sub, hotelId, hotelId).run()

  if (result.meta.changes === 0) {
    return c.json({ error: 'Favorite not found' }, 404)
  }

  return c.json({ success: true })
})

// GET /api/favorites/check/:hotelId - check if hotel is favorited
favorites.get('/check/:hotelId', requireAuth, async (c) => {
  const user = c.get('user')
  const hotelId = c.req.param('hotelId')

  const fav = await c.env.DB.prepare(`
    SELECT f.id FROM favorites f
    JOIN hotel_cache h ON f.hotel_id = h.id
    WHERE f.user_id = ? AND (h.id = ? OR h.travelpayouts_id = ?)
  `).bind(user.sub, hotelId, hotelId).first<any>()

  return c.json({ is_favorited: !!fav })
})

function tryParseJSON(str: string | null | undefined, fallback: any = null): any {
  if (!str) return fallback
  try { return JSON.parse(str) } catch { return fallback }
}

export default favorites
