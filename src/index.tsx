// ============================================================
// Travel Payout Hotel Finder - Main App Entry
// Hono on Cloudflare Workers/Pages
// ============================================================
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { CloudflareBindings } from './lib/types'
import { checkPriceAlerts } from './routes/alerts'

// Route imports
import authRoutes from './routes/auth'
import searchRoutes from './routes/search'
import favoritesRoutes from './routes/favorites'
import chatRoutes from './routes/chat'
import alertsRoutes from './routes/alerts'
import bookingsRoutes from './routes/bookings'
import webhooksRoutes from './routes/webhooks'
import adminRoutes from './routes/admin'

type Variables = { user: any }

const app = new Hono<{ Bindings: CloudflareBindings; Variables: Variables }>()

// ─── Global Middleware ──────────────────────────────────────
app.use('*', logger())
app.use('/api/*', cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'https://travelpayout.app', 'https://*.pages.dev'],
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true
}))

// ─── Health Check ────────────────────────────────────────────
app.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'Travel Payout Hotel Finder API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: c.env.TRAVELPAYOUTS_MARKER ? 'production' : 'development'
  })
})

// ─── API Routes ──────────────────────────────────────────────
app.route('/api/auth', authRoutes)
app.route('/api/search', searchRoutes)
app.route('/api/favorites', favoritesRoutes)
app.route('/api/chat', chatRoutes)
app.route('/api/alerts', alertsRoutes)
app.route('/api/bookings', bookingsRoutes)
app.route('/api/webhook', webhooksRoutes)
app.route('/api/admin', adminRoutes)

// ─── API Info Route ──────────────────────────────────────────
app.get('/api', (c) => {
  return c.json({
    name: 'Travel Payout Hotel Finder API',
    version: '1.0.0',
    affiliate_marker: '314682',
    endpoints: {
      auth: {
        'POST /api/auth/register': 'Register new user',
        'POST /api/auth/login': 'Login',
        'GET /api/auth/me': 'Get current user',
        'PATCH /api/auth/profile': 'Update preferences'
      },
      search: {
        'POST /api/search': 'Search hotels (requires auth)',
        'GET /api/search/hotel/:id': 'Get hotel details',
        'GET /api/search/locations?q=': 'Location autocomplete'
      },
      favorites: {
        'GET /api/favorites': 'List favorites',
        'POST /api/favorites/:hotelId': 'Add to favorites',
        'DELETE /api/favorites/:hotelId': 'Remove from favorites',
        'GET /api/favorites/check/:hotelId': 'Check if favorited'
      },
      chat: {
        'POST /api/chat/send': 'AI text chat (traveler+)',
        'POST /api/chat/voice': 'Voice chat TTS (traveler+)',
        'GET /api/chat/threads': 'List chat threads',
        'GET /api/chat/threads/:id': 'Get thread messages',
        'DELETE /api/chat/threads/:id': 'Delete thread'
      },
      alerts: {
        'GET /api/alerts': 'List price alerts (traveler+)',
        'POST /api/alerts': 'Create price alert (traveler+)',
        'DELETE /api/alerts/:id': 'Delete alert',
        'PATCH /api/alerts/:id': 'Pause/resume alert'
      },
      bookings: {
        'GET /api/bookings': 'List bookings',
        'POST /api/bookings': 'Record booking click',
        'GET /api/bookings/:id': 'Booking details',
        'GET /api/bookings/export': 'CSV export (business+)'
      },
      admin: {
        'GET /api/admin/dashboard': 'Stats dashboard (business+)',
        'GET /api/admin/commission-report': 'Commission report (agency)',
        'GET /api/admin/users': 'User list (agency)'
      },
      webhooks: {
        'POST /api/webhook/stripe': 'Stripe webhook',
        'POST /api/webhook/whop': 'Whop webhook'
      }
    },
    subscription_tiers: {
      free: { price: '$0/mo', searches: '5/day', features: ['Basic hotel search'] },
      traveler: { price: '$9.99/mo', searches: 'Unlimited', features: ['AI Chat', 'Voice Search', '3 Price Alerts'] },
      business: { price: '$24.99/mo', searches: 'Unlimited', features: ['All Traveler +', 'Expense Export', 'Corporate Rates', '10 Price Alerts'] },
      agency: { price: '$99.99/mo', searches: 'Unlimited', features: ['All Business +', 'API Access', 'White-label', 'Unlimited Alerts', 'Commission Dashboard'] }
    }
  })
})

// ─── Frontend Catch-all (for SPA routing) ────────────────────
app.get('/', (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Travel Payout - Hotel Finder</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet"/>
  <style>
    body { font-family: 'Segoe UI', system-ui, sans-serif; }
    .gradient-bg { background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 50%, #0ea5e9 100%); }
    .card { background: white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
    .tier-badge { display: inline-block; padding: 2px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
  </style>
</head>
<body class="bg-gray-50 min-h-screen">

  <!-- Header -->
  <header class="gradient-bg text-white py-6 px-6 shadow-lg">
    <div class="max-w-6xl mx-auto flex items-center justify-between">
      <div class="flex items-center gap-3">
        <i class="fas fa-hotel text-2xl text-yellow-300"></i>
        <div>
          <h1 class="text-2xl font-bold">Travel Payout</h1>
          <p class="text-blue-200 text-sm">Hotel Finder — Earn While You Book</p>
        </div>
      </div>
      <div class="flex gap-3">
        <span class="text-blue-200 text-sm">API v1.0.0</span>
        <span class="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
          <i class="fas fa-circle text-xs mr-1"></i>Live
        </span>
      </div>
    </div>
  </header>

  <!-- Hero Stats -->
  <section class="gradient-bg text-white py-12 px-6">
    <div class="max-w-6xl mx-auto text-center">
      <h2 class="text-4xl font-bold mb-4">🏨 Hotel Finder Backend API</h2>
      <p class="text-blue-200 text-lg mb-8">Powered by Travelpayouts Affiliate Network · Marker: 314682</p>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="card p-4 text-gray-800">
          <div class="text-2xl font-bold text-blue-600">40%</div>
          <div class="text-sm text-gray-600">Max Commission</div>
        </div>
        <div class="card p-4 text-gray-800">
          <div class="text-2xl font-bold text-green-600">7</div>
          <div class="text-sm text-gray-600">User Segments</div>
        </div>
        <div class="card p-4 text-gray-800">
          <div class="text-2xl font-bold text-purple-600">13</div>
          <div class="text-sm text-gray-600">Languages</div>
        </div>
        <div class="card p-4 text-gray-800">
          <div class="text-2xl font-bold text-orange-600">4</div>
          <div class="text-sm text-gray-600">Subscription Tiers</div>
        </div>
      </div>
    </div>
  </section>

  <!-- Main Content -->
  <main class="max-w-6xl mx-auto px-6 py-10">
    
    <!-- Quick Test -->
    <section class="card p-6 mb-8">
      <h3 class="text-xl font-bold text-gray-800 mb-4">
        <i class="fas fa-flask text-blue-500 mr-2"></i>API Quick Test
      </h3>
      <div class="flex gap-3 mb-4">
        <input id="testUrl" value="/api/health" class="flex-1 border border-gray-300 rounded-lg px-4 py-2 font-mono text-sm" placeholder="/api/endpoint"/>
        <button onclick="testAPI()" class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-semibold">
          <i class="fas fa-play mr-2"></i>Test
        </button>
      </div>
      <pre id="apiResult" class="bg-gray-900 text-green-400 rounded-lg p-4 text-sm overflow-auto max-h-64 font-mono">
// Click Test to see API response
      </pre>
    </section>

    <!-- Endpoints -->
    <section class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      
      <div class="card p-6">
        <h3 class="text-lg font-bold text-gray-800 mb-4">
          <i class="fas fa-key text-yellow-500 mr-2"></i>Authentication
        </h3>
        <div class="space-y-2">
          ${endpointItem('POST', '/api/auth/register', 'Register new user', 'free')}
          ${endpointItem('POST', '/api/auth/login', 'Login & get JWT token', 'free')}
          ${endpointItem('GET', '/api/auth/me', 'Current user profile', 'auth')}
        </div>
      </div>

      <div class="card p-6">
        <h3 class="text-lg font-bold text-gray-800 mb-4">
          <i class="fas fa-search text-blue-500 mr-2"></i>Hotel Search
        </h3>
        <div class="space-y-2">
          ${endpointItem('POST', '/api/search', 'Search hotels + AI cache', 'auth')}
          ${endpointItem('GET', '/api/search/hotel/:id', 'Hotel details', 'free')}
          ${endpointItem('GET', '/api/search/locations', 'Location autocomplete', 'free')}
        </div>
      </div>

      <div class="card p-6">
        <h3 class="text-lg font-bold text-gray-800 mb-4">
          <i class="fas fa-robot text-purple-500 mr-2"></i>AI Chat & Voice
        </h3>
        <div class="space-y-2">
          ${endpointItem('POST', '/api/chat/send', 'AI hotel chat (LaoZhang/KIE)', 'traveler')}
          ${endpointItem('POST', '/api/chat/voice', 'Voice TTS (ElevenLabs)', 'traveler')}
          ${endpointItem('GET', '/api/chat/threads', 'Chat history', 'traveler')}
        </div>
      </div>

      <div class="card p-6">
        <h3 class="text-lg font-bold text-gray-800 mb-4">
          <i class="fas fa-bell text-red-500 mr-2"></i>Price Alerts
        </h3>
        <div class="space-y-2">
          ${endpointItem('GET', '/api/alerts', 'List active alerts', 'traveler')}
          ${endpointItem('POST', '/api/alerts', 'Create price alert', 'traveler')}
          ${endpointItem('DELETE', '/api/alerts/:id', 'Remove alert', 'traveler')}
        </div>
      </div>

      <div class="card p-6">
        <h3 class="text-lg font-bold text-gray-800 mb-4">
          <i class="fas fa-chart-line text-green-500 mr-2"></i>Admin & Reports
        </h3>
        <div class="space-y-2">
          ${endpointItem('GET', '/api/admin/dashboard', 'Booking + commission stats', 'business')}
          ${endpointItem('GET', '/api/admin/commission-report', 'Full revenue report', 'agency')}
          ${endpointItem('GET', '/api/bookings/export', 'CSV expense export', 'business')}
        </div>
      </div>

      <div class="card p-6">
        <h3 class="text-lg font-bold text-gray-800 mb-4">
          <i class="fas fa-webhook text-orange-500 mr-2"></i>Webhooks
        </h3>
        <div class="space-y-2">
          ${endpointItem('POST', '/api/webhook/stripe', 'Stripe subscription events', 'system')}
          ${endpointItem('POST', '/api/webhook/whop', 'Whop membership events', 'system')}
        </div>
      </div>
    </section>

    <!-- Subscription Tiers -->
    <section class="card p-6 mb-8">
      <h3 class="text-xl font-bold text-gray-800 mb-6">
        <i class="fas fa-crown text-yellow-500 mr-2"></i>Subscription Tiers
      </h3>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        ${tierCard('Free', '$0', 'gray', ['5 searches/day', 'Basic results', 'Public API access'])}
        ${tierCard('Traveler', '$9.99', 'blue', ['Unlimited searches', 'AI Chat', 'Voice Search', '3 Price Alerts'])}
        ${tierCard('Business', '$24.99', 'purple', ['All Traveler+', 'Expense Export', 'Corporate Rates', '10 Price Alerts'])}
        ${tierCard('Agency', '$99.99', 'orange', ['All Business+', 'API Access', 'White-label', 'Unlimited Alerts', 'Commission Dashboard'])}
      </div>
    </section>

    <!-- Architecture -->
    <section class="card p-6">
      <h3 class="text-xl font-bold text-gray-800 mb-4">
        <i class="fas fa-server text-gray-500 mr-2"></i>Tech Stack
      </h3>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        ${techBadge('Hono', 'Edge Framework', 'bg-orange-100 text-orange-800')}
        ${techBadge('Cloudflare D1', 'SQLite Database', 'bg-blue-100 text-blue-800')}
        ${techBadge('Cloudflare R2', 'Audio Storage', 'bg-blue-100 text-blue-800')}
        ${techBadge('Travelpayouts', 'Hotel API', 'bg-green-100 text-green-800')}
        ${techBadge('LaoZhang/KIE.ai', 'AI Engine', 'bg-purple-100 text-purple-800')}
        ${techBadge('ElevenLabs', 'TTS Voice', 'bg-pink-100 text-pink-800')}
        ${techBadge('Stripe + Whop', 'Payments', 'bg-indigo-100 text-indigo-800')}
        ${techBadge('Resend', 'Email Alerts', 'bg-red-100 text-red-800')}
      </div>
    </section>

  </main>

  <footer class="text-center py-6 text-gray-500 text-sm">
    Travel Payout Hotel Finder API · Affiliate Marker: 314682 · Built on Cloudflare Workers
  </footer>

  <script>
    async function testAPI() {
      const url = document.getElementById('testUrl').value;
      const pre = document.getElementById('apiResult');
      pre.textContent = '⏳ Loading...';
      try {
        const res = await fetch(url);
        const data = await res.json();
        pre.textContent = JSON.stringify(data, null, 2);
      } catch(e) {
        pre.textContent = '❌ Error: ' + e.message;
      }
    }
    // Quick select examples
    document.querySelectorAll('[data-url]').forEach(el => {
      el.style.cursor = 'pointer';
      el.addEventListener('click', () => {
        document.getElementById('testUrl').value = el.dataset.url;
      });
    });
  </script>
</body>
</html>`)
})

function endpointItem(method: string, path: string, desc: string, tier: string): string {
  const colors: Record<string, string> = {
    GET: 'bg-green-100 text-green-700',
    POST: 'bg-blue-100 text-blue-700',
    DELETE: 'bg-red-100 text-red-700',
    PATCH: 'bg-yellow-100 text-yellow-700'
  }
  const tierColors: Record<string, string> = {
    free: 'bg-gray-100 text-gray-600',
    auth: 'bg-blue-50 text-blue-600',
    traveler: 'bg-indigo-100 text-indigo-700',
    business: 'bg-purple-100 text-purple-700',
    agency: 'bg-orange-100 text-orange-700',
    system: 'bg-red-50 text-red-600'
  }
  return `<div class="flex items-start gap-2 py-2 border-b border-gray-100 last:border-0" data-url="${path}">
    <span class="text-xs font-bold px-2 py-1 rounded ${colors[method] || 'bg-gray-100'} shrink-0">${method}</span>
    <div class="flex-1 min-w-0">
      <div class="font-mono text-xs text-gray-700 truncate">${path}</div>
      <div class="text-xs text-gray-500">${desc}</div>
    </div>
    <span class="text-xs px-2 py-1 rounded ${tierColors[tier] || 'bg-gray-100'} shrink-0">${tier}</span>
  </div>`
}

function tierCard(name: string, price: string, color: string, features: string[]): string {
  const colors: Record<string, string> = {
    gray: 'border-gray-300 bg-gray-50', blue: 'border-blue-400 bg-blue-50',
    purple: 'border-purple-400 bg-purple-50', orange: 'border-orange-400 bg-orange-50'
  }
  const textColors: Record<string, string> = {
    gray: 'text-gray-700', blue: 'text-blue-700', purple: 'text-purple-700', orange: 'text-orange-700'
  }
  return `<div class="border-2 ${colors[color]} rounded-xl p-4">
    <div class="font-bold ${textColors[color]} text-lg">${name}</div>
    <div class="text-2xl font-black ${textColors[color]} mb-3">${price}<span class="text-sm font-normal">/mo</span></div>
    <ul class="space-y-1">${features.map(f => `<li class="text-xs text-gray-600"><i class="fas fa-check text-green-500 mr-1"></i>${f}</li>`).join('')}</ul>
  </div>`
}

function techBadge(name: string, desc: string, cls: string): string {
  return `<div class="rounded-lg px-3 py-2 ${cls}">
    <div class="font-semibold">${name}</div>
    <div class="opacity-75 text-xs">${desc}</div>
  </div>`
}

// ─── Cron Trigger (Price Alerts - every hour) ─────────────────
export default {
  fetch: app.fetch,
  async scheduled(event: ScheduledEvent, env: CloudflareBindings, ctx: ExecutionContext) {
    ctx.waitUntil(checkPriceAlerts(env))
  }
}
