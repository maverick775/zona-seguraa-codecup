import test from 'node:test'
import assert from 'node:assert/strict'

process.env.SIGNALARM_DEMO_SECRET = 'test-secret-de-al-menos-32-caracteres-xx'
const { signDemoSession, verifyDemoSession } = await import('../../src/lib/signalarm/demo-session.js')

test('sesión demo: firma válida devuelve la persona', async () => {
  const token = await signDemoSession('coord-liberacion')
  const persona = await verifyDemoSession(token)
  assert.equal(persona.key, 'coord-liberacion')
  assert.equal(persona.role, 'coordinator')
})

test('sesión demo: alterar la carga o la firma invalida', async () => {
  const token = await signDemoSession('residente-ana')
  const [payload, sig] = token.split('.')
  const forged = Buffer.from(JSON.stringify({ p: 'coord-liberacion', exp: 9999999999 })).toString('base64url')
  assert.equal(await verifyDemoSession(`${forged}.${sig}`), null)
  assert.equal(await verifyDemoSession(`${payload}.${sig.slice(0, -2)}xx`), null)
  assert.equal(await verifyDemoSession('basura'), null)
  assert.equal(await verifyDemoSession(undefined), null)
})

test('sesión demo: expira', async () => {
  const token = await signDemoSession('residente-ana', 1000)
  assert.equal(await verifyDemoSession(token, 1000 + 8 * 3600 + 1), null)
})

test('sesión demo: sin secreto no hay sesión', async () => {
  const token = await signDemoSession('residente-ana')
  const saved = process.env.SIGNALARM_DEMO_SECRET
  process.env.SIGNALARM_DEMO_SECRET = 'corto'
  assert.equal(await verifyDemoSession(token), null)
  await assert.rejects(signDemoSession('residente-ana'))
  process.env.SIGNALARM_DEMO_SECRET = saved
})
