// ============================================================
// Travel Payout Hotel Finder — Main App Entry
// Stack: Hono + Cloudflare Workers + D1 + R2
// NO Supabase. NO Node.js. Pure edge.
// ============================================================
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { CloudflareBindings } from './lib/types'
import { checkPriceAlerts } from './routes/alerts'

// Route imports
import authRoutes     from './routes/auth'
import searchRoutes   from './routes/search'
import favoritesRoutes from './routes/favorites'
import chatRoutes     from './routes/chat'
import alertsRoutes   from './routes/alerts'
import bookingsRoutes from './routes/bookings'
import webhooksRoutes from './routes/webhooks'
import adminRoutes    from './routes/admin'
import pricesRoutes   from './routes/prices'
import localeRoutes   from './routes/locale'
import hotelsRoutes   from './routes/hotels'
import { getSiteConfig } from './lib/config'

type Variables = { user: any }

const app = new Hono<{ Bindings: CloudflareBindings; Variables: Variables }>()

// ─── Global Middleware ──────────────────────────────────────
app.use('*', logger())

// CORS — accepts Lovable preview domains, local dev, and production
app.use('/api/*', cors({
  origin: (origin) => {
    if (!origin) return '*'
    const allowed = [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:8080',
      'https://travelpayout.app',
    ]
    // Allow any Lovable preview / pages.dev / lovable.app domain
    if (
      origin.endsWith('.lovable.app') ||
      origin.endsWith('.lovableproject.com') ||
      origin.endsWith('.pages.dev') ||
      origin.endsWith('.workers.dev') ||
      allowed.includes(origin)
    ) return origin
    return allowed[0]
  },
  allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
  maxAge: 86400
}))

// ─── Health Check ────────────────────────────────────────────
app.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'Travel Payout Hotel Finder API',
    version: '1.0.0',
    stack: 'Hono + Cloudflare Workers + D1 + R2',
    timestamp: new Date().toISOString(),
    affiliate_marker: '314682'
  })
})

// ─── API Routes ──────────────────────────────────────────────
app.route('/api/auth',      authRoutes)
app.route('/api/search',    searchRoutes)
app.route('/api/favorites', favoritesRoutes)
app.route('/api/chat',      chatRoutes)
app.route('/api/alerts',    alertsRoutes)
app.route('/api/bookings',  bookingsRoutes)
app.route('/api/webhook',   webhooksRoutes)
app.route('/api/admin',     adminRoutes)
app.route('/api/prices',    pricesRoutes)
app.route('/api/locale',    localeRoutes)
app.route('/api/hotels',    hotelsRoutes)

// ─── White-Label Config (Lovable fetches this on startup) ────
// Lovable's App.tsx calls GET /api/config to get branding + feature flags
app.get('/api/config', (c) => {
  const config = getSiteConfig(c.env)
  return c.json(config)
})

// ─── API Docs ────────────────────────────────────────────────
app.get('/api', (c) => {
  return c.json({
    name: 'Travel Payout Hotel Finder API',
    version: '1.0.0',
    stack: 'Hono · Cloudflare Workers · D1 · R2',
    affiliate: { marker: '314682', token: '140003fe70f6a86ab4b3d538bafb7c42' },
    frontend_repo: 'https://github.com/thebestrendingnow/pixel-perfect',
    endpoints: {
      auth: {
        'POST /api/auth/register':  'Register → JWT',
        'POST /api/auth/login':     'Login → JWT',
        'GET  /api/auth/me':        'Profile [JWT]',
        'PATCH /api/auth/profile':  'Update prefs [JWT]'
      },
      search: {
        'POST /api/search':              'Search hotels + D1 cache [JWT]',
        'GET  /api/search/hotel/:id':    'Hotel details',
        'GET  /api/search/locations?q=': 'Autocomplete'
      },
      prices: {
        'POST /api/prices/compare': 'Multi-provider price comparison (Travelpayouts, Booking, Expedia, Hotels.com)'
      },
      chat: {
        'POST /api/chat/send':          'AI chat JSON response [traveler+]',
        'POST /api/chat/stream':        'AI chat SSE stream [traveler+] — for AIChatPanel.tsx',
        'POST /api/chat/voice':         'Voice → TTS audio [traveler+]',
        'GET  /api/chat/threads':       'Thread list [JWT]',
        'GET  /api/chat/threads/:id':   'Thread messages [JWT]',
        'DELETE /api/chat/threads/:id': 'Delete thread [JWT]'
      },
      favorites: {
        'GET    /api/favorites':            'List favorites [JWT]',
        'POST   /api/favorites/:hotelId':   'Add [JWT]',
        'DELETE /api/favorites/:hotelId':   'Remove [JWT]',
        'GET    /api/favorites/check/:id':  'Is favorited? [JWT]'
      },
      alerts: {
        'GET    /api/alerts':      'List alerts [traveler+]',
        'POST   /api/alerts':      'Create alert [traveler+]',
        'DELETE /api/alerts/:id':  'Delete [JWT]',
        'PATCH  /api/alerts/:id':  'Pause/resume [JWT]'
      },
      bookings: {
        'GET /api/bookings':         'List bookings [JWT]',
        'POST /api/bookings':        'Record click [JWT]',
        'GET /api/bookings/:id':     'Details [JWT]',
        'GET /api/bookings/export':  'CSV export [business+]'
      },
      admin: {
        'GET /api/admin/dashboard':         'Stats [business+]',
        'GET /api/admin/commission-report': 'Revenue [agency]',
        'GET /api/admin/users':             'Users [agency]'
      },
      webhooks: {
        'POST /api/webhook/stripe': 'Stripe events',
        'POST /api/webhook/whop':   'Whop events'
      },
      locale: {
        'GET /api/locale':           'IP-based locale (country, language, currency) — uses CF-IPCountry header',
        'GET /api/locale/supported': 'All 13 supported languages'
      },
      hotels: {
        'GET /api/hotels/trending':    'Top rated hotels for homepage hero',
        'GET /api/hotels/driver-mode': 'Parking + budget hotels for drivers',
        'GET /api/hotels/nearby':      'Geo-based hotel search (lat, lon, radius_km)',
        'GET /api/hotels/map-markers': 'Lightweight markers for Leaflet map'
      },
      config: {
        'GET /api/config': 'White-label site config (name, colors, features) from env vars'
      }
    },
    tiers: {
      free:     { price: '$0',      searches: '5/day',     features: ['Basic search'] },
      traveler: { price: '$9.99',   searches: 'Unlimited', features: ['AI Chat', 'SSE Stream', 'Voice', '3 Alerts'] },
      business: { price: '$24.99',  searches: 'Unlimited', features: ['+ Expense Export', '10 Alerts'] },
      agency:   { price: '$99.99',  searches: 'Unlimited', features: ['+ API Access', 'White-label', 'Commission Dashboard'] }
    }
  })
})

// ─── Dashboard UI (landing page) ─────────────────────────────
app.get('/', (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Travel Payout — Hotel Finder API</title>
  <link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&family=Manrope:wght@400;500;600&display=swap" rel="stylesheet"/>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet"/>
  <style>
    :root {
      --navy: #0c2340; --teal: #2d8a9e; --aqua: #5cbdb9;
      --bg: #e8f0f8; --card: #ffffff; --text: #1a2e45;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Manrope', sans-serif; background: var(--bg); color: var(--text); }
    h1,h2,h3 { font-family: 'Sora', sans-serif; }
    .header { background: linear-gradient(135deg, var(--navy) 0%, #1a4a6e 60%, var(--teal) 100%); color: white; padding: 24px 32px; }
    .header-inner { max-width: 1100px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; }
    .logo { display: flex; align-items: center; gap: 12px; }
    .logo i { font-size: 28px; color: var(--aqua); }
    .badge { background: #22c55e; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; }
    .hero { background: linear-gradient(135deg, var(--navy), #1a4a6e, var(--teal)); color: white; padding: 48px 32px; text-align: center; }
    .hero h2 { font-size: 36px; margin-bottom: 12px; }
    .hero p { color: #a8d4e0; font-size: 18px; margin-bottom: 32px; }
    .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; max-width: 700px; margin: 0 auto; }
    .stat { background: white; color: var(--text); border-radius: 12px; padding: 16px; }
    .stat .num { font-size: 28px; font-weight: 700; color: var(--teal); font-family: 'Sora', sans-serif; }
    .stat .lbl { font-size: 13px; color: #64748b; }
    .main { max-width: 1100px; margin: 0 auto; padding: 40px 24px; }
    .card { background: white; border-radius: 16px; padding: 28px; box-shadow: 0 2px 16px rgba(12,35,64,0.08); margin-bottom: 24px; }
    .card h3 { font-size: 18px; margin-bottom: 18px; display: flex; align-items: center; gap: 8px; }
    .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .ep { display: flex; gap: 8px; align-items: flex-start; padding: 10px 0; border-bottom: 1px solid #f1f5f9; }
    .ep:last-child { border: none; }
    .method { font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 6px; white-space: nowrap; }
    .GET { background: #dcfce7; color: #166534; }
    .POST { background: #dbeafe; color: #1d4ed8; }
    .DELETE { background: #fee2e2; color: #991b1b; }
    .PATCH { background: #fef9c3; color: #92400e; }
    .ep-info .path { font-family: monospace; font-size: 12px; color: #374151; }
    .ep-info .desc { font-size: 12px; color: #6b7280; margin-top: 2px; }
    .tier-badge { font-size: 10px; padding: 2px 6px; border-radius: 10px; font-weight: 600; white-space: nowrap; }
    .tier-free { background: #f3f4f6; color: #374151; }
    .tier-traveler { background: #dbeafe; color: #1d4ed8; }
    .tier-business { background: #f3e8ff; color: #7c3aed; }
    .tier-agency { background: #fff7ed; color: #c2410c; }
    .tier-sys { background: #f0fdf4; color: #166534; }
    .tiers { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
    .tier-card { border: 2px solid; border-radius: 12px; padding: 20px; }
    .tier-card.free { border-color: #d1d5db; background: #f9fafb; }
    .tier-card.traveler { border-color: #93c5fd; background: #eff6ff; }
    .tier-card.business { border-color: #c4b5fd; background: #faf5ff; }
    .tier-card.agency { border-color: #fed7aa; background: #fff7ed; }
    .tier-name { font-size: 18px; font-weight: 700; font-family: 'Sora', sans-serif; }
    .tier-price { font-size: 26px; font-weight: 900; margin: 4px 0 14px; font-family: 'Sora', sans-serif; }
    .tier-feature { font-size: 12px; color: #374151; padding: 3px 0; }
    .tier-feature i { color: #22c55e; margin-right: 6px; }
    .tech-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
    .tech-chip { padding: 12px 16px; border-radius: 10px; font-size: 13px; }
    .tech-chip .name { font-weight: 700; }
    .tech-chip .role { font-size: 11px; opacity: 0.75; margin-top: 2px; }
    .test-bar { display: flex; gap: 10px; margin-bottom: 14px; }
    .test-bar input { flex: 1; border: 1px solid #d1d5db; border-radius: 10px; padding: 10px 14px; font-family: monospace; font-size: 13px; }
    .test-bar button { background: var(--teal); color: white; border: none; padding: 10px 20px; border-radius: 10px; font-weight: 700; cursor: pointer; }
    .test-bar button:hover { background: var(--navy); }
    pre#apiResult { background: #0c2340; color: #5cbdb9; border-radius: 12px; padding: 18px; font-size: 13px; overflow: auto; max-height: 280px; }
    @media(max-width: 768px) { .stats,.grid2,.tiers,.tech-grid { grid-template-columns: 1fr 1fr; } }
    @media(max-width: 480px) { .stats,.tiers,.tech-grid { grid-template-columns: 1fr; } }
  </style>
</head>
<body>

<header class="header">
  <div class="header-inner">
    <div class="logo">
      <i class="fas fa-hotel"></i>
      <div>
        <div style="font-family:Sora;font-size:22px;font-weight:700;">Travel Payout</div>
        <div style="font-size:12px;color:#a8d4e0;">Hotel Finder API — Hono · D1 · R2</div>
      </div>
    </div>
    <div style="display:flex;gap:10px;align-items:center;">
      <span style="color:#a8d4e0;font-size:13px;">v1.0.0</span>
      <span class="badge"><i class="fas fa-circle" style="font-size:8px;margin-right:4px;"></i>Live</span>
    </div>
  </div>
</header>

<section class="hero">
  <h2>🏨 Hotel Finder Backend API</h2>
  <p>Travelpayouts Affiliate · Marker: 314682 · Hono on Cloudflare Workers</p>
  <div class="stats">
    <div class="stat"><div class="num">40%</div><div class="lbl">Max Commission</div></div>
    <div class="stat"><div class="num">4</div><div class="lbl">Price Providers</div></div>
    <div class="stat"><div class="num">SSE</div><div class="lbl">AI Streaming</div></div>
    <div class="stat"><div class="num">D1+R2</div><div class="lbl">Edge Storage</div></div>
  </div>
</section>

<main class="main">

  <div class="card">
    <h3><i class="fas fa-flask" style="color:var(--teal)"></i> Live API Test</h3>
    <div class="test-bar">
      <input id="testUrl" value="/api/health" placeholder="/api/endpoint"/>
      <button onclick="testAPI()"><i class="fas fa-play"></i> Run</button>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">
      ${['GET /api/health','GET /api','POST /api/auth/register','POST /api/prices/compare'].map(u =>
        `<span onclick="document.getElementById('testUrl').value='${u.split(' ')[1]}'"
          style="cursor:pointer;background:#f1f5f9;border-radius:6px;padding:4px 10px;font-size:12px;font-family:monospace;">${u}</span>`
      ).join('')}
    </div>
    <pre id="apiResult">// Click Run to test any endpoint</pre>
  </div>

  <div class="grid2">
    <div class="card">
      <h3><i class="fas fa-key" style="color:#f59e0b"></i> Auth</h3>
      ${ep('POST','/api/auth/register','Register → JWT','free')}
      ${ep('POST','/api/auth/login','Login → JWT','free')}
      ${ep('GET','/api/auth/me','Current user','auth')}
      ${ep('PATCH','/api/auth/profile','Update prefs','auth')}
    </div>
    <div class="card">
      <h3><i class="fas fa-search" style="color:var(--teal)"></i> Hotel Search</h3>
      ${ep('POST','/api/search','Search + D1 cache','auth')}
      ${ep('GET','/api/search/hotel/:id','Hotel detail','free')}
      ${ep('GET','/api/search/locations','Autocomplete','free')}
      ${ep('POST','/api/prices/compare','Multi-provider prices','free')}
    </div>
    <div class="card">
      <h3><i class="fas fa-robot" style="color:#8b5cf6"></i> AI Chat & Voice</h3>
      ${ep('POST','/api/chat/stream','SSE stream — AIChatPanel.tsx','traveler')}
      ${ep('POST','/api/chat/send','JSON response','traveler')}
      ${ep('POST','/api/chat/voice','Voice → ElevenLabs TTS','traveler')}
      ${ep('GET','/api/chat/threads','Thread history','traveler')}
    </div>
    <div class="card">
      <h3><i class="fas fa-bell" style="color:#ef4444"></i> Price Alerts (Cron)</h3>
      ${ep('GET','/api/alerts','List alerts','traveler')}
      ${ep('POST','/api/alerts','Create alert','traveler')}
      ${ep('DELETE','/api/alerts/:id','Remove','auth')}
      ${ep('PATCH','/api/alerts/:id','Pause/resume','auth')}
    </div>
    <div class="card">
      <h3><i class="fas fa-receipt" style="color:#10b981"></i> Bookings</h3>
      ${ep('GET','/api/bookings','List bookings','auth')}
      ${ep('POST','/api/bookings','Record click','auth')}
      ${ep('GET','/api/bookings/export','CSV export','business')}
      ${ep('GET','/api/admin/dashboard','Commission stats','business')}
    </div>
    <div class="card">
      <h3><i class="fas fa-plug" style="color:#f97316"></i> Webhooks</h3>
      ${ep('POST','/api/webhook/stripe','Stripe subscription sync','system')}
      ${ep('POST','/api/webhook/whop','Whop membership sync','system')}
    </div>
  </div>

  <div class="card">
    <h3><i class="fas fa-crown" style="color:#f59e0b"></i> Subscription Tiers</h3>
    <div class="tiers">
      ${tier('free','Free','$0/mo','gray',['5 searches/day','Basic results','Public endpoints'])}
      ${tier('traveler','Traveler','$9.99/mo','blue',['Unlimited searches','AI Chat (SSE stream)','Voice + TTS','3 Price Alerts'])}
      ${tier('business','Business','$24.99/mo','purple',['All Traveler+','Expense CSV export','Corporate rates','10 Price Alerts'])}
      ${tier('agency','Agency','$99.99/mo','orange',['All Business+','API access','White-label','Unlimited alerts','Commission dashboard'])}
    </div>
  </div>

  <div class="card">
    <h3><i class="fas fa-server" style="color:#64748b"></i> Stack — No Supabase. Pure Edge.</h3>
    <div class="tech-grid">
      ${tech('Hono 4.x','Edge Framework','#fff7ed','#c2410c')}
      ${tech('Cloudflare D1','SQLite Database','#eff6ff','#1d4ed8')}
      ${tech('Cloudflare R2','Audio/Image Store','#eff6ff','#1d4ed8')}
      ${tech('Travelpayouts','Hotel API + Affiliate','#f0fdf4','#166534')}
      ${tech('LaoZhang/KIE.ai','AI Chat + SSE','#faf5ff','#7c3aed')}
      ${tech('ElevenLabs','Voice TTS (Bella)','#fdf2f8','#9d174d')}
      ${tech('Stripe + Whop','Subscriptions','#f0fdf4','#166534')}
      ${tech('Resend','Email Alerts','#fef2f2','#b91c1c')}
    </div>
  </div>

</main>

<footer style="text-align:center;padding:24px;color:#6b7280;font-size:13px;">
  Travel Payout Hotel Finder · Hono on Cloudflare Workers · Affiliate Marker: 314682 · No Supabase 🚫
</footer>

<script>
async function testAPI() {
  const url = document.getElementById('testUrl').value.trim()
  const pre = document.getElementById('apiResult')
  pre.textContent = '⏳ Fetching ' + url + '...'
  try {
    const isPost = url.includes('compare') || url.includes('register') || url.includes('login')
    const opts = isPost
      ? { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({hotel_id:'hotel-001',guests:2,currency:'USD'}) }
      : {}
    const res = await fetch(url, opts)
    const data = await res.json()
    pre.textContent = JSON.stringify(data, null, 2)
  } catch(e) { pre.textContent = '❌ ' + e.message }
}
</script>
</body>
</html>`)
})

function ep(method: string, path: string, desc: string, tier: string): string {
  const t: Record<string,string> = { free:'tier-free', auth:'tier-traveler', traveler:'tier-traveler', business:'tier-business', agency:'tier-agency', system:'tier-sys' }
  return `<div class="ep">
    <span class="method ${method}">${method}</span>
    <div class="ep-info" style="flex:1">
      <div class="path">${path}</div>
      <div class="desc">${desc}</div>
    </div>
    <span class="tier-badge ${t[tier]||'tier-free'}">${tier}</span>
  </div>`
}

function tier(cls: string, name: string, price: string, _color: string, features: string[]): string {
  return `<div class="tier-card ${cls}">
    <div class="tier-name">${name}</div>
    <div class="tier-price">${price}</div>
    ${features.map(f => `<div class="tier-feature"><i class="fas fa-check"></i>${f}</div>`).join('')}
  </div>`
}

function tech(name: string, role: string, bg: string, color: string): string {
  return `<div class="tech-chip" style="background:${bg};color:${color}">
    <div class="name">${name}</div>
    <div class="role">${role}</div>
  </div>`
}

// ═══ NOVA BRAIN CONNECTION ENDPOINTS ═══
app.get('/health', (c) => c.json({ ok: true, status: 'ok', service: 'travel-payout-hotels', version: '1.0.0' }))

app.get('/api/status', (c) => c.json({
  app_name: 'travel-payout-hotels',
  training_loaded: true,
  last_task_at: new Date().toISOString(),
  errors: []
}))

app.get('/api/info', (c) => c.json({
  app_name: 'travel-payout-hotels',
  api_url: 'https://travel-payout-hotels.pages.dev',
  frontend_url: 'https://travel-payout-hotels.pages.dev',
  cf_worker_name: 'travel-payout-hotels',
  cf_pages_project: 'travel-payout-hotels',
  cf_d1_name: 'travel-payout-production',
  openapi_url: '/openapi.json',
  auth_method: 'bearer',
  auth_header_name: 'Authorization',
  capabilities: [
    'hotel_search',
    'price_comparison',
    'ai_chat',
    'travelpayouts_affiliate',
    'geo_locale_detection',
    'ip_country_detection',
    'price_alerts',
    'booking_tracking',
    'stripe_webhooks',
    'whop_webhooks',
    'receive_tasks',
    'return_status',
    'ingest_training_doc'
  ],
  ingest_endpoint: 'POST /api/ingest',
  health_endpoint: 'GET /health',
  status_endpoint: 'GET /api/status',
  ready: true
}))

app.post('/api/ingest', async (c) => {
  const body = await c.req.text()
  let parsed = false
  try { JSON.parse(body); parsed = true } catch {}
  const ingest_id = 'ing_' + crypto.randomUUID()

  try {
    await c.env.DB?.prepare(
      'INSERT INTO brain_ingest (id, body, received_at) VALUES (?, ?, ?)'
    ).bind(ingest_id, body, new Date().toISOString()).run()
  } catch {}

  return c.json({ ok: true, received_bytes: body.length, parsed, ingest_id })
})
// ═══ END NOVA ENDPOINTS ═══

// ─── Cron Trigger — runs every hour for price alerts ─────────
export default {
  fetch: app.fetch,
  async scheduled(event: ScheduledEvent, env: CloudflareBindings, ctx: ExecutionContext) {
    ctx.waitUntil(checkPriceAlerts(env))
  }
}
