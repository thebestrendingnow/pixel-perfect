// ============================================================
// Travel Payout Hotel Finder - Type Definitions
// ============================================================

export type SubscriptionTier = 'free' | 'traveler' | 'business' | 'agency'

export interface User {
  id: string
  email: string
  name?: string
  subscription_tier: SubscriptionTier
  stripe_customer_id?: string
  whop_user_id?: string
  preferred_language: string
  preferred_currency: string
  search_count_today: number
  search_count_reset_at: string
  created_at: string
}

export interface HotelCache {
  id: string
  travelpayouts_id: string
  name: string
  location: string
  city?: string
  country?: string
  stars?: number
  rating?: number
  review_count?: number
  price?: number
  currency: string
  image_url?: string
  amenities?: string // JSON
  latitude?: number
  longitude?: number
  affiliate_link?: string
  has_parking: number
  has_truck_parking: number
  highway_access: number
  is_family_friendly: number
  is_pet_friendly: number
  has_breakfast: number
  raw_data?: string
  cached_at: string
  expires_at: string
}

export interface HotelSearchParams {
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
}

export interface SearchResult {
  hotels: HotelCache[]
  total: number
  location: string
  check_in?: string
  check_out?: string
  affiliate_marker: string
}

export interface ChatMessage {
  id: string
  thread_id: string
  user_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  hotel_ids?: string
  intent?: string
  language: string
  created_at: string
}

export interface PriceAlert {
  id: string
  user_id: string
  hotel_id: string
  hotel_name?: string
  target_price: number
  current_price?: number
  currency: string
  check_in?: string
  check_out?: string
  status: 'active' | 'triggered' | 'expired' | 'paused'
  created_at: string
}

export interface Booking {
  id: string
  user_id: string
  hotel_id: string
  hotel_name: string
  check_in: string
  check_out: string
  guests: number
  rooms: number
  total_price?: number
  currency: string
  commission_earned: number
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  created_at: string
}

// Tier limits
export const TIER_LIMITS: Record<SubscriptionTier, {
  daily_searches: number
  price_alerts: number
  has_ai_chat: boolean
  has_voice: boolean
  has_expense_export: boolean
  has_api_access: boolean
  has_white_label: boolean
  has_commission_dashboard: boolean
}> = {
  free: {
    daily_searches: 5,
    price_alerts: 0,
    has_ai_chat: false,
    has_voice: false,
    has_expense_export: false,
    has_api_access: false,
    has_white_label: false,
    has_commission_dashboard: false
  },
  traveler: {
    daily_searches: Infinity,
    price_alerts: 3,
    has_ai_chat: true,
    has_voice: true,
    has_expense_export: false,
    has_api_access: false,
    has_white_label: false,
    has_commission_dashboard: false
  },
  business: {
    daily_searches: Infinity,
    price_alerts: 10,
    has_ai_chat: true,
    has_voice: true,
    has_expense_export: true,
    has_api_access: false,
    has_white_label: false,
    has_commission_dashboard: true
  },
  agency: {
    daily_searches: Infinity,
    price_alerts: Infinity,
    has_ai_chat: true,
    has_voice: true,
    has_expense_export: true,
    has_api_access: true,
    has_white_label: true,
    has_commission_dashboard: true
  }
}

export type CloudflareBindings = {
  DB: D1Database
  BUCKET: R2Bucket
  // Secrets (set via wrangler secret put)
  TRAVELPAYOUTS_API_KEY: string
  TRAVELPAYOUTS_MARKER: string
  LAOZHANG_API_KEY: string
  ELEVENLABS_API_KEY: string
  STRIPE_SECRET_KEY: string
  STRIPE_WEBHOOK_SECRET: string
  WHOP_API_KEY: string
  WHOP_WEBHOOK_SECRET: string
  JWT_SECRET: string
  RESEND_API_KEY: string
  GOOGLE_PLACES_API_KEY: string
  AMADEUS_CLIENT_ID: string
  AMADEUS_CLIENT_SECRET: string
  PRIVATE_GATEWAY_TOKEN?: string
  // White-label env vars (all optional — have defaults)
  SITE_NAME: string
  SITE_TAGLINE: string
  SITE_URL: string
  LOGO_URL: string
  FAVICON_URL: string
  COLOR_PRIMARY: string
  COLOR_SECONDARY: string
  COLOR_ACCENT: string
  COLOR_BG_DARK: string
  SUPPORT_EMAIL: string
  PRIVACY_URL: string
  TERMS_URL: string
  TWITTER_URL: string
  INSTAGRAM_URL: string
  SHOW_DRIVER_MODE: string
  SHOW_VOICE_CHAT: string
  SHOW_PRICE_COMPARISON: string
  SHOW_MAP: string
}
