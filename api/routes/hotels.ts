// ============================================================
// Hotels Routes: /api/hotels/trending, /api/hotels/driver-mode
// Extra endpoints Lovable's frontend needs beyond basic search
// ============================================================
import { Hono } from 'hono'
import { CloudflareBindings } from '../lib/types'
import { requireAuth, optionalAuth } from '../middleware/auth'
import { TRAVELPAYOUTS_MARKER } from '../lib/travelpayouts'

type Variables = { user: any }

const hotels = new Hono<{ Bindings: CloudflareBindings; Variables: Variables }>()

// GET /api/hotels/trending — top rated hotels for homepage hero
// Lovable's Index.tsx can show these before any search
hotels.get('/trending', optionalAuth, async (c) => {
  const limit = parseInt(c.req.query('limit') || '8')
  const currency = c.req.query('currency') || 'USD'

  const { results } = await c.env.DB.prepare(`
    SELECT id, travelpayouts_id, name, location, city, country,
           stars, rating, review_count, price, currency,
           image_url, affiliate_link, latitude, longitude,
           has_parking, has_truck_parking, is_family_friendly,
           amenities, expires_at
    FROM hotel_cache
    WHERE rating >= 7.0
      AND price IS NOT NULL
      AND image_url IS NOT NULL
    ORDER BY (rating * 0.6 + COALESCE(review_count, 0) * 0.001) DESC
    LIMIT ?
  `).bind(limit).all<any>()

  return c.json({
    hotels: results.map(h => ({
      ...h,
      amenities: tryParseJSON(h.amenities, []),
      is_trending: true
    })),
    count: results.length
  })
})

// GET /api/hotels/driver-mode — hotels optimized for delivery/truck drivers
// Filters: has_parking, highway access, budget under $90, late check-in
hotels.get('/driver-mode', optionalAuth, async (c) => {
  const limit = parseInt(c.req.query('limit') || '20')
  const max_price = parseFloat(c.req.query('max_price') || '90')
  const city = c.req.query('city') || ''

  let query = `
    SELECT id, travelpayouts_id, name, location, city, country,
           stars, rating, review_count, price, currency,
           image_url, affiliate_link, latitude, longitude,
           has_parking, has_truck_parking, highway_access, amenities
    FROM hotel_cache
    WHERE has_parking = 1
      AND price <= ?
      AND price IS NOT NULL
  `
  const bindings: any[] = [max_price]

  if (city) {
    query += ` AND (LOWER(city) LIKE ? OR LOWER(location) LIKE ?)`
    bindings.push(`%${city.toLowerCase()}%`, `%${city.toLowerCase()}%`)
  }

  query += ` ORDER BY 
    (has_truck_parking * 2 + highway_access + has_parking) DESC,
    price ASC
    LIMIT ?`
  bindings.push(limit)

  const { results } = await c.env.DB.prepare(query).bind(...bindings).all<any>()

  return c.json({
    hotels: results.map(h => ({
      ...h,
      amenities: tryParseJSON(h.amenities, []),
      driver_score: (h.has_truck_parking ? 3 : 0) + (h.highway_access ? 2 : 0) + (h.has_parking ? 1 : 0)
    })),
    count: results.length,
    filters: { has_parking: true, max_price, city: city || 'any' }
  })
})

// GET /api/hotels/nearby?lat=&lon=&radius_km= — geo-based search
// Lovable's MapView.tsx and Leaflet markers can use this
hotels.get('/nearby', optionalAuth, async (c) => {
  const lat = parseFloat(c.req.query('lat') || '0')
  const lon = parseFloat(c.req.query('lon') || '0')
  const radius = parseFloat(c.req.query('radius_km') || '50')
  const limit = parseInt(c.req.query('limit') || '20')

  if (!lat || !lon) {
    return c.json({ error: 'lat and lon are required' }, 400)
  }

  // Simple bounding box (fast, no external dep)
  const latDelta = radius / 111.0
  const lonDelta = radius / (111.0 * Math.cos(lat * Math.PI / 180))

  const { results } = await c.env.DB.prepare(`
    SELECT id, travelpayouts_id, name, location, city, country,
           stars, rating, price, currency, image_url, affiliate_link,
           latitude, longitude, has_parking, has_truck_parking,
           -- Haversine-approximated distance (km)
           (6371 * 2 * asin(sqrt(
             pow(sin((latitude - ?) * 3.14159/360), 2) +
             cos(latitude * 3.14159/180) * cos(? * 3.14159/180) *
             pow(sin((longitude - ?) * 3.14159/360), 2)
           ))) as distance_km
    FROM hotel_cache
    WHERE latitude BETWEEN ? AND ?
      AND longitude BETWEEN ? AND ?
      AND latitude IS NOT NULL
      AND longitude IS NOT NULL
    ORDER BY distance_km ASC
    LIMIT ?
  `).bind(
    lat, lat, lon,
    lat - latDelta, lat + latDelta,
    lon - lonDelta, lon + lonDelta,
    limit
  ).all<any>()

  return c.json({
    hotels: results.map(h => ({ ...h, distance_km: Math.round(h.distance_km * 10) / 10 })),
    count: results.length,
    center: { lat, lon },
    radius_km: radius
  })
})

// GET /api/hotels/map-markers?bounds= — lightweight for Leaflet map
// Returns only lat/lon/name/price for fast map rendering
hotels.get('/map-markers', optionalAuth, async (c) => {
  const bounds = c.req.query('bounds') // "sw_lat,sw_lon,ne_lat,ne_lon"
  
  let query = `
    SELECT id, travelpayouts_id, name, city, price, currency,
           latitude, longitude, stars, rating, has_parking, image_url, affiliate_link
    FROM hotel_cache
    WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND price IS NOT NULL
  `
  const bindings: any[] = []

  if (bounds) {
    const [swLat, swLon, neLat, neLon] = bounds.split(',').map(parseFloat)
    if (swLat && swLon && neLat && neLon) {
      query += ` AND latitude BETWEEN ? AND ? AND longitude BETWEEN ? AND ?`
      bindings.push(swLat, neLat, swLon, neLon)
    }
  }

  query += ` ORDER BY rating DESC LIMIT 200`

  const { results } = await c.env.DB.prepare(query).bind(...bindings).all<any>()

  // Return minimal payload for map performance
  return c.json({
    markers: results.map(h => ({
      id: h.id,
      tp_id: h.travelpayouts_id,
      name: h.name,
      city: h.city,
      lat: h.latitude,
      lon: h.longitude,
      price: h.price,
      currency: h.currency,
      stars: h.stars,
      rating: h.rating,
      has_parking: !!h.has_parking,
      image: h.image_url,
      book_url: h.affiliate_link
    })),
    count: results.length
  })
})

function tryParseJSON(str: string | null | undefined, fallback: any = null): any {
  if (!str) return fallback
  try { return JSON.parse(str) } catch { return fallback }
}

export default hotels
