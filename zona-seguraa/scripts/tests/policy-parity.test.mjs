// U6: paridad entre la orientación del motor (getAvailableActions) y la decisión REAL
// de las API routes (en proceso, modo demo). Cada caso parte de una memoria nueva.
import { createInProcessApi } from '../lib/inprocess-api.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import { BASE_POLICY, POLICY_PROFILES, getAvailableActions, resolvePolicy } from '../../src/lib/signalarm/policy.js'
import { SEED_REPORTS, seedViaApi } from '../../src/lib/signalarm/scenarios.js'
import { DEMO_PERSONAS } from '../../src/lib/signalarm/config.js'

console.info = () => {}

// Código del motor → estado HTTP esperado del servidor.
const EXPECTED_STATUS = { ok: 200, 'no-session': 401, 'not-coordinator': 403, 'other-zone': 404, 'status-incompatible': 422, 'version-stale': 409 }
const BODIES = {
  take: {},
  close: { resolution: 'Cierre de prueba de paridad' },
  dismiss: { dismiss_reason: 'duplicate' },
}
const ACTORS = [null, ...DEMO_PERSONAS]
const POLICIES = [BASE_POLICY, ...Object.keys(POLICY_PROFILES).map((id) => resolvePolicy({ profileId: id }).policy)]

test('paridad motor ↔ servidor: persona × estado × acción × versión', async (t) => {
  let cases = 0
  for (const seed of SEED_REPORTS) {
    for (const actor of ACTORS) {
      for (const action of Object.keys(BODIES)) {
        for (const stale of [false, true]) {
          const { call } = await createInProcessApi()
          const seeded = await seedViaApi(call)
          const s = seeded[seed.key]
          if (stale && s.version === 1) continue
          const knownVersion = stale ? s.version - 1 : s.version
          const alert = { id: s.id, zone_id: s.zone_id, status: s.status, version: s.version }
          // La orientación no depende del perfil para acciones reales.
          const codes = new Set(POLICIES.map((policy) =>
            getAvailableActions({ policy, actor, alert, knownVersion }).actions.find((a) => a.action === action).code))
          assert.equal(codes.size, 1, `el perfil cambió la orientación de ${action}`)
          const [code] = codes
          const res = await call(actor?.key || null, {
            method: 'POST',
            path: `/api/coordinator/alerts/${s.id}/transitions`,
            body: { action, expected_version: knownVersion, ...BODIES[action] },
          })
          const label = `${seed.key} · ${actor?.key || 'sin sesión'} · ${action}${stale ? ' (versión vieja)' : ''}`
          await t.test(label, () => {
            assert.equal(res.status, EXPECTED_STATUS[code], `motor dijo ${code}, servidor respondió ${res.status}`)
          })
          cases++
        }
      }
    }
  }
  assert.ok(cases > 100, `casos ejecutados: ${cases}`)
})
