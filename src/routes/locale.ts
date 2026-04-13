// ============================================================
// Locale Route: GET /api/locale
// Uses Cloudflare's built-in CF-IPCountry header — zero cost,
// zero external API calls, works globally at the edge.
// Lovable's i18n.ts calls this to get server-side locale.
// ============================================================
import { Hono } from 'hono'
import { CloudflareBindings } from '../lib/types'

type Variables = { user: any }

const locale = new Hono<{ Bindings: CloudflareBindings; Variables: Variables }>()

// Country → language mapping (covers Lovable's 8 languages: en/es/fr/de/pt/ja/zh/ar)
const COUNTRY_TO_LANG: Record<string, string> = {
  // English
  US: 'en', GB: 'en', AU: 'en', CA: 'en', NZ: 'en', IE: 'en', ZA: 'en',
  IN: 'en', SG: 'en', PH: 'en', NG: 'en', KE: 'en', GH: 'en',
  // Spanish
  ES: 'es', MX: 'es', AR: 'es', CO: 'es', CL: 'es', PE: 'es',
  VE: 'es', EC: 'es', BO: 'es', PY: 'es', UY: 'es', CR: 'es',
  GT: 'es', HN: 'es', SV: 'es', NI: 'es', PA: 'es', DO: 'es', CU: 'es',
  // French
  FR: 'fr', BE: 'fr', CH: 'fr', LU: 'fr', MC: 'fr', SN: 'fr',
  CI: 'fr', CM: 'fr', MG: 'fr', ML: 'fr', BF: 'fr', NE: 'fr',
  // German
  DE: 'de', AT: 'de', LI: 'de',
  // Portuguese
  BR: 'pt', PT: 'pt', AO: 'pt', MZ: 'pt', CV: 'pt', GW: 'pt',
  // Japanese
  JP: 'ja',
  // Chinese
  CN: 'zh', TW: 'zh', HK: 'zh', MO: 'zh',
  // Arabic
  SA: 'ar', AE: 'ar', EG: 'ar', KW: 'ar', QA: 'ar', BH: 'ar',
  OM: 'ar', JO: 'ar', LB: 'ar', IQ: 'ar', SY: 'ar', YE: 'ar',
  LY: 'ar', TN: 'ar', DZ: 'ar', MA: 'ar', SD: 'ar',
  // Dutch — Lovable has nl support from Papiamento/Caribbean region
  NL: 'nl', SR: 'nl', AW: 'nl', CW: 'nl', BQ: 'nl',
  // Hindi
  // IN already mapped to en (English is official), but we can add
}

// Country → currency (ISO 4217)
const COUNTRY_TO_CURRENCY: Record<string, string> = {
  US: 'USD', CA: 'CAD', GB: 'GBP', AU: 'AUD', NZ: 'NZD',
  EU: 'EUR', FR: 'EUR', DE: 'EUR', ES: 'EUR', IT: 'EUR', NL: 'EUR',
  BE: 'EUR', AT: 'EUR', PT: 'EUR', IE: 'EUR', FI: 'EUR', GR: 'EUR',
  BR: 'BRL', MX: 'MXN', AR: 'ARS', CO: 'COP', CL: 'CLP',
  JP: 'JPY', CN: 'CNY', HK: 'HKD', TW: 'TWD', KR: 'KRW',
  IN: 'INR', SG: 'SGD', TH: 'THB', MY: 'MYR', ID: 'IDR',
  SA: 'SAR', AE: 'AED', EG: 'EGP', TR: 'TRY', RU: 'RUB',
  ZA: 'ZAR', NG: 'NGN', KE: 'KES', GH: 'GHS',
  CH: 'CHF', SE: 'SEK', NO: 'NOK', DK: 'DKK', PL: 'PLN',
}

// Papiamento-speaking countries (Caribbean)
const PAPIAMENTO_COUNTRIES = new Set(['AW', 'CW', 'BQ'])
// Sranan Tongo (Suriname)
const SRANAN_COUNTRIES = new Set(['SR'])

// Country → timezone (for check-in time display)
const COUNTRY_TO_TZ: Record<string, string> = {
  US: 'America/New_York', CA: 'America/Toronto', GB: 'Europe/London',
  AU: 'Australia/Sydney', JP: 'Asia/Tokyo', CN: 'Asia/Shanghai',
  DE: 'Europe/Berlin', FR: 'Europe/Paris', BR: 'America/Sao_Paulo',
  IN: 'Asia/Kolkata', AE: 'Asia/Dubai', SA: 'Asia/Riyadh',
}

// GET /api/locale — detect user's locale from Cloudflare IP headers
locale.get('/', async (c) => {
  // Cloudflare automatically adds CF-IPCountry header (free, no API key needed)
  const cfCountry = c.req.header('CF-IPCountry') || 
                    c.req.header('cf-ipcountry') || 
                    'US'

  const cfCity    = c.req.header('CF-IPCity') || ''
  const cfRegion  = c.req.header('CF-IPRegion') || ''
  const cfLat     = c.req.header('CF-IPLatitude') || ''
  const cfLon     = c.req.header('CF-IPLongitude') || ''
  const cfTimezone = c.req.header('CF-Timezone') || COUNTRY_TO_TZ[cfCountry] || 'America/New_York'

  // Determine language — handle special Caribbean languages
  let language = 'en'
  if (PAPIAMENTO_COUNTRIES.has(cfCountry)) {
    language = 'pap' // Papiamento
  } else if (SRANAN_COUNTRIES.has(cfCountry)) {
    language = 'srn' // Sranan Tongo
  } else {
    language = COUNTRY_TO_LANG[cfCountry] || 'en'
  }

  const currency = COUNTRY_TO_CURRENCY[cfCountry] || 'USD'

  // Is this a right-to-left language?
  const rtl = ['ar', 'ur', 'he', 'fa'].includes(language)

  // Driver-relevant: is country where delivery driving is a big market?
  const highDriverMarket = ['US', 'GB', 'CA', 'AU', 'DE', 'NL', 'FR', 'BR'].includes(cfCountry)

  return c.json({
    country: cfCountry,
    city: cfCity,
    region: cfRegion,
    language,
    currency,
    timezone: cfTimezone,
    latitude: cfLat ? parseFloat(cfLat) : null,
    longitude: cfLon ? parseFloat(cfLon) : null,
    rtl,
    high_driver_market: highDriverMarket,
    // Lovable uses this to set the initial locale and currency
    frontend_config: {
      locale: language,
      currency,
      rtl,
      // Suggest showing driver-mode features prominently
      show_driver_features: highDriverMarket || ['US','CA','GB','AU','DE','NL'].includes(cfCountry),
    }
  })
})

// GET /api/locale/supported — list all supported locales
locale.get('/supported', (c) => {
  return c.json({
    languages: [
      { code: 'en', name: 'English',     flag: '🇺🇸', rtl: false },
      { code: 'es', name: 'Español',     flag: '🇪🇸', rtl: false },
      { code: 'fr', name: 'Français',    flag: '🇫🇷', rtl: false },
      { code: 'de', name: 'Deutsch',     flag: '🇩🇪', rtl: false },
      { code: 'pt', name: 'Português',   flag: '🇧🇷', rtl: false },
      { code: 'ja', name: '日本語',       flag: '🇯🇵', rtl: false },
      { code: 'zh', name: '中文',         flag: '🇨🇳', rtl: false },
      { code: 'ar', name: 'العربية',      flag: '🇸🇦', rtl: true  },
      { code: 'nl', name: 'Nederlands',  flag: '🇳🇱', rtl: false },
      { code: 'hi', name: 'हिन्दी',       flag: '🇮🇳', rtl: false },
      { code: 'ur', name: 'اردو',         flag: '🇵🇰', rtl: true  },
      { code: 'pap','name': 'Papiamento', flag: '🇦🇼', rtl: false },
      { code: 'srn','name': 'Sranan',    flag: '🇸🇷', rtl: false },
    ]
  })
})

export default locale
