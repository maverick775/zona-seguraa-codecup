// Middleware en modo REAL (Supabase) con Auth simulado vía fetch.
// Casos: sin sesión, sesión expirada (refresh rechazado), token revocado,
// sesión válida, y cookie demo (no debe servir fuera del modo demo).
import test from 'node:test'
import assert from 'node:assert/strict'

delete process.env.NEXT_PUBLIC_SIGNALARM_DATA_MODE
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://testref.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-de-prueba'
process.env.SIGNALARM_DEMO_SECRET = 'test-secret-de-al-menos-32-caracteres-xx'

const calls = []
globalThis.fetch = async (input, init = {}) => {
  const url = typeof input === 'string' ? input : input.url
  const headers = new Headers(init.headers || (typeof input === 'object' ? input.headers : undefined))
  calls.push(url)
  if (url.includes('/auth/v1/user')) {
    if (headers.get('authorization') === 'Bearer token-valido') {
      return Response.json({ id: 'u-1', aud: 'authenticated', email: 'ana@example.test', role: 'authenticated' })
    }
    return Response.json({ code: 401, error_code: 'bad_jwt', msg: 'invalid JWT' }, { status: 401 })
  }
  if (url.includes('/auth/v1/token')) {
    return Response.json({ error: 'invalid_grant', error_description: 'Refresh Token Not Found' }, { status: 400 })
  }
  throw new Error('fetch inesperado: ' + url)
}

const { NextRequest } = await import('next/server.js')
const { middleware } = await import('../../middleware.js')
const { signDemoSession } = await import('../../src/lib/signalarm/demo-session.js')

const COOKIE = 'sb-testref-auth-token'
function sessionCookie(accessToken, expiresAt) {
  const session = {
    access_token: accessToken, refresh_token: 'r-1', token_type: 'bearer',
    expires_in: 3600, expires_at: expiresAt,
    user: { id: 'u-1', aud: 'authenticated', email: 'ana@example.test' },
  }
  return `${COOKIE}=base64-${Buffer.from(JSON.stringify(session)).toString('base64url')}`
}
const req = (path, cookie) =>
  new NextRequest(new URL(path, 'http://localhost:3000'), { headers: cookie ? { cookie } : {} })
const now = () => Math.floor(Date.now() / 1000)
const isLoginRedirect = (res, next) =>
  res.status === 307 && res.headers.get('location') === `http://localhost:3000/login?next=${encodeURIComponent(next)}`

test('ruta pública pasa sin consultar Auth', async () => {
  calls.length = 0
  const res = await middleware(req('/'))
  assert.equal(res.headers.get('x-middleware-next'), '1')
  assert.equal(calls.length, 0)
})

test('sin sesión → redirige a /login con next', async () => {
  assert.ok(isLoginRedirect(await middleware(req('/coordinator/reports')), '/coordinator/reports'))
  assert.ok(isLoginRedirect(await middleware(req('/alerts/create')), '/alerts/create'))
})

test('sesión expirada y refresh rechazado → redirige', async () => {
  calls.length = 0
  const res = await middleware(req('/reports', sessionCookie('token-valido', now() - 3600)))
  assert.ok(isLoginRedirect(res, '/reports'))
  assert.ok(calls.some((u) => u.includes('/auth/v1/token')), 'intentó refrescar')
})

test('token revocado (Auth responde 401) → redirige', async () => {
  const res = await middleware(req('/reports', sessionCookie('token-revocado', now() + 3600)))
  assert.ok(isLoginRedirect(res, '/reports'))
})

test('sesión válida → pasa, verificada contra Auth', async () => {
  calls.length = 0
  const res = await middleware(req('/coordinator/reports', sessionCookie('token-valido', now() + 3600)))
  assert.equal(res.headers.get('x-middleware-next'), '1')
  assert.ok(calls.some((u) => u.includes('/auth/v1/user')), 'consultó getUser')
})

test('cookie demo válida NO da acceso en modo real', async () => {
  const demo = `sg_demo_session=${await signDemoSession('coord-liberacion')}`
  assert.ok(isLoginRedirect(await middleware(req('/coordinator/reports', demo)), '/coordinator/reports'))
})

test('host no local en modo real no se bloquea (el bloqueo es solo para demo)', async () => {
  const r = new NextRequest('https://signalarm.example/', { headers: { host: 'signalarm.example' } })
  assert.equal((await middleware(r)).headers.get('x-middleware-next'), '1')
})
