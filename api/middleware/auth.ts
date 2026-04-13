// ============================================================
// JWT Authentication Middleware
// ============================================================
import { createMiddleware } from 'hono/factory'
import { verifyJWT, JWTPayload } from '../lib/auth'
import { CloudflareBindings, TIER_LIMITS, SubscriptionTier } from '../lib/types'

type Variables = {
  user: JWTPayload
}

// Require valid JWT
export const requireAuth = createMiddleware<{
  Bindings: CloudflareBindings
  Variables: Variables
}>(async (c, next) => {
  const authHeader = c.req.header('Authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    return c.json({ error: 'Unauthorized', message: 'Authentication required' }, 401)
  }

  const payload = await verifyJWT(token, c.env.JWT_SECRET)
  if (!payload) {
    return c.json({ error: 'Unauthorized', message: 'Invalid or expired token' }, 401)
  }

  c.set('user', payload)
  await next()
})

// Require specific tier
export const requireTier = (minTier: SubscriptionTier) => 
  createMiddleware<{
    Bindings: CloudflareBindings
    Variables: Variables
  }>(async (c, next) => {
    const user = c.get('user')
    const tierOrder: SubscriptionTier[] = ['free', 'traveler', 'business', 'agency']
    const userTierIdx = tierOrder.indexOf(user.tier as SubscriptionTier)
    const requiredTierIdx = tierOrder.indexOf(minTier)

    if (userTierIdx < requiredTierIdx) {
      return c.json({ 
        error: 'Forbidden', 
        message: `This feature requires ${minTier} tier or higher`,
        upgrade_url: 'https://travelpayout.app/upgrade'
      }, 403)
    }

    await next()
  })

// Check search limit for free tier
export const checkSearchLimit = createMiddleware<{
  Bindings: CloudflareBindings
  Variables: Variables
}>(async (c, next) => {
  const user = c.get('user')
  const tier = (user.tier as SubscriptionTier) || 'free'
  const limits = TIER_LIMITS[tier]

  if (limits.daily_searches === Infinity) {
    await next()
    return
  }

  // Check DB for today's search count
  const dbUser = await c.env.DB.prepare(
    'SELECT search_count_today, search_count_reset_at FROM users WHERE id = ?'
  ).bind(user.sub).first<{ search_count_today: number; search_count_reset_at: string }>()

  if (!dbUser) {
    await next()
    return
  }

  // Reset daily counter if needed
  const now = new Date()
  const resetAt = new Date(dbUser.search_count_reset_at)
  const shouldReset = now.toDateString() !== resetAt.toDateString()

  if (shouldReset) {
    await c.env.DB.prepare(
      'UPDATE users SET search_count_today = 0, search_count_reset_at = ? WHERE id = ?'
    ).bind(now.toISOString(), user.sub).run()
    await next()
    return
  }

  if (dbUser.search_count_today >= limits.daily_searches) {
    return c.json({
      error: 'Search limit reached',
      message: `Free tier allows ${limits.daily_searches} searches per day. Upgrade to search more.`,
      searches_used: dbUser.search_count_today,
      limit: limits.daily_searches,
      upgrade_url: 'https://travelpayout.app/upgrade'
    }, 429)
  }

  // Increment search count
  await c.env.DB.prepare(
    'UPDATE users SET search_count_today = search_count_today + 1 WHERE id = ?'
  ).bind(user.sub).run()

  await next()
})

// Optional auth (doesn't fail if no token)
export const optionalAuth = createMiddleware<{
  Bindings: CloudflareBindings
  Variables: Variables
}>(async (c, next) => {
  const authHeader = c.req.header('Authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (token) {
    const payload = await verifyJWT(token, c.env.JWT_SECRET)
    if (payload) c.set('user', payload)
  }

  await next()
})
