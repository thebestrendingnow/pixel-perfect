// ============================================================
// JWT Auth Helpers
// ============================================================
import { SignJWT, jwtVerify } from 'jose'

export interface JWTPayload {
  sub: string        // user id
  email: string
  tier: string
  iat?: number
  exp?: number
}

export async function signJWT(payload: JWTPayload, secret: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = encoder.encode(secret)
  
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(key)
}

export async function verifyJWT(token: string, secret: string): Promise<JWTPayload | null> {
  try {
    const encoder = new TextEncoder()
    const key = encoder.encode(secret)
    const { payload } = await jwtVerify(token, key)
    return payload as unknown as JWTPayload
  } catch {
    return null
  }
}

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const hashed = await hashPassword(password)
  return hashed === hash
}

export function generateId(): string {
  return crypto.randomUUID()
}
