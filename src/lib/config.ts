// ============================================================
// White-Label Configuration
// All values driven from environment variables — zero hardcoding.
// A Flippa buyer just sets their own env vars to rebrand fully.
// ============================================================
import { CloudflareBindings } from './types'

export interface SiteConfig {
  // Branding
  site_name: string
  site_tagline: string
  site_url: string
  logo_url: string
  favicon_url: string
  // Colors (CSS hex values)
  color_primary: string
  color_secondary: string
  color_accent: string
  color_bg_dark: string
  // Affiliate
  travelpayouts_marker: string
  // Features
  show_driver_mode: boolean
  show_voice_chat: boolean
  show_price_comparison: boolean
  show_map: boolean
  // Contact / legal
  support_email: string
  privacy_url: string
  terms_url: string
  // Social
  twitter_url: string
  instagram_url: string
}

export function getSiteConfig(env: CloudflareBindings): SiteConfig {
  return {
    // Branding — set SITE_NAME in wrangler secrets or .dev.vars
    site_name:    env.SITE_NAME    || 'Travel AI PFR',
    site_tagline: env.SITE_TAGLINE || 'Best Hotel Deals for Drivers',
    site_url:     env.SITE_URL     || 'https://travelpayout.app',
    logo_url:     env.LOGO_URL     || '',
    favicon_url:  env.FAVICON_URL  || '',

    // Colors (Ocean Deep defaults — matches Lovable design system)
    color_primary:   env.COLOR_PRIMARY   || '#2d8a9e',
    color_secondary: env.COLOR_SECONDARY || '#0c2340',
    color_accent:    env.COLOR_ACCENT    || '#5cbdb9',
    color_bg_dark:   env.COLOR_BG_DARK   || '#0c2340',

    // Affiliate — plug in your own Travelpayouts marker
    travelpayouts_marker: env.TRAVELPAYOUTS_MARKER || '314682',

    // Features toggles
    show_driver_mode:       env.SHOW_DRIVER_MODE       !== 'false',
    show_voice_chat:        env.SHOW_VOICE_CHAT         !== 'false',
    show_price_comparison:  env.SHOW_PRICE_COMPARISON   !== 'false',
    show_map:               env.SHOW_MAP                !== 'false',

    // Contact
    support_email: env.SUPPORT_EMAIL || 'support@travelpayout.app',
    privacy_url:   env.PRIVACY_URL   || '/privacy',
    terms_url:     env.TERMS_URL     || '/terms',

    // Social
    twitter_url:   env.TWITTER_URL   || '',
    instagram_url: env.INSTAGRAM_URL || '',
  }
}
