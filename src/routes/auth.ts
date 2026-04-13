// ============================================================
// Auth Routes: /api/auth/register, /login, /me, /refresh
// ============================================================
import { Hono } from 'hono'
import { CloudflareBindings } from '../lib/types'
import { signJWT, hashPassword, verifyPassword, generateId } from '../lib/auth'
import { sendEmail, welcomeEmailHTML } from '../lib/email'

type Variables = { user: any }

const auth = new Hono<{ Bindings: CloudflareBindings; Variables: Variables }>()

// POST /api/auth/register
auth.post('/register', async (c) => {
  try {
    const { email, password, name } = await c.req.json<{ email: string; password: string; name?: string }>()

    if (!email || !password) {
      return c.json({ error: 'Email and password are required' }, 400)
    }
    if (password.length < 8) {
      return c.json({ error: 'Password must be at least 8 characters' }, 400)
    }

    // Check if user exists
    const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email.toLowerCase()).first()
    if (existing) {
      return c.json({ error: 'Email already registered' }, 409)
    }

    const id = generateId()
    const password_hash = await hashPassword(password)

    await c.env.DB.prepare(`
      INSERT INTO users (id, email, password_hash, name, subscription_tier)
      VALUES (?, ?, ?, ?, 'free')
    `).bind(id, email.toLowerCase(), password_hash, name || email.split('@')[0]).run()

    const token = await signJWT({ sub: id, email: email.toLowerCase(), tier: 'free' }, c.env.JWT_SECRET)

    // Send welcome email (non-blocking)
    c.executionCtx?.waitUntil(
      sendEmail({
        to: email,
        subject: 'Welcome to Travel Payout! 🌍',
        html: welcomeEmailHTML({ userName: name || email.split('@')[0], tier: 'free' })
      }, c.env.RESEND_API_KEY)
    )

    return c.json({ token, user: { id, email: email.toLowerCase(), name, tier: 'free' } }, 201)
  } catch (err: any) {
    console.error('Register error:', err)
    return c.json({ error: 'Registration failed', message: err.message }, 500)
  }
})

// POST /api/auth/login
auth.post('/login', async (c) => {
  try {
    const { email, password } = await c.req.json<{ email: string; password: string }>()

    if (!email || !password) {
      return c.json({ error: 'Email and password are required' }, 400)
    }

    const user = await c.env.DB.prepare(
      'SELECT id, email, password_hash, name, subscription_tier FROM users WHERE email = ?'
    ).bind(email.toLowerCase()).first<any>()

    if (!user) {
      return c.json({ error: 'Invalid credentials' }, 401)
    }

    const valid = await verifyPassword(password, user.password_hash)
    if (!valid) {
      return c.json({ error: 'Invalid credentials' }, 401)
    }

    const token = await signJWT({
      sub: user.id,
      email: user.email,
      tier: user.subscription_tier
    }, c.env.JWT_SECRET)

    return c.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        tier: user.subscription_tier
      }
    })
  } catch (err: any) {
    console.error('Login error:', err)
    return c.json({ error: 'Login failed', message: err.message }, 500)
  }
})

// GET /api/auth/me - get current user profile
auth.get('/me', async (c) => {
  const authHeader = c.req.header('Authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) return c.json({ error: 'Unauthorized' }, 401)

  const { verifyJWT } = await import('../lib/auth')
  const payload = await verifyJWT(token, c.env.JWT_SECRET)
  if (!payload) return c.json({ error: 'Invalid token' }, 401)

  const user = await c.env.DB.prepare(`
    SELECT id, email, name, subscription_tier, preferred_language, preferred_currency,
           search_count_today, created_at
    FROM users WHERE id = ?
  `).bind(payload.sub).first<any>()

  if (!user) return c.json({ error: 'User not found' }, 404)

  return c.json({ user })
})

// PATCH /api/auth/profile - update preferences
auth.patch('/profile', async (c) => {
  const authHeader = c.req.header('Authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) return c.json({ error: 'Unauthorized' }, 401)

  const { verifyJWT } = await import('../lib/auth')
  const payload = await verifyJWT(token, c.env.JWT_SECRET)
  if (!payload) return c.json({ error: 'Invalid token' }, 401)

  const { name, preferred_language, preferred_currency } = await c.req.json<any>()

  await c.env.DB.prepare(`
    UPDATE users SET
      name = COALESCE(?, name),
      preferred_language = COALESCE(?, preferred_language),
      preferred_currency = COALESCE(?, preferred_currency),
      updated_at = datetime('now')
    WHERE id = ?
  `).bind(name || null, preferred_language || null, preferred_currency || null, payload.sub).run()

  return c.json({ success: true })
})

export default auth
