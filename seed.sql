-- ============================================================
-- Travel Payout Hotel Finder - Seed Data (Dev/Testing Only)
-- ============================================================

-- Insert test users (password: "password123" bcrypt hash placeholder)
INSERT OR IGNORE INTO users (id, email, password_hash, name, subscription_tier) VALUES
  ('user-001', 'free@test.com', '$2b$10$placeholder_hash_free', 'Free User', 'free'),
  ('user-002', 'traveler@test.com', '$2b$10$placeholder_hash_traveler', 'Travel Pro', 'traveler'),
  ('user-003', 'business@test.com', '$2b$10$placeholder_hash_business', 'Business Bob', 'business'),
  ('user-004', 'agency@test.com', '$2b$10$placeholder_hash_agency', 'Agency Alice', 'agency'),
  ('user-005', 'driver@test.com', '$2b$10$placeholder_hash_driver', 'Driver Dan', 'traveler');

-- Insert test hotel cache entries
INSERT OR IGNORE INTO hotel_cache (id, travelpayouts_id, name, location, city, country, stars, rating, price, currency, affiliate_link, latitude, longitude, has_parking, has_truck_parking, highway_access) VALUES
  ('hotel-001', 'tp-123456', 'Grand City Hotel', 'New York, NY', 'New York', 'US', 4, 8.5, 179.99, 'USD', 'https://www.travelpayouts.com/hotels/tp-123456?marker=314682', 40.7128, -74.0060, 1, 0, 0),
  ('hotel-002', 'tp-234567', 'Budget Inn Express', 'Chicago, IL', 'Chicago', 'US', 2, 7.2, 59.99, 'USD', 'https://www.travelpayouts.com/hotels/tp-234567?marker=314682', 41.8781, -87.6298, 1, 1, 1),
  ('hotel-003', 'tp-345678', 'Romantic Boutique Suites', 'Miami, FL', 'Miami', 'US', 4, 9.1, 229.99, 'USD', 'https://www.travelpayouts.com/hotels/tp-345678?marker=314682', 25.7617, -80.1918, 0, 0, 0),
  ('hotel-004', 'tp-456789', 'Family Fun Resort', 'Orlando, FL', 'Orlando', 'US', 3, 8.0, 149.99, 'USD', 'https://www.travelpayouts.com/hotels/tp-456789?marker=314682', 28.5383, -81.3792, 1, 0, 0),
  ('hotel-005', 'tp-567890', 'Highway Rest & Truck Stop Hotel', 'Dallas, TX', 'Dallas', 'US', 2, 6.8, 54.99, 'USD', 'https://www.travelpayouts.com/hotels/tp-567890?marker=314682', 32.7767, -96.7970, 1, 1, 1);

-- Insert test favorites
INSERT OR IGNORE INTO favorites (user_id, hotel_id) VALUES
  ('user-002', 'hotel-001'),
  ('user-002', 'hotel-003'),
  ('user-005', 'hotel-002'),
  ('user-005', 'hotel-005');

-- Insert test price alerts
INSERT OR IGNORE INTO price_alerts (id, user_id, hotel_id, hotel_name, target_price, current_price, currency, status) VALUES
  ('alert-001', 'user-002', 'hotel-001', 'Grand City Hotel', 150.00, 179.99, 'USD', 'active'),
  ('alert-002', 'user-002', 'hotel-003', 'Romantic Boutique Suites', 200.00, 229.99, 'USD', 'active'),
  ('alert-003', 'user-005', 'hotel-005', 'Highway Rest & Truck Stop Hotel', 50.00, 54.99, 'USD', 'active');

-- Insert test chat thread
INSERT OR IGNORE INTO chat_threads (id, user_id, title) VALUES
  ('thread-001', 'user-002', 'Hotels in NYC'),
  ('thread-002', 'user-005', 'Truck parking near Dallas');
