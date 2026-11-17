// Middleware en MODO DEMO: bloqueo fuera de local y sesión demo.
import test from 'node:test'
import assert from 'node:assert/strict'

process.env.NEXT_PUBLIC_SIGNALARM_DATA_MODE = 'demo'
process.env.SIGNALARM_DEMO_SECRET = 'test-secret-de-al-menos-32-caracteres-xx'
delete process.env.VERCEL
delete process.env.VERCEL_ENV
globalThis.fetch = async () => { throw new Error('el modo demo no debe llamar a la red') }

const { NextRequest } = await import('next/server.js')
const { middleware } = await import('../../middleware.js')
const { signDemoSession } = await import('../../src/lib/signalarm/demo-session.js')
const { demoBlockReason } = await import('../../src/lib/signalarm/demo-guard.js')

const req = (url, cookie) => {
  const u = new URL(url)
  return new NextRequest(u, { headers: { host: u.host, ...(cookie ? { cookie } : {}) } })
}

test('demo en host no local → 503 en páginas y API', async () => {
  for (const path of ['/', '/api/reports', '/coordinator/reports']) {
    const res = await middleware(req('https://signalarm.example' + path))
    assert.equal(res.status, 503, path)
    assert.equal((await res.json()).error.code, 'demo-non-local-host')
  }
})

test('demo en Vercel → bloqueado aunque el host parezca local', () => {
  assert.equal(demoBlockReason({ host: 'localhost:3000', env: { VERCEL: '1' } }), 'demo-on-vercel')
  assert.equal(demoBlockReason({ host: 'localhost:3000', env: { VERCEL_ENV: 'preview' } }), 'demo-on-vercel')
})

test('demo: hosts locales y lista explícita', () => {
  assert.equal(demoBlockReason({ host: 'localhost:3100', env: {} }), null)
  assert.equal(demoBlockReason({ host: '127.0.0.1', env: {} }), null)
  assert.equal(demoBlockReason({ host: '[::1]:3000', env: {} }), null)
  assert.equal(demoBlockReason({ host: 'localhost.evil.com', env: {} }), 'demo-non-local-host')
  assert.equal(demoBlockReason({ host: 'demo.lan:3000', env: { SIGNALARM_DEMO_ALLOWED_HOSTS: 'demo.lan' } }), null)
})

test('demo local: sin sesión → login; sesión válida → pasa; expirada → login', async () => {
  const r1 = await middleware(req('http://localhost:3000/reports'))
  assert.equal(r1.status, 307)
  const valid = await signDemoSession('residente-ana')
  assert.equal((await middleware(req('http://localhost:3000/reports', `sg_demo_session=${valid}`))).headers.get('x-middleware-next'), '1')
  const expired = await signDemoSession('residente-ana', 1000)
  assert.equal((await middleware(req('http://localhost:3000/reports', `sg_demo_session=${expired}`))).status, 307)
})
