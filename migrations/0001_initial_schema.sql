-- ============================================================
-- Travel Payout Hotel Finder App - Initial Schema
-- Migration: 0001_initial_schema.sql
-- ============================================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  subscription_tier TEXT NOT NULL DEFAULT 'free' CHECK(subscription_tier IN ('free', 'traveler', 'business', 'agency')),
  stripe_customer_id TEXT,
  whop_user_id TEXT,
  preferred_language TEXT DEFAULT 'en',
  preferred_currency TEXT DEFAULT 'USD',
  search_count_today INTEGER DEFAULT 0,
  search_count_reset_at TEXT DEFAULT (datetime('now')),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Hotel cache table (caches Travelpayouts API results, 1-24h TTL)
CREATE TABLE IF NOT EXISTS hotel_cache (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  travelpayouts_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  city TEXT,
  country TEXT,
  stars INTEGER,
  rating REAL,
  review_count INTEGER DEFAULT 0,
  price REAL,
  currency TEXT DEFAULT 'USD',
  image_url TEXT,
  amenities TEXT, -- JSON array
  latitude REAL,
  longitude REAL,
  affiliate_link TEXT,
  has_parking INTEGER DEFAULT 0,
  has_truck_parking INTEGER DEFAULT 0,
  highway_access INTEGER DEFAULT 0,
  is_family_friendly INTEGER DEFAULT 0,
  is_pet_friendly INTEGER DEFAULT 0,
  has_breakfast INTEGER DEFAULT 0,
  raw_data TEXT, -- Full JSON from API
  cached_at TEXT DEFAULT (datetime('now')),
  expires_at TEXT DEFAULT (datetime('now', '+1 hour'))
);

-- Favorites table
CREATE TABLE IF NOT EXISTS favorites (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hotel_id TEXT NOT NULL REFERENCES hotel_cache(id) ON DELETE CASCADE,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, hotel_id)
);

-- Price alerts table
CREATE TABLE IF NOT EXISTS price_alerts (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hotel_id TEXT NOT NULL,
  hotel_name TEXT,
  target_price REAL NOT NULL,
  current_price REAL,
  currency TEXT DEFAULT 'USD',
  check_in TEXT,
  check_out TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'triggered', 'expired', 'paused')),
  notified_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hotel_id TEXT NOT NULL,
  hotel_name TEXT NOT NULL,
  check_in TEXT NOT NULL,
  check_out TEXT NOT NULL,
  guests INTEGER DEFAULT 1,
  rooms INTEGER DEFAULT 1,
  total_price REAL,
  currency TEXT DEFAULT 'USD',
  commission_earned REAL DEFAULT 0,
  affiliate_link TEXT,
  booking_ref TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Chat threads table
CREATE TABLE IF NOT EXISTS chat_threads (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Chat messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  thread_id TEXT NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  hotel_ids TEXT, -- JSON array of hotel IDs returned in response
  intent TEXT, -- extracted intent: search, info, compare, recommend
  language TEXT DEFAULT 'en',
  created_at TEXT DEFAULT (datetime('now'))
);

-- Voice messages table
CREATE TABLE IF NOT EXISTS voice_messages (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  thread_id TEXT REFERENCES chat_threads(id) ON DELETE SET NULL,
  transcript TEXT NOT NULL,
  response_text TEXT,
  response_audio_url TEXT,
  duration_seconds REAL,
  language TEXT DEFAULT 'en',
  created_at TEXT DEFAULT (datetime('now'))
);

-- Whop subscriptions table
CREATE TABLE IF NOT EXISTS whop_subscriptions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  whop_user_id TEXT UNIQUE NOT NULL,
  tier TEXT NOT NULL DEFAULT 'free' CHECK(tier IN ('free', 'traveler', 'business', 'agency')),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'cancelled', 'expired', 'trialing')),
  whop_plan_id TEXT,
  current_period_start TEXT,
  current_period_end TEXT,
  expires_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Expense reports table (Business/Agency tier)
CREATE TABLE IF NOT EXISTS expense_reports (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  booking_id TEXT REFERENCES bookings(id) ON DELETE SET NULL,
  hotel_name TEXT NOT NULL,
  check_in TEXT NOT NULL,
  check_out TEXT NOT NULL,
  total_amount REAL NOT NULL,
  currency TEXT DEFAULT 'USD',
  purpose TEXT,
  exported_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- ============================================================
-- INDEXES for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_whop ON users(whop_user_id);
CREATE INDEX IF NOT EXISTS idx_users_stripe ON users(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_hotel_cache_tpid ON hotel_cache(travelpayouts_id);
CREATE INDEX IF NOT EXISTS idx_hotel_cache_city ON hotel_cache(city);
CREATE INDEX IF NOT EXISTS idx_hotel_cache_expires ON hotel_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_price_alerts_user ON price_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_price_alerts_status ON price_alerts(status);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_threads_user ON chat_threads(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_thread ON chat_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_voice_messages_user ON voice_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_whop_subs_user ON whop_subscriptions(whop_user_id);
