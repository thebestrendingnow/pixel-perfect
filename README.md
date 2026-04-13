# 🏨 Travel Payout Hotel Finder — Backend API

> NOVA 3.0 Strategic Build · Hono + Cloudflare Workers + D1

---

## 🌐 Live URLs (Sandbox Dev)
- **API Root**: https://3000-ibce4a3zivchzhfsry41c-de59bda9.sandbox.novita.ai/api
- **Health Check**: https://3000-ibce4a3zivchzhfsry41c-de59bda9.sandbox.novita.ai/api/health
- **Dashboard UI**: https://3000-ibce4a3zivchzhfsry41c-de59bda9.sandbox.novita.ai

---

## ✅ Completed Features

| Feature | Status | Tier |
|---|---|---|
| JWT Auth (register/login/me) | ✅ | Free |
| Hotel Search (Travelpayouts + D1 cache) | ✅ | Free+ |
| Daily search limits by tier | ✅ | Auto |
| Favorites (save/list/remove) | ✅ | Auth |
| AI Chat (LaoZhang/KIE.ai) | ✅ | Traveler+ |
| Voice Chat + ElevenLabs TTS | ✅ | Traveler+ |
| Price Alerts + Email (Resend) | ✅ | Traveler+ |
| Hourly Cron price checker | ✅ | System |
| Booking tracking & CSV export | ✅ | All/Business+ |
| Stripe webhook handler | ✅ | System |
| Whop webhook handler | ✅ | System |
| Admin dashboard (stats) | ✅ | Business+ |
| Commission report | ✅ | Agency |
| D1 database + migrations | ✅ | — |
| R2 audio storage | ✅ | — |

---

## 🔌 API Endpoints

### Auth
```
POST /api/auth/register     → { token, user }
POST /api/auth/login        → { token, user }
GET  /api/auth/me           → { user }          [JWT]
PATCH /api/auth/profile     → { success }       [JWT]
```

### Search
```
POST /api/search            → { hotels[], total } [JWT + search limit]
GET  /api/search/hotel/:id  → { hotel }
GET  /api/search/locations  → { locations[] }
```

### Favorites
```
GET    /api/favorites           → { favorites[] }
POST   /api/favorites/:hotelId  → { success }
DELETE /api/favorites/:hotelId  → { success }
GET    /api/favorites/check/:id → { is_favorited }
```

### AI Chat (Traveler+)
```
POST /api/chat/send         → { response, hotels[], thread_id }
POST /api/chat/voice        → { response_text, audio_url, hotels[] }
GET  /api/chat/threads      → { threads[] }
GET  /api/chat/threads/:id  → { thread, messages[] }
```

### Price Alerts (Traveler+)
```
GET    /api/alerts       → { alerts[] }
POST   /api/alerts       → { alert_id }
DELETE /api/alerts/:id   → { success }
PATCH  /api/alerts/:id   → { success }
```

### Bookings
```
GET  /api/bookings         → { bookings[], total_commission }
POST /api/bookings         → { booking_id }
GET  /api/bookings/:id     → { booking }
GET  /api/bookings/export  → CSV file (Business+)
```

### Admin
```
GET /api/admin/dashboard          → stats (Business+)
GET /api/admin/commission-report  → report (Agency)
GET /api/admin/users              → user list (Agency)
```

### Webhooks (internal)
```
POST /api/webhook/stripe   → Stripe events
POST /api/webhook/whop     → Whop events
```

---

## 💰 Subscription Tiers

| Tier | Price | Searches | Alerts | AI Chat | Voice | Expense Export | API |
|---|---|---|---|---|---|---|---|
| Free | $0 | 5/day | 0 | ❌ | ❌ | ❌ | ❌ |
| Traveler | $9.99/mo | Unlimited | 3 | ✅ | ✅ | ❌ | ❌ |
| Business | $24.99/mo | Unlimited | 10 | ✅ | ✅ | ✅ | ❌ |
| Agency | $99.99/mo | Unlimited | ∞ | ✅ | ✅ | ✅ | ✅ |

---

## 🗄️ Data Models (Cloudflare D1)

- **users** — auth, tier, preferences, search limits
- **hotel_cache** — Travelpayouts results (1hr TTL), driver/family filters
- **favorites** — user ↔ hotel mapping
- **price_alerts** — target prices, status, cron-triggered notifications
- **bookings** — click tracking, commission earned
- **chat_threads / chat_messages** — AI conversation history
- **voice_messages** — transcript + audio_url (R2)
- **whop_subscriptions** — Whop membership sync
- **expense_reports** — business tier CSV export records

---

## 🔧 Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Hono 4.x on Cloudflare Workers |
| **Database** | Cloudflare D1 (SQLite) |
| **Storage** | Cloudflare R2 (audio files) |
| **Hotel API** | Travelpayouts / Hotellook (Marker: 314682) |
| **AI** | LaoZhang/KIE.ai (OpenAI-compatible) |
| **TTS** | ElevenLabs (Bella voice) |
| **Payments** | Stripe + Whop |
| **Email** | Resend |
| **Auth** | JWT (jose library) |
| **Build** | Vite + @hono/vite-build |

---

## 🚀 Setup & Deploy

### Local Development
```bash
# Install deps
npm install

# Apply DB migrations
npm run db:migrate:local

# Seed test data
npm run db:seed

# Build & start
npm run build
pm2 start ecosystem.config.cjs
```

### Environment Variables (.dev.vars)
```
TRAVELPAYOUTS_API_KEY=140003fe70f6a86ab4b3d538bafb7c42
TRAVELPAYOUTS_MARKER=314682
LAOZHANG_API_KEY=<your-key>
ELEVENLABS_API_KEY=<your-key>
STRIPE_SECRET_KEY=<your-key>
WHOP_API_KEY=<your-key>
JWT_SECRET=<random-256-bit>
RESEND_API_KEY=<your-key>
```

### Deploy to Cloudflare Pages
```bash
# Create D1 database
npx wrangler d1 create travel-payout-production
# (copy database_id to wrangler.jsonc)

# Create R2 bucket
npx wrangler r2 bucket create travel-payout-media

# Build & deploy
npm run deploy

# Set secrets
npx wrangler pages secret put TRAVELPAYOUTS_API_KEY
npx wrangler pages secret put JWT_SECRET
# ... etc
```

---

## 📊 Revenue Projections (from NOVA 3.0 analysis)

| Scenario | Users | Bookings/mo | Avg Commission | Annual Revenue |
|---|---|---|---|---|
| Conservative (Yr 1) | 500 | 100 | $60 | **$72,000** |
| Aggressive (Yr 2) | 5,000 | 1,250 | $70 | **$1,050,000** |

Affiliate: Travelpayouts (25–40% commission) · Marker: `314682`

---

## ⏭️ Next Steps (When Lovable Frontend is Ready)
1. Pull in Lovable frontend React code to `public/` or deploy separately
2. Update CORS origins in `src/index.tsx` to match Lovable domain
3. Set up Cloudflare D1 production database (replace placeholder ID in `wrangler.jsonc`)
4. Configure all secrets via `wrangler pages secret put`
5. Deploy: `npm run deploy`
6. Set Stripe + Whop webhook URLs to production API endpoints
7. Add i18n (i18next) for 13-language support
8. Add Leaflet map component in frontend

---

*Built with NOVA 3.0 · Travel Payout Hotel Finder · Backend v1.0.0*
