// Pruebas de reglas puras y del repositorio en memoria (misma semántica que el SQL).
// Ejecutar desde zona-seguraa/: node --test scripts/tests/*.test.mjs  (node:test, sin dependencias)
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  validateCreateReport, validateTransition, reportPayloadHash, canCoordinate, toReporterView,
} from '../../src/lib/signalarm/domain.js'
import { createMemoryRepository } from '../../src/lib/signalarm/repo-memory.js'

const ZONE1 = 'a1000000-0000-0000-0000-000000000001'
const ZONE2 = 'a1000000-0000-0000-0000-000000000002'
const NODE_Z1 = 'b1000000-0000-0000-0000-000000000001'
const NODE_Z2 = 'b1000000-0000-0000-0000-000000000006'
const resident = { userId: 'u-res', displayName: 'Ana', role: 'resident', zoneIds: [] }
const coord = { userId: 'u-coord', coordId: 'c-1', displayName: 'Coord', role: 'coordinator', zoneIds: [ZONE1] }

const body = (over = {}) => ({ client_report_id: crypto.randomUUID(), zone_id: ZONE1, type: 'security', ...over })

async function create(repo, b, actor = resident) {
  const { value, errors } = validateCreateReport(b)
  assert.equal(errors, undefined)
  return repo.createReport({ actor, value, payloadHash: await reportPayloadHash(value) })
}

test('validación: N0 sin nodo es válido y se ignoran campos de identidad', () => {
  const { value, errors } = validateCreateReport(body({ created_by: 'otro', created_by_nick: 'X', role: 'coordinator', level: 3 }))
  assert.equal(errors, undefined)
  assert.equal(value.node_id, null)
  assert.deepEqual(Object.keys(value).sort(), ['client_report_id', 'description', 'node_id', 'type', 'zone_id'])
})

test('validación: rechaza tipo, zona, clave y descripción inválidos', () => {
  const { errors } = validateCreateReport({ client_report_id: 'x', zone_id: 'y', type: 'robo', description: 'a'.repeat(501) })
  assert.deepEqual(Object.keys(errors).sort(), ['client_report_id', 'description', 'type', 'zone_id'])
  assert.ok(validateCreateReport(null).errors)
  assert.ok(validateCreateReport([]).errors)
})

test('hash del cuerpo: estable ante orden de claves y espacios en descripción', async () => {
  const a = validateCreateReport(body({ description: '  hola ' })).value
  const b = { type: a.type, zone_id: a.zone_id, description: 'hola', node_id: null, client_report_id: 'otro' }
  assert.equal(await reportPayloadHash(a), await reportPayloadHash(b))
})

test('crear N0: nivel 0, estado activo, historial seq 1', async () => {
  const repo = createMemoryRepository()
  const { alert, replayed } = await create(repo, body())
  assert.equal(alert.level, 0)
  assert.equal(alert.status, 'active')
  assert.equal(alert.version, 1)
  assert.equal(replayed, false)
  const events = await repo.listEvents(alert.id)
  assert.deepEqual(events.map((e) => [e.seq, e.action]), [[1, 'report.created']])
})

test('idempotencia: mismo cuerpo → mismo id; otro cuerpo → 409', async () => {
  const repo = createMemoryRepository()
  const b = body()
  const first = await create(repo, b)
  const again = await create(repo, { ...b })
  assert.equal(again.alert.id, first.alert.id)
  assert.equal(again.replayed, true)
  assert.equal((await repo.listReportsByUser(resident.userId)).length, 1)
  await assert.rejects(create(repo, { ...b, type: 'fire' }), { status: 409, code: 'idempotency-mismatch' })
  // La misma clave de OTRO usuario es independiente.
  const other = await create(repo, { ...b }, { ...resident, userId: 'u-otro' })
  assert.notEqual(other.alert.id, first.alert.id)
})

test('zona inexistente → 404; nodo de otra zona → 400', async () => {
  const repo = createMemoryRepository()
  await assert.rejects(create(repo, body({ zone_id: 'ffffffff-0000-0000-0000-000000000000' })), { status: 404 })
  await assert.rejects(create(repo, body({ node_id: NODE_Z2 })), { status: 400, code: 'node-not-in-zone' })
  const ok = await create(repo, body({ node_id: NODE_Z1 }))
  assert.equal(ok.alert.node.id, NODE_Z1)
})

test('transiciones: take → close con versión, historial y conflicto 409', async () => {
  const repo = createMemoryRepository()
  const { alert } = await create(repo, body())
  const t = (b) => repo.transition({ alertId: alert.id, actor: coord, value: validateTransition(b).value })

  await assert.rejects(t({ action: 'close', expected_version: 1, resolution: 'x' }), { status: 422 })
  const taken = await t({ action: 'take', expected_version: 1 })
  assert.equal(taken.status, 'in_progress')
  assert.equal(taken.version, 2)
  assert.equal(taken.attended_by, 'c-1')
  await assert.rejects(t({ action: 'close', expected_version: 1, resolution: 'x' }), { status: 409, code: 'version-conflict' })
  const closed = await t({ action: 'close', expected_version: 2, resolution: 'Atendido en sitio' })
  assert.equal(closed.status, 'resolved')
  assert.ok(closed.resolved_at)
  const events = await repo.listEvents(alert.id)
  assert.deepEqual(events.map((e) => `${e.seq}:${e.action}:${e.from_status}>${e.to_status}`), [
    '1:report.created:null>active',
    '2:report.taken:active>in_progress',
    '3:report.closed:in_progress>resolved',
  ])
  // Estados finales no aceptan más acciones.
  await assert.rejects(t({ action: 'dismiss', expected_version: 3, dismiss_reason: 'duplicate' }), { status: 422 })
})

test('validación de transición: close exige resolución; dismiss exige motivo y nota si es other', () => {
  assert.ok(validateTransition({ action: 'close', expected_version: 1 }).errors.resolution)
  assert.ok(validateTransition({ action: 'dismiss', expected_version: 1 }).errors.dismiss_reason)
  assert.ok(validateTransition({ action: 'dismiss', expected_version: 1, dismiss_reason: 'other' }).errors.note)
  assert.ok(validateTransition({ action: 'take' }).errors.expected_version)
  assert.ok(validateTransition({ action: 'escalate', expected_version: 1 }).errors.action)
  assert.equal(validateTransition({ action: 'dismiss', expected_version: 2, dismiss_reason: 'duplicate' }).errors, undefined)
})

test('autorización por zona y vista reducida del reportante', async () => {
  assert.equal(canCoordinate(coord, ZONE1), true)
  assert.equal(canCoordinate(coord, ZONE2), false)
  assert.equal(canCoordinate({ ...resident, zoneIds: [ZONE1] }, ZONE1), false)
  const repo = createMemoryRepository()
  const { alert } = await create(repo, body())
  const view = toReporterView(alert)
  for (const k of ['created_by', 'created_by_nick', 'client_report_id', 'resolution', 'attended_by', 'version']) {
    assert.equal(k in view, false, k)
  }
})

import { validateVote, voteRoleFor } from '../../src/lib/signalarm/domain.js'

test('votos: solo alert_id y comment; rol y peso salen de la sesión', async () => {
  const { value } = validateVote({ alert_id: ZONE1, comment: ' ok ', nickname: 'Falso', role: 'coordinator', weight: 99 })
  assert.deepEqual(value, { alert_id: ZONE1, comment: 'ok' })
  assert.deepEqual(voteRoleFor(resident, { zone_id: ZONE1 }), { role: 'visitor', weight: 1 })
  assert.deepEqual(voteRoleFor(coord, { zone_id: ZONE1 }), { role: 'coordinator', weight: 2 })
  assert.deepEqual(voteRoleFor(coord, { zone_id: ZONE2 }), { role: 'visitor', weight: 1 }, 'coordinador de otra zona pesa 1')
})

test('votos: uno por usuario, alerta cerrada → 422, nivel sin cambios', async () => {
  const repo = createMemoryRepository()
  const { alert } = await create(repo, body())
  const v = validateVote({ alert_id: alert.id }).value
  for (const u of ['a', 'b', 'c', 'd']) await repo.addVote({ actor: { ...resident, userId: u }, value: v })
  await assert.rejects(repo.addVote({ actor: { ...resident, userId: 'a' }, value: v }), { status: 409, code: 'already-voted' })
  assert.equal((await repo.getAlert(alert.id)).level, 0, 'los votos no escalan')
  await repo.transition({ alertId: alert.id, actor: coord, value: validateTransition({ action: 'dismiss', expected_version: 1, dismiss_reason: 'duplicate' }).value })
  await assert.rejects(repo.addVote({ actor: { ...resident, userId: 'z' }, value: v }), { status: 422 })
})
