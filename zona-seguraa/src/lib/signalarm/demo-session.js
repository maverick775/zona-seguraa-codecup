// lib/signalarm/demo-session.js
// Sesión firmada (HMAC-SHA256, Web Crypto) para el modo demo. Funciona en
// middleware y en API routes. Requiere SIGNALARM_DEMO_SECRET (>= 32 caracteres);
// sin secreto no hay sesión demo: no se relaja la autenticación.
import { DEMO_PERSONAS } from './config.js'

export const DEMO_COOKIE = 'sg_demo_session'
export const DEMO_SESSION_TTL_S = 8 * 60 * 60

function b64url(bytes) {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function fromB64url(str) {
  const s = str.replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(s + '==='.slice((s.length + 3) % 4)), (c) => c.charCodeAt(0))
}

function getSecret() {
  const secret = process.env.SIGNALARM_DEMO_SECRET
  if (!secret || secret.length < 32) return null
  return secret
}

export function demoSecretConfigured() {
  return getSecret() !== null
}

async function hmac(data) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(getSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data)))
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export async function signDemoSession(personaKey, nowS = Math.floor(Date.now() / 1000)) {
  if (!getSecret()) throw new Error('SIGNALARM_DEMO_SECRET no configurado')
  const payload = b64url(new TextEncoder().encode(JSON.stringify({ p: personaKey, exp: nowS + DEMO_SESSION_TTL_S })))
  const sig = b64url(await hmac(payload))
  return `${payload}.${sig}`
}

// Devuelve la persona demo o null si la cookie falta, es inválida o expiró.
export async function verifyDemoSession(value, nowS = Math.floor(Date.now() / 1000)) {
  if (!value || !getSecret()) return null
  const [payload, sig] = String(value).split('.')
  if (!payload || !sig) return null
  const expected = b64url(await hmac(payload))
  if (!timingSafeEqual(sig, expected)) return null
  try {
    const data = JSON.parse(new TextDecoder().decode(fromB64url(payload)))
    if (typeof data.exp !== 'number' || data.exp < nowS) return null
    return DEMO_PERSONAS.find((p) => p.key === data.p) || null
  } catch {
    return null
  }
}
