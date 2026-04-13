# ✈️ Travel AI PFR — Hotel Finder SaaS

> **AI-powered hotel search engine with affiliate revenue, voice chat, price comparison, and 13-language support.**  
> Stack: **Hono + Cloudflare Workers + D1 + R2** — No Supabase. No Node.js servers. Pure edge.

[![Deploy Status](https://img.shields.io/badge/Deploy-Cloudflare%20Pages-orange)](https://pages.cloudflare.com)
[![Stack](https://img.shields.io/badge/Stack-Hono%20%2B%20D1%20%2B%20R2-blue)](https://hono.dev)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

---

## 🚀 Live Demo

| Endpoint | URL |
|----------|-----|
| API Dashboard | `https://your-project.pages.dev/` |
| Health Check | `https://your-project.pages.dev/api/health` |
| White-label Config | `https://your-project.pages.dev/api/config` |
| IP Locale | `https://your-project.pages.dev/api/locale` |

---

## 💰 Revenue Model

| Stream | Details |
|--------|---------|
| **Affiliate Commissions** | 25–40% per booking via Travelpayouts (marker `314682`) |
| **Avg commission** | ~$60/booking (based on $150/night stay) |
| **Free tier** | $0/mo — 5 searches/day |
| **Traveler** | $9.99/mo — Unlimited + AI Chat + Voice + 3 Alerts |
| **Business** | $24.99/mo — + Expense CSV Export + 10 Alerts |
| **Agency** | $99.99/mo — + API Access + White-label + Unlimited |

### Revenue Projections
- **Conservative Year 1**: $72,000 (500 users, 100 bookings/month)
- **Aggressive Year 2**: $1,050,000 (5,000 users, 1,250 bookings/month)

---

## ✅ Features

### 🔍 Hotel Search
- Travelpayouts API integration with 1-hour D1 cache
- Location autocomplete
- Filters: stars, max price, parking, truck parking, family-friendly
- 5 searches/day limit for free tier (resets midnight UTC)

### 💬 AI Chat (Traveler+ tier)
- **SSE Streaming** — token-by-token responses for AIChatPanel
- LaoZhang/KIE.ai for intent extraction + hotel recommendations
- Chat thread persistence in D1
- Falls back to JSON response for non-streaming clients

### 🎤 Voice Chat (Traveler+ tier)
- Voice transcript → hotel search → ElevenLabs TTS
- Audio stored in Cloudflare R2, served via signed URLs
- Supports 13 languages

### 💲 Price Comparison (All tiers)
- 4 providers: Travelpayouts, Booking.com, Expedia, Hotels.com
- Best price highlighted with discount percentage
- Affiliate booking links with marker `314682`

### 🗺️ Map View
- Lightweight markers endpoint for Leaflet.js
- Geo-nearby search with bounding box + haversine distance
- Driver Mode: parking + highway access hotels

### 🔔 Price Alerts (Traveler+ tier)
- Create target-price alerts per hotel
- Hourly cron trigger via Cloudflare Cron
- Email notifications via Resend

### 🌍 13-Language Support
- IP-based locale detection using Cloudflare `CF-IPCountry` header (free, zero API cost)
- Country → language mapping for: EN, ES, FR, DE, PT, JA, ZH, AR, NL, HI, UR, Papiamento, Sranan
- Auto currency detection (40+ countries, ISO 4217)
- RTL support for Arabic/Urdu

### 🏷️ White-Label (Agency tier)
- **Full rebrand via env vars only** — no code changes needed
- Override: site name, logo, colors, tagline, social links, feature toggles
- Buyers set `SITE_NAME`, `COLOR_PRIMARY`, etc. in Cloudflare secrets

### 📊 Admin & Reporting
- Commission dashboard (business+ tier)
- Monthly revenue breakdown (agency tier)
- User list with subscription tiers (agency tier)
- CSV expense export (business+ tier)

### 💳 Subscription Billing
- **Stripe** — one-time bookings + subscription billing webhook
- **Whop** — SaaS membership management webhook
- Automatic tier sync on subscription events

---

## 🛠️ One-Command Setup (Local)

```bash
git clone https://github.com/thebestrendingnow/pixel-perfect.git
cd pixel-perfect
npm install
cp .env.example .dev.vars
# Edit .dev.vars — fill in your API keys

# Create Cloudflare resources
npx wrangler d1 create travel-payout-production
# ↑ Copy the database_id into wrangler.jsonc

npx wrangler r2 bucket create travel-payout-media

# Initialize local DB
npm run db:migrate:local
npm run db:seed

# Build and start
npm run build
pm2 start ecosystem.config.cjs

# Test
curl http://localhost:3000/api/health
```

---

## 🚀 Production Deploy (Cloudflare Pages)

```bash
# 1. Build
npm run build

# 2. Apply migrations to production DB
npx wrangler d1 migrations apply travel-payout-production

# 3. Deploy to Cloudflare Pages
npx wrangler pages deploy dist --project-name travel-payout-hotels

# 4. Set secrets (repeat for each key in .env.example)
npx wrangler pages secret put TRAVELPAYOUTS_API_KEY --project-name travel-payout-hotels
npx wrangler pages secret put JWT_SECRET --project-name travel-payout-hotels
npx wrangler pages secret put LAOZHANG_API_KEY --project-name travel-payout-hotels
npx wrangler pages secret put ELEVENLABS_API_KEY --project-name travel-payout-hotels
npx wrangler pages secret put STRIPE_SECRET_KEY --project-name travel-payout-hotels
npx wrangler pages secret put STRIPE_WEBHOOK_SECRET --project-name travel-payout-hotels
npx wrangler pages secret put WHOP_API_KEY --project-name travel-payout-hotels
npx wrangler pages secret put WHOP_WEBHOOK_SECRET --project-name travel-payout-hotels
npx wrangler pages secret put RESEND_API_KEY --project-name travel-payout-hotels
```

---

## 🗄️ Database Schema

9 tables in Cloudflare D1 (SQLite):

| Table | Purpose |
|-------|---------|
| `users` | Accounts, tiers, search counts, preferences |
| `hotel_cache` | Travelpayouts results cached for 1 hour |
| `favorites` | User-saved hotels |
| `price_alerts` | Target-price alerts with status tracking |
| `bookings` | Click tracking + commission records |
| `chat_threads` | AI conversation threads |
| `chat_messages` | Individual messages (user/assistant) |
| `voice_messages` | Voice transcripts + audio URLs |
| `whop_subscriptions` | Whop membership sync |

Migration: `migrations/0001_initial_schema.sql`

---

## 📡 API Reference

### Auth
```
POST /api/auth/register   → { token, user }
POST /api/auth/login      → { token, user }
GET  /api/auth/me         → user profile  [JWT]
PATCH /api/auth/profile   → update prefs  [JWT]
```

### Hotel Search
```
POST /api/search              → hotels[]  [JWT, tier-gated]
GET  /api/search/hotel/:id    → hotel detail
GET  /api/search/locations?q= → autocomplete
```

### Price Comparison
```
POST /api/prices/compare    → { prices[], best_price, best_provider }
Body: { hotel_id, check_in, check_out, guests, currency }
```

### AI Chat (SSE)
```
POST /api/chat/stream       [traveler+]
Events: thread_id | hotels | token | done | error

POST /api/chat/send         [traveler+]
POST /api/chat/voice        [traveler+]
GET  /api/chat/threads      [JWT]
GET  /api/chat/threads/:id  [JWT]
DELETE /api/chat/threads/:id [JWT]
```

### Hotels (Extras)
```
GET /api/hotels/trending               → top rated for homepage
GET /api/hotels/driver-mode            → parking + budget hotels
GET /api/hotels/nearby?lat=&lon=       → geo-based search
GET /api/hotels/map-markers?bounds=    → lightweight Leaflet markers
```

### White-label & Locale
```
GET /api/config             → { site_name, colors, feature_flags }
GET /api/locale             → { language, currency, rtl, country }
GET /api/locale/supported   → 13 supported languages
```

### Alerts, Bookings, Admin
```
GET|POST|DELETE|PATCH /api/alerts/:id   [traveler+]
GET|POST /api/bookings                  [JWT]
GET /api/bookings/export                [business+ — CSV]
GET /api/admin/dashboard                [business+]
GET /api/admin/commission-report        [agency]
GET /api/admin/users                    [agency]
POST /api/webhook/stripe
POST /api/webhook/whop
```

---

## 🌍 Internationalization

```
GET /api/locale → auto-detects from Cloudflare CF-IPCountry header
```

| Language | Countries |
|----------|----------|
| English | US, GB, AU, CA, IN, SG, NG, KE, PH… |
| Spanish | ES, MX, AR, CO, CL, PE, VE, CU… |
| French | FR, BE, CH, CI, SN, CM, MA… |
| German | DE, AT, LI |
| Portuguese | BR, PT, AO, MZ |
| Japanese | JP |
| Chinese | CN, TW, HK, MO |
| Arabic | SA, AE, EG, KW, QA, JO, MA, DZ… |
| Dutch | NL, AW, CW |
| Hindi | IN (alternate) |
| Urdu | PK |
| Papiamento | AW, CW, BQ |
| Sranan | SR |

---

## 🏷️ White-Label Configuration

Set these env vars in Cloudflare Pages secrets to fully rebrand:

```env
SITE_NAME=YourBrand Hotels
SITE_TAGLINE=Find the Best Hotel Deals
SITE_URL=https://yourhotelapp.com
LOGO_URL=https://yourhotelapp.com/logo.png
COLOR_PRIMARY=#your-brand-color
COLOR_SECONDARY=#your-secondary-color
COLOR_ACCENT=#your-accent-color
SUPPORT_EMAIL=support@yourhotelapp.com
SHOW_DRIVER_MODE=true
SHOW_VOICE_CHAT=true
SHOW_PRICE_COMPARISON=true
SHOW_MAP=true
```

The frontend calls `GET /api/config` on startup and applies branding dynamically — **zero code changes required**.

---

## 💻 Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | [Hono 4.x](https://hono.dev) | Lightweight edge framework |
| Runtime | Cloudflare Workers | Edge, globally distributed |
| Database | Cloudflare D1 (SQLite) | Free tier: 5M rows/month |
| Storage | Cloudflare R2 | Audio files, free tier: 10GB |
| Hosting | Cloudflare Pages | Free tier: unlimited requests |
| AI Chat | LaoZhang/KIE.ai | GPT-compatible API |
| Voice TTS | ElevenLabs | Bella voice, 13 languages |
| Affiliate | Travelpayouts | Marker 314682, 25-40% commission |
| Email | Resend | Price alert notifications |
| Payments | Stripe + Whop | Subscription billing |

**Monthly hosting cost: ~$5–$15** (mostly API costs — infrastructure is Cloudflare free tier)

---

## 📁 Project Structure

```
pixel-perfect/
├── src/
│   ├── index.tsx              # Main Hono app, CORS, cron export
│   ├── lib/
│   │   ├── types.ts           # TypeScript types + CloudflareBindings
│   │   ├── config.ts          # White-label config (getSiteConfig)
│   │   ├── auth.ts            # JWT helpers (sign, verify)
│   │   ├── travelpayouts.ts   # Travelpayouts API client
│   │   ├── ai.ts              # LaoZhang/KIE.ai chat client
│   │   ├── elevenlabs.ts      # ElevenLabs TTS client
│   │   └── email.ts           # Resend email client
│   ├── middleware/
│   │   └── auth.ts            # requireAuth, requireTier middleware
│   └── routes/
│       ├── auth.ts            # /api/auth/*
│       ├── search.ts          # /api/search/*
│       ├── prices.ts          # /api/prices/*
│       ├── chat.ts            # /api/chat/* (SSE + voice)
│       ├── favorites.ts       # /api/favorites/*
│       ├── alerts.ts          # /api/alerts/* + cron
│       ├── bookings.ts        # /api/bookings/*
│       ├── hotels.ts          # /api/hotels/* (trending, map, nearby)
│       ├── locale.ts          # /api/locale/*
│       ├── admin.ts           # /api/admin/*
│       └── webhooks.ts        # /api/webhook/stripe + whop
├── migrations/
│   └── 0001_initial_schema.sql # 9 D1 tables
├── public/static/             # Static assets
├── seed.sql                   # Development seed data
├── .env.example               # All env vars documented
├── HANDOFF-TO-GENSPARK.json   # Full integration spec
├── wrangler.jsonc             # Cloudflare config
├── ecosystem.config.cjs       # PM2 config for local dev
└── package.json               # Scripts + dependencies
```

---

## 🔧 NPM Scripts

```bash
npm run build           # Vite build → dist/
npm run dev:d1          # Local dev with D1 (wrangler pages dev)
npm run db:migrate:local # Apply migrations to local D1
npm run db:seed         # Seed local database
npm run db:reset        # Reset + re-seed local database
npm run deploy          # Build + deploy to Cloudflare Pages
npm run test            # Health check curl
```

---

## 🔑 Required API Keys

| Key | Get From | Required? |
|-----|---------|----------|
| `TRAVELPAYOUTS_API_KEY` | Already included | ✅ Yes |
| `TRAVELPAYOUTS_MARKER` | Already included (314682) | ✅ Yes |
| `JWT_SECRET` | Generate: `openssl rand -base64 32` | ✅ Yes |
| `LAOZHANG_API_KEY` | [api.laozhang.ai](https://api.laozhang.ai) | ✅ For AI chat |
| `ELEVENLABS_API_KEY` | [elevenlabs.io](https://elevenlabs.io) | ✅ For voice |
| `STRIPE_SECRET_KEY` | [stripe.com](https://stripe.com) | For subscriptions |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard | For subscriptions |
| `WHOP_API_KEY` | [whop.com](https://whop.com) | For Whop billing |
| `RESEND_API_KEY` | [resend.com](https://resend.com) | For email alerts |
| `GOOGLE_PLACES_API_KEY` | Google Cloud Console | Optional |

---

## 📄 License

MIT License — free to use, modify, and sell.

---

## 🤝 Flippa Listing Assets

**What's included in this sale:**
- ✅ Complete source code (Hono backend)
- ✅ Travelpayouts affiliate credentials (marker 314682) — **start earning immediately**
- ✅ D1 database schema + seed data
- ✅ White-label system (rebrand via env vars only)
- ✅ 13-language i18n backend
- ✅ AI chat + voice chat (ElevenLabs Bella voice)
- ✅ Price comparison across 4 providers
- ✅ Stripe + Whop payment webhooks
- ✅ Admin commission dashboard
- ✅ One-command setup — live in under 30 minutes
- ✅ $0 infrastructure cost on Cloudflare free tier
- ✅ Fully documented API (HANDOFF-TO-GENSPARK.json)

**Buyer can be live in production in under 30 minutes** — just set API keys and deploy.

---

*Built with ❤️ on Cloudflare Edge — Travel AI PFR v2.0.0*
