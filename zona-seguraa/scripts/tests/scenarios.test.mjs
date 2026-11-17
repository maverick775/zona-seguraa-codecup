// U5: banco de escenarios ejecutado EN PROCESO contra las API routes reales (modo demo).
// Misma matriz que scripts/smoke-api.mjs (HTTP) y scripts/smoke-supabase.mjs.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createInProcessApi } from '../lib/inprocess-api.mjs'
import {
  ACCESS_MATRIX, SEED_REPORTS, describeRow, runAccessMatrix, seedViaApi,
} from '../../src/lib/signalarm/scenarios.js'
import { DEMO_PERSONAS } from '../../src/lib/signalarm/config.js'

// Silencia los logs de acceso de las rutas (no contienen cuerpos ni secretos).
console.info = () => {}

test('banco: personas y claves de semilla coherentes', () => {
  const keys = new Set(DEMO_PERSONAS.map((p) => p.key))
  for (const s of SEED_REPORTS) {
    assert.ok(keys.has(s.persona), s.key)
    for (const st of s.steps) assert.ok(keys.has(st.persona), `${s.key}/${st.action}`)
  }
  const seedKeys = new Set(SEED_REPORTS.map((s) => s.key))
  const ids = new Set()
  for (const row of ACCESS_MATRIX) {
    assert.ok(!ids.has(row.id), `id repetido ${row.id}`); ids.add(row.id)
    if (row.persona) assert.ok(keys.has(row.persona), row.id)
    if (row.target) assert.ok(seedKeys.has(row.target), row.id)
  }
  // Cubre los cuatro estados.
  assert.deepEqual([...new Set(SEED_REPORTS.map((s) => s.expect))].sort(), ['active', 'false_alarm', 'in_progress', 'resolved'])
})

test('siembra vía API: cada reporte llega a su estado esperado', async () => {
  const { call } = await createInProcessApi()
  const seeded = await seedViaApi(call)
  for (const s of SEED_REPORTS) assert.equal(seeded[s.key].status, s.expect, s.key)
})

test('matriz de acceso en proceso (rutas reales, modo demo)', async (t) => {
  const { call } = await createInProcessApi()
  const seeded = await seedViaApi(call)
  const results = await runAccessMatrix(call, seeded)
  for (const r of results) {
    await t.test(describeRow(r.row), () => {
      assert.ok(r.ok, `esperado ${r.expect}, obtenido ${r.status} ${r.detail}`)
    })
  }
})

test('historial: no hay métodos de escritura sobre el detalle de coordinación', async () => {
  const { call } = await createInProcessApi()
  const seeded = await seedViaApi(call)
  for (const method of ['PATCH', 'PUT', 'DELETE']) {
    const r = await call('coord-liberacion', { method, path: `/api/coordinator/alerts/${seeded['z1-cerrado'].id}`, body: {} })
    assert.equal(r.status, 405, method)
  }
  const d = await call('coord-liberacion', { path: `/api/coordinator/alerts/${seeded['z1-cerrado'].id}` })
  assert.deepEqual(d.json.data.history.map((e) => e.action), ['report.created', 'report.taken', 'report.closed'])
})

test('vistas de ejemplo: estados, versión e historial coherentes con la semilla', async () => {
  const { sampleViews } = await import('../../src/lib/signalarm/scenarios.js')
  const views = sampleViews()
  assert.equal(views.length, SEED_REPORTS.length)
  for (const [i, v] of views.entries()) {
    assert.equal(v.status, SEED_REPORTS[i].expect, v.key)
    assert.equal(v.version, v.history.length, v.key)
    assert.equal(v.history.at(-1).to_status, v.status, v.key)
    assert.equal(v.level, 0)
  }
})
