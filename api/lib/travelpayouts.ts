// ============================================================
// Travelpayouts / Hotellook API Integration
// Affiliate ID: 314682 | Token: 140003fe70f6a86ab4b3d538bafb7c42
// ============================================================

export const TRAVELPAYOUTS_MARKER = '314682'
export const TRAVELPAYOUTS_BASE = 'https://engine.hotellook.com/api/v2'

export interface TravelpayoutsSearchParams {
  location: string
  checkIn?: string
  checkOut?: string
  adults?: number
  children?: number
  rooms?: number
  currency?: string
  language?: string
  limit?: number
  token: string
}

export interface TravelpayoutsHotel {
  id: number | string
  hotelId: number | string
  name: string
  location: {
    name: string
    geo?: {
      lat: number
      lon: number
    }
    country?: { name: string }
    cityName?: string
  }
  stars: number
  rating: number
  reviews: number
  minPrice?: number
  price?: number
  currency?: string
  photoUrl?: string
  photos?: string[]
  amenities?: string[]
  link?: string
  distance?: number
}

export async function searchHotels(params: TravelpayoutsSearchParams): Promise<TravelpayoutsHotel[]> {
  const url = new URL(`${TRAVELPAYOUTS_BASE}/cache.json`)
  url.searchParams.set('location', params.location)
  url.searchParams.set('token', params.token)
  url.searchParams.set('currency', params.currency || 'USD')
  url.searchParams.set('language', params.language || 'en')
  url.searchParams.set('limit', String(params.limit || 25))
  
  if (params.checkIn) url.searchParams.set('checkIn', params.checkIn)
  if (params.checkOut) url.searchParams.set('checkOut', params.checkOut)
  if (params.adults) url.searchParams.set('adults', String(params.adults))
  if (params.rooms) url.searchParams.set('rooms', String(params.rooms))

  try {
    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'TravelPayoutHotelFinder/1.0'
      },
      signal: AbortSignal.timeout(10000)
    })

    if (!response.ok) {
      console.error(`Travelpayouts API error: ${response.status} ${response.statusText}`)
      return []
    }

    const data = await response.json() as any
    
    // Handle both array and object responses
    if (Array.isArray(data)) return data
    if (data.result && Array.isArray(data.result)) return data.result
    if (data.hotels && Array.isArray(data.hotels)) return data.hotels
    
    return []
  } catch (err) {
    console.error('Travelpayouts fetch error:', err)
    return []
  }
}

export async function getHotelById(hotelId: string, token: string): Promise<TravelpayoutsHotel | null> {
  const url = new URL(`${TRAVELPAYOUTS_BASE}/hotels/${hotelId}.json`)
  url.searchParams.set('token', token)

  try {
    const response = await fetch(url.toString(), {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(8000)
    })

    if (!response.ok) return null

    const data = await response.json() as any
    return data.hotel || data || null
  } catch {
    return null
  }
}

export function buildAffiliateLink(hotelId: string | number, marker: string): string {
  return `https://www.travelpayouts.com/hotels/${hotelId}?marker=${marker}`
}

export function normalizeHotel(raw: TravelpayoutsHotel, token: string): Record<string, any> {
  const hotelId = raw.hotelId || raw.id
  return {
    travelpayouts_id: String(hotelId),
    name: raw.name || 'Unknown Hotel',
    location: raw.location?.name || 'Unknown',
    city: raw.location?.cityName || raw.location?.name || '',
    country: raw.location?.country?.name || '',
    stars: raw.stars || 0,
    rating: raw.rating || 0,
    review_count: raw.reviews || 0,
    price: raw.minPrice || raw.price || null,
    currency: raw.currency || 'USD',
    image_url: raw.photoUrl || (raw.photos && raw.photos[0]) || null,
    amenities: JSON.stringify(raw.amenities || []),
    latitude: raw.location?.geo?.lat || null,
    longitude: raw.location?.geo?.lon || null,
    affiliate_link: buildAffiliateLink(hotelId, TRAVELPAYOUTS_MARKER),
    raw_data: JSON.stringify(raw),
    // Driver-friendly detection (basic heuristic from amenities/name)
    has_parking: (raw.amenities?.some(a => a.toLowerCase().includes('parking')) ? 1 : 0),
    has_truck_parking: (raw.amenities?.some(a => a.toLowerCase().includes('truck')) ? 1 : 0) || 
                       (raw.name?.toLowerCase().includes('truck') ? 1 : 0),
    highway_access: (raw.name?.toLowerCase().includes('highway') || raw.name?.toLowerCase().includes('exit') ? 1 : 0),
    is_family_friendly: (raw.amenities?.some(a => a.toLowerCase().includes('pool') || a.toLowerCase().includes('kids')) ? 1 : 0),
    is_pet_friendly: (raw.amenities?.some(a => a.toLowerCase().includes('pet')) ? 1 : 0),
    has_breakfast: (raw.amenities?.some(a => a.toLowerCase().includes('breakfast')) ? 1 : 0),
    expires_at: new Date(Date.now() + 3600000).toISOString() // 1 hour cache
  }
}
