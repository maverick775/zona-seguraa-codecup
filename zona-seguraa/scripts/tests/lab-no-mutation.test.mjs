// U6: los escenarios del laboratorio no mutan nada (memoria demo ni datos de ejemplo).
// Complementa lab-static.test.mjs (prohibiciones estáticas) con una comprobación de efectos.
import { createInProcessApi } from '../lib/inprocess-api.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  POLICY_PROFILES, evaluateReportReadiness, getAvailableActions, getRequiredFields, previewTransition,
  resolvePolicy, waitingAdvisory,
} from '../../src/lib/signalarm/policy.js'
import { guidanceFor } from '../../src/lib/signalarm/messages.js'
import { ZONE, sampleViews, seedViaApi } from '../../src/lib/signalarm/scenarios.js'
import { DEMO_PERSONAS } from '../../src/lib/signalarm/config.js'

console.info = () => {}

const ACTIONS = ['take', 'close', 'dismiss', 'request_info', 'mark_possible_duplicate', 'merge', 'escalate', 'notify', 'auto_close']
const INPUT = { resolution: 'x', dismiss_reason: 'other', note: 'n' }
const ALL_CHECKED = { 'revise-datos': 1, similares: 1, 'resolucion-clara': 1, punto: 1, responsable: 1 }

function exerciseLab(alerts) {
  let calls = 0
  for (const profileId of ['vigente', ...Object.keys(POLICY_PROFILES), 'inexistente']) {
    for (const overrides of [undefined, { coordination: { noteRequiredFor: [] } }]) {
      const { policy } = resolvePolicy({ profileId, overrides })
      for (const alert of alerts) {
        for (const actor of [null, ...DEMO_PERSONAS]) {
          for (const knownVersion of [alert.version, alert.version - 1]) {
            getAvailableActions({ policy, actor, alert, knownVersion })
            for (const action of ACTIONS) {
              previewTransition({ policy, actor, alert, action, input: { ...INPUT, expected_version: knownVersion }, checklist: ALL_CHECKED, at: 'T' })
              calls++
            }
          }
        }
        waitingAdvisory({ policy, alert, now: Date.parse(alert.created_at) + 3600_000 })
        for (const context of ['create', 'close', 'dismiss']) getRequiredFields({ policy, context, input: INPUT })
        guidanceFor({ phase: 'follow-up', status: alert.status, isDemo: true })
      }
      evaluateReportReadiness({ policy, draft: { zone_id: ZONE.liberacion, type: 'fire', description: 'humo', urgency: 'urgent' } })
    }
  }
  return calls
}

test('laboratorio sobre datos de ejemplo: no muta sampleViews', () => {
  const views = sampleViews()
  const before = structuredClone(views)
  assert.ok(exerciseLab(views) > 1000)
  assert.deepStrictEqual(views, before)
  assert.deepStrictEqual(views, sampleViews(), 'sampleViews es determinista')
})

test('laboratorio sobre reportes sembrados vía API: la memoria demo queda idéntica', async () => {
  const { call } = await createInProcessApi()
  const seeded = await seedViaApi(call)
  const alerts = []
  for (const s of Object.values(seeded)) {
    const coord = s.zone_id === ZONE.liberacion ? 'coord-liberacion' : 'coord-rotonda'
    const r = await call(coord, { path: `/api/coordinator/alerts/${s.id}` })
    alerts.push(r.json.data)
  }
  const before = structuredClone(globalThis.__signalarmDemoStore)
  const alertsBefore = structuredClone(alerts)
  exerciseLab(alerts)
  assert.deepStrictEqual(globalThis.__signalarmDemoStore, before, 'memoria demo sin cambios')
  assert.deepStrictEqual(alerts, alertsBefore, 'vistas de coordinación sin cambios')
})
