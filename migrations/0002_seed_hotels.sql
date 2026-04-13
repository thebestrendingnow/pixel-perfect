-- ============================================================
-- Seed: Real European hotels (Netherlands + major EU cities)
-- Ensures the app shows results immediately without API calls
-- ============================================================

INSERT OR IGNORE INTO hotel_cache (
  id, travelpayouts_id, name, location, city, country,
  stars, rating, review_count, price, currency,
  image_url, amenities, latitude, longitude, affiliate_link,
  has_parking, has_truck_parking, highway_access, is_family_friendly, is_pet_friendly,
  has_breakfast, expires_at
) VALUES

-- ── NETHERLANDS ─────────────────────────────────────────────────────────────

('nl-1', 'nl001', 'Mövenpick Hotel Amsterdam City Centre',
 'Piet Heinkade 11, Amsterdam', 'Amsterdam', 'Netherlands',
 4, 8.6, 3412, 119, 'EUR',
 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
 '["Free WiFi","Parking","Restaurant","Bar","Gym","Late Check-in"]',
 52.3783, 4.9141, 'https://www.travelpayouts.com/hotels/nl001?marker=314682',
 1, 0, 0, 0, 0, 0,
 datetime('now', '+30 days')),

('nl-2', 'nl002', 'ibis Amsterdam Centre',
 'Stationsplein 49, Amsterdam', 'Amsterdam', 'Netherlands',
 3, 7.8, 2187, 79, 'EUR',
 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800',
 '["Free WiFi","Parking","Late Check-in","24h Front Desk","Restaurant"]',
 52.3791, 4.8998, 'https://www.travelpayouts.com/hotels/nl002?marker=314682',
 1, 0, 1, 1, 1, 0,
 datetime('now', '+30 days')),

('nl-3', 'nl003', 'Holiday Inn Rotterdam',
 'Schouwburgplein 1, Rotterdam', 'Rotterdam', 'Netherlands',
 4, 8.3, 1654, 95, 'EUR',
 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800',
 '["Free WiFi","Free Parking","Pool","Gym","Restaurant","Business Center"]',
 51.9225, 4.4792, 'https://www.travelpayouts.com/hotels/nl003?marker=314682',
 1, 0, 1, 1, 0, 1,
 datetime('now', '+30 days')),

('nl-4', 'nl004', 'Van der Valk Hotel Den Haag',
 'Wassenaarseweg 10, Den Haag', 'The Hague', 'Netherlands',
 4, 8.1, 987, 89, 'EUR',
 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800',
 '["Free WiFi","Free Parking","Pet Friendly","Restaurant","Bar","Late Check-in"]',
 52.0705, 4.3007, 'https://www.travelpayouts.com/hotels/nl004?marker=314682',
 1, 1, 1, 1, 1, 0,
 datetime('now', '+30 days')),

('nl-5', 'nl005', 'ibis Utrecht City Centre',
 'Smakkelaarsveld 8, Utrecht', 'Utrecht', 'Netherlands',
 3, 7.9, 1432, 72, 'EUR',
 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800',
 '["Free WiFi","Parking","Restaurant","Late Check-in","Laundry"]',
 52.0907, 5.1214, 'https://www.travelpayouts.com/hotels/nl005?marker=314682',
 1, 0, 1, 1, 1, 0,
 datetime('now', '+30 days')),

('nl-6', 'nl006', 'Hampshire Hotel Eindhoven',
 'Aalsterweg 322, Eindhoven', 'Eindhoven', 'Netherlands',
 3, 8.0, 765, 68, 'EUR',
 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
 '["Free WiFi","Free Parking","Restaurant","Bar","Late Check-in"]',
 51.4416, 5.4697, 'https://www.travelpayouts.com/hotels/nl006?marker=314682',
 1, 0, 1, 0, 0, 0,
 datetime('now', '+30 days')),

('nl-7', 'nl007', 'Van der Valk Hotel Groningen',
 'Hoornsemeer 1, Groningen', 'Groningen', 'Netherlands',
 4, 8.4, 543, 85, 'EUR',
 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800',
 '["Free WiFi","Free Parking","Restaurant","Bar","Pool","Late Check-in"]',
 53.2194, 6.5665, 'https://www.travelpayouts.com/hotels/nl007?marker=314682',
 1, 1, 1, 1, 1, 1,
 datetime('now', '+30 days')),

('nl-8', 'nl008', 'Novotel Maastricht',
 'Forum 110, Maastricht', 'Maastricht', 'Netherlands',
 4, 8.2, 892, 99, 'EUR',
 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800',
 '["Free WiFi","Underground Parking","Pool","Gym","Restaurant","Business Center"]',
 50.8514, 5.6909, 'https://www.travelpayouts.com/hotels/nl008?marker=314682',
 1, 0, 1, 1, 0, 1,
 datetime('now', '+30 days')),

('nl-9', 'nl009', 'ibis Styles Breda Centre',
 'Nieuwe Ginnekenstraat 4, Breda', 'Breda', 'Netherlands',
 3, 7.7, 621, 65, 'EUR',
 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=800',
 '["Free WiFi","Parking","Restaurant","Late Check-in","24h Front Desk"]',
 51.5880, 4.7757, 'https://www.travelpayouts.com/hotels/nl009?marker=314682',
 1, 0, 1, 1, 0, 0,
 datetime('now', '+30 days')),

('nl-10', 'nl010', 'Van der Valk Hotel Nijmegen',
 'Waalbandijk 81, Nijmegen', 'Nijmegen', 'Netherlands',
 4, 8.3, 712, 92, 'EUR',
 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800',
 '["Free WiFi","Free Parking","Restaurant","Bar","Pool","Late Check-in","Pet Friendly"]',
 51.8413, 5.8397, 'https://www.travelpayouts.com/hotels/nl010?marker=314682',
 1, 1, 1, 1, 1, 1,
 datetime('now', '+30 days')),

('nl-11', 'nl011', 'NH Hotel Zandvoort aan Zee',
 'Burgemeester van Alphenstraat 63, Zandvoort', 'Zandvoort', 'Netherlands',
 4, 8.0, 489, 110, 'EUR',
 'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=800',
 '["Free WiFi","Parking","Beach Access","Restaurant","Bar","Pool"]',
 52.3708, 4.5323, 'https://www.travelpayouts.com/hotels/nl011?marker=314682',
 1, 0, 0, 1, 1, 1,
 datetime('now', '+30 days')),

('nl-12', 'nl012', 'Budget Hotel Stop Tilburg',
 'Korvelseweg 135, Tilburg', 'Tilburg', 'Netherlands',
 2, 7.5, 334, 52, 'EUR',
 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800',
 '["Free WiFi","Free Parking","Late Check-in","24h Front Desk"]',
 51.5555, 5.0913, 'https://www.travelpayouts.com/hotels/nl012?marker=314682',
 1, 1, 1, 0, 1, 0,
 datetime('now', '+30 days')),

-- ── GERMANY ─────────────────────────────────────────────────────────────────

('de-1', 'de001', 'ibis München City',
 'Dachauer Str. 21, München', 'Munich', 'Germany',
 3, 7.9, 2341, 89, 'EUR',
 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800',
 '["Free WiFi","Parking","Restaurant","Late Check-in"]',
 48.1351, 11.5820, 'https://www.travelpayouts.com/hotels/de001?marker=314682',
 1, 0, 1, 1, 0, 0,
 datetime('now', '+30 days')),

('de-2', 'de002', 'Holiday Inn Berlin City East',
 'Petersburger Str. 88, Berlin', 'Berlin', 'Germany',
 4, 8.1, 1876, 109, 'EUR',
 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
 '["Free WiFi","Parking","Gym","Restaurant","Bar","Late Check-in"]',
 52.5200, 13.4050, 'https://www.travelpayouts.com/hotels/de002?marker=314682',
 1, 0, 1, 1, 0, 1,
 datetime('now', '+30 days')),

-- ── BELGIUM ─────────────────────────────────────────────────────────────────

('be-1', 'be001', 'ibis Brussels Centre Gare du Midi',
 'Rue de France 2, Brussels', 'Brussels', 'Belgium',
 3, 7.6, 1543, 85, 'EUR',
 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800',
 '["Free WiFi","Parking","Restaurant","Late Check-in"]',
 50.8503, 4.3517, 'https://www.travelpayouts.com/hotels/be001?marker=314682',
 1, 0, 1, 1, 0, 0,
 datetime('now', '+30 days')),

-- ── FRANCE ──────────────────────────────────────────────────────────────────

('fr-1', 'fr001', 'ibis Paris Tour Eiffel',
 'Quai de Grenelle, Paris', 'Paris', 'France',
 3, 8.0, 2987, 125, 'EUR',
 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800',
 '["Free WiFi","Restaurant","Bar","Late Check-in"]',
 48.8566, 2.3522, 'https://www.travelpayouts.com/hotels/fr001?marker=314682',
 0, 0, 1, 1, 0, 0,
 datetime('now', '+30 days')),

-- ── UNITED KINGDOM ──────────────────────────────────────────────────────────

('gb-1', 'gb001', 'Premier Inn London City Airport',
 'Hartmann Rd, London', 'London', 'United Kingdom',
 3, 8.2, 3241, 99, 'GBP',
 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800',
 '["Free WiFi","Parking","Restaurant","Late Check-in","24h Front Desk"]',
 51.5074, -0.1278, 'https://www.travelpayouts.com/hotels/gb001?marker=314682',
 1, 0, 1, 1, 0, 1,
 datetime('now', '+30 days')),

-- ── SPAIN ───────────────────────────────────────────────────────────────────

('es-1', 'es001', 'ibis Madrid Centro Las Ventas',
 'Alcalá 289, Madrid', 'Madrid', 'Spain',
 3, 7.8, 1654, 79, 'EUR',
 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=800',
 '["Free WiFi","Parking","Restaurant","Late Check-in"]',
 40.4168, -3.7038, 'https://www.travelpayouts.com/hotels/es001?marker=314682',
 1, 0, 1, 1, 0, 0,
 datetime('now', '+30 days')),

-- ── UNITED STATES ───────────────────────────────────────────────────────────

('us-1', 'us001', 'Holiday Inn Express New York City',
 '538 W 48th St, New York', 'New York', 'United States',
 3, 8.0, 4521, 149, 'USD',
 'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=800',
 '["Free WiFi","Gym","Breakfast Included","Late Check-in"]',
 40.7128, -74.0060, 'https://www.travelpayouts.com/hotels/us001?marker=314682',
 0, 0, 1, 1, 0, 1,
 datetime('now', '+30 days')),

('us-2', 'us002', 'Motel 6 Los Angeles',
 '8010 S Sepulveda Blvd, Los Angeles', 'Los Angeles', 'United States',
 2, 7.2, 1234, 69, 'USD',
 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800',
 '["Free WiFi","Free Parking","Pet Friendly","24h Front Desk"]',
 34.0522, -118.2437, 'https://www.travelpayouts.com/hotels/us002?marker=314682',
 1, 1, 1, 0, 1, 0,
 datetime('now', '+30 days'));
