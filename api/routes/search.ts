// ============================================================
// Hotel Search Routes: /api/search, /api/hotel/:id
// ============================================================
import { Hono } from 'hono'
import { CloudflareBindings } from '../lib/types'
import { requireAuth, optionalAuth, checkSearchLimit } from '../middleware/auth'
import { searchHotels, getHotelById, normalizeHotel, buildAffiliateLink, TRAVELPAYOUTS_MARKER } from '../lib/travelpayouts'
import { generateId } from '../lib/auth'

type Variables = { user: any }

const search = new Hono<{ Bindings: CloudflareBindings; Variables: Variables }>()

// POST /api/search - main hotel search with D1 caching
// optionalAuth so guests can browse without logging in
search.post('/', optionalAuth, async (c) => {
  try {
    const body = await c.req.json<{
      location: string
      check_in?: string
      check_out?: string
      guests?: number
      rooms?: number
      stars?: number
      max_price?: number
      has_parking?: boolean
      has_truck_parking?: boolean
      is_family_friendly?: boolean
      currency?: string
      language?: string
      limit?: number
      offset?: number
    }>()

    if (!body.location) {
      return c.json({ error: 'Location is required' }, 400)
    }

    const limit = Math.min(body.limit || 20, 50)
    const offset = body.offset || 0

    // 1. Check D1 cache first (within last hour for same location)
    let cacheQuery = `
      SELECT * FROM hotel_cache 
      WHERE (LOWER(city) LIKE ? OR LOWER(location) LIKE ? OR LOWER(country) LIKE ?)
        AND expires_at > datetime('now')
    `
    const locationFilter = `%${body.location.toLowerCase()}%`
    let cacheBindings: any[] = [locationFilter, locationFilter, locationFilter]

    // Apply filters
    const filters: string[] = []
    if (body.stars) { filters.push('stars >= ?'); cacheBindings.push(body.stars) }
    if (body.max_price) { filters.push('price <= ?'); cacheBindings.push(body.max_price) }
    if (body.has_parking) { filters.push('has_parking = 1') }
    if (body.has_truck_parking) { filters.push('has_truck_parking = 1') }
    if (body.is_family_friendly) { filters.push('is_family_friendly = 1') }

    if (filters.length > 0) {
      cacheQuery += ' AND ' + filters.join(' AND ')
    }

    cacheQuery += ` ORDER BY rating DESC LIMIT ? OFFSET ?`
    cacheBindings.push(limit, offset)

    const { results: cachedHotels } = await c.env.DB.prepare(cacheQuery)
      .bind(...cacheBindings)
      .all<any>()

    // If we have enough cached results, return them
    if (cachedHotels.length >= Math.min(limit, 5)) {
      return c.json({
        hotels: cachedHotels.map(h => ({
          ...h,
          amenities: tryParseJSON(h.amenities, [])
        })),
        total: cachedHotels.length,
        location: body.location,
        check_in: body.check_in,
        check_out: body.check_out,
        source: 'cache',
        affiliate_marker: TRAVELPAYOUTS_MARKER
      })
    }

    // 2. Fetch fresh from Travelpayouts API
    const rawHotels = await searchHotels({
      location: body.location,
      checkIn: body.check_in,
      checkOut: body.check_out,
      adults: body.guests || 2,
      rooms: body.rooms || 1,
      currency: body.currency || 'USD',
      language: body.language || 'en',
      limit: 50, // fetch more for caching
      token: c.env.TRAVELPAYOUTS_API_KEY
    })

    // 3. Cache results in D1
    const normalized = rawHotels.map(h => normalizeHotel(h, c.env.TRAVELPAYOUTS_API_KEY))
    
    for (const hotel of normalized) {
      const id = generateId()
      await c.env.DB.prepare(`
        INSERT OR REPLACE INTO hotel_cache (
          id, travelpayouts_id, name, location, city, country, stars, rating, review_count,
          price, currency, image_url, amenities, latitude, longitude, affiliate_link,
          has_parking, has_truck_parking, highway_access, is_family_friendly, is_pet_friendly,
          has_breakfast, raw_data, expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        id, hotel.travelpayouts_id, hotel.name, hotel.location, hotel.city, hotel.country,
        hotel.stars, hotel.rating, hotel.review_count, hotel.price, hotel.currency,
        hotel.image_url, hotel.amenities, hotel.latitude, hotel.longitude, hotel.affiliate_link,
        hotel.has_parking, hotel.has_truck_parking, hotel.highway_access, hotel.is_family_friendly,
        hotel.is_pet_friendly, hotel.has_breakfast, hotel.raw_data, hotel.expires_at
      ).run().catch(() => {}) // Ignore duplicate key errors
    }

    // If Travelpayouts returned nothing, return whatever is in cache
    if (normalized.length === 0) {
      return c.json({
        hotels: cachedHotels.map(h => ({ ...h, amenities: tryParseJSON(h.amenities, []) })),
        total: cachedHotels.length,
        location: body.location,
        source: 'cache_fallback',
        affiliate_marker: TRAVELPAYOUTS_MARKER
      })
    }

    // 4. Apply filters & return
    let filtered = normalized.filter(h => {
      if (body.stars && (h.stars || 0) < body.stars) return false
      if (body.max_price && (h.price || 0) > body.max_price) return false
      if (body.has_parking && !h.has_parking) return false
      if (body.has_truck_parking && !h.has_truck_parking) return false
      if (body.is_family_friendly && !h.is_family_friendly) return false
      return true
    })

    filtered = filtered
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(offset, offset + limit)

    return c.json({
      hotels: filtered.map(h => ({ ...h, amenities: tryParseJSON(h.amenities, []) })),
      total: filtered.length,
      location: body.location,
      check_in: body.check_in,
      check_out: body.check_out,
      source: 'api',
      affiliate_marker: TRAVELPAYOUTS_MARKER
    })
  } catch (err: any) {
    console.error('Search error:', err)
    return c.json({ error: 'Search failed', message: err.message }, 500)
  }
})

// GET /api/search/hotel/:id - single hotel details
search.get('/hotel/:id', optionalAuth, async (c) => {
  const hotelId = c.req.param('id')

  try {
    // Check cache first
    let hotel = await c.env.DB.prepare(
      'SELECT * FROM hotel_cache WHERE id = ? OR travelpayouts_id = ?'
    ).bind(hotelId, hotelId).first<any>()

    if (!hotel) {
      // Try fetching from API
      const raw = await getHotelById(hotelId, c.env.TRAVELPAYOUTS_API_KEY)
      if (!raw) {
        return c.json({ error: 'Hotel not found' }, 404)
      }
      const normalized = normalizeHotel(raw, c.env.TRAVELPAYOUTS_API_KEY)
      const id = generateId()
      await c.env.DB.prepare(`
        INSERT OR REPLACE INTO hotel_cache (id, travelpayouts_id, name, location, city, country,
        stars, rating, price, currency, image_url, affiliate_link, latitude, longitude, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(id, normalized.travelpayouts_id, normalized.name, normalized.location, 
              normalized.city, normalized.country, normalized.stars, normalized.rating,
              normalized.price, normalized.currency, normalized.image_url,
              normalized.affiliate_link, normalized.latitude, normalized.longitude,
              normalized.expires_at).run().catch(() => {})
      hotel = { id, ...normalized }
    }

    return c.json({
      hotel: {
        ...hotel,
        amenities: tryParseJSON(hotel.amenities, [])
      }
    })
  } catch (err: any) {
    return c.json({ error: 'Failed to get hotel', message: err.message }, 500)
  }
})

// GET /api/search/locations?q= - location autocomplete
search.get('/locations', async (c) => {
  const q = c.req.query('q') || ''
  if (q.length < 2) return c.json({ locations: [] })

  const { results } = await c.env.DB.prepare(`
    SELECT DISTINCT city, country, location
    FROM hotel_cache
    WHERE LOWER(city) LIKE ? OR LOWER(location) LIKE ?
    LIMIT 10
  `).bind(`%${q.toLowerCase()}%`, `%${q.toLowerCase()}%`).all<any>()

  const locations = results.map(r => ({
    city: r.city,
    country: r.country,
    display: r.city ? `${r.city}, ${r.country}` : r.location
  }))

  return c.json({ locations })
})

function tryParseJSON(str: string | null | undefined, fallback: any = null): any {
  if (!str) return fallback
  try { return JSON.parse(str) } catch { return fallback }
}

export default search
