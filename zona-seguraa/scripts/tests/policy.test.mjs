// U6: motor de políticas del laboratorio y catálogo de mensajes (funciones puras).
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  BASE_POLICY, POLICY_PROFILES, evaluateReportReadiness, exportPolicy, getAvailableActions, getRequiredFields,
  previewTransition, resolvePolicy, validatePolicy, waitingAdvisory,
} from '../../src/lib/signalarm/policy.js'
import { RESIDENT_MESSAGES, guidanceFor } from '../../src/lib/signalarm/messages.js'
import { DEMO_PERSONAS } from '../../src/lib/signalarm/config.js'
import { ZONE, sampleViews } from '../../src/lib/signalarm/scenarios.js'

const P = Object.fromEntries(DEMO_PERSONAS.map((p) => [p.key, p]))
const views = Object.fromEntries(sampleViews().map((v) => [v.key, v]))
const hasMeta = (r) => typeof r.policyVersion === 'string' && typeof r.experimental === 'boolean'

test('perfiles: los tres y la base son válidos; perfiles marcados experimentales', () => {
  assert.equal(validatePolicy(BASE_POLICY).valid, true)
  for (const id of Object.keys(POLICY_PROFILES)) {
    const r = resolvePolicy({ profileId: id })
    assert.equal(r.valid, true, `${id}: ${JSON.stringify(r.errors)}`)
    assert.equal(r.experimental, true)
    assert.equal(r.code, 'policy-valid')
  }
  const base = resolvePolicy()
  assert.equal(base.experimental, false)
  assert.equal(base.code, 'base-policy')
})

test('configuración inválida → reglas vigentes, sin acciones de laboratorio', () => {
  const cases = [
    { coordination: { dismissReasons: ['borrar_todo'] } },
    { coordination: { noteRequiredFor: [] } },              // relajar el servidor
    { coordination: { labActions: ['escalate'] } },          // acción no permitida
    { report: { descriptionMinLength: 9999, description: 'required' } },
    { report: { description: 'optional', descriptionMinLength: 5 } }, // inconsistente
    { permisos: { todos: true } },                           // clave desconocida
    { coordination: { waitingAdvisoryMinutes: 0 } },
    { coordination: { closeChecklist: [{ id: 'a', label: 'x' }, { id: 'a', label: 'y' }] } },
  ]
  for (const overrides of cases) {
    const r = resolvePolicy({ profileId: 'evento', overrides })
    assert.equal(r.valid, false, JSON.stringify(overrides))
    assert.equal(r.code, 'policy-invalid-fallback')
    assert.equal(r.fallback, 'BASE_POLICY')
    assert.match(r.explanation, /BASE_POLICY/)
    assert.equal(r.policy, BASE_POLICY)
    assert.equal(r.experimental, false)
    assert.equal(r.policyVersion, BASE_POLICY.version)
    assert.ok(!('candidate' in r), 'no expone la candidata rechazada')
    // Sin valores residuales del perfil ni de los ajustes.
    assert.deepEqual(r.policy.coordination.labActions, [])
    assert.deepEqual(r.policy.coordination.closeChecklist, [])
    assert.equal(r.policy.coordination.waitingAdvisoryMinutes, null)
    assert.equal(r.policy.report.description, 'optional')
    const acts = getAvailableActions({ policy: r.policy, actor: P['coord-liberacion'], alert: views['z1-abierto'] }).actions
    assert.ok(!acts.some((a) => a.kind === 'lab'), 'sin acciones experimentales')
    assert.ok(r.errors.length >= 1 && r.errors.every((e) => e.code && e.explanation))
  }
  assert.equal(resolvePolicy({ profileId: 'inexistente' }).code, 'policy-invalid-fallback')
  assert.equal(resolvePolicy({ overrides: [] }).valid, false)
  assert.equal(validatePolicy(null).valid, false)
})

test('cualquier ajuste vuelve experimental la política', () => {
  const r = resolvePolicy({ overrides: { coordination: { waitingAdvisoryMinutes: 20 } } })
  assert.equal(r.valid, true)
  assert.equal(r.experimental, true)
})

test('campos requeridos: servidor vs propuesta', () => {
  const evento = resolvePolicy({ profileId: 'evento' }).policy
  const create = getRequiredFields({ policy: evento, context: 'create' })
  assert.ok(hasMeta(create))
  const lv = Object.fromEntries(create.fields.map((f) => [f.field, f.level]))
  assert.deepEqual(lv, { zone_id: 'server', type: 'server', description: 'policy', node_id: 'policy', urgency: 'policy' })
  const base = getRequiredFields({ policy: BASE_POLICY, context: 'create' })
  assert.deepEqual(base.fields.map((f) => f.field), ['zone_id', 'type'])
  const res = resolvePolicy({ profileId: 'residencial' }).policy
  assert.equal(getRequiredFields({ policy: res, context: 'dismiss', input: { dismiss_reason: 'other' } }).fields.find((f) => f.field === 'note').level, 'server')
  assert.equal(getRequiredFields({ policy: res, context: 'dismiss', input: { dismiss_reason: 'false_report' } }).fields.find((f) => f.field === 'note').level, 'policy')
  assert.equal(getRequiredFields({ policy: BASE_POLICY, context: 'dismiss', input: { dismiss_reason: 'duplicate' } }).fields.length, 1)
  assert.equal(getRequiredFields({ policy: res, context: 'close' }).fields.length, 1 + 3)
})

test('preparación del reporte: bloqueos del servidor separados de la propuesta', () => {
  const evento = resolvePolicy({ profileId: 'evento' }).policy
  const empty = evaluateReportReadiness({ policy: evento, draft: {} })
  assert.equal(empty.readyForServer, false)
  assert.ok(empty.findings.some((f) => f.field === 'type' && f.severity === 'blocking-server'))
  const minimal = { zone_id: ZONE.liberacion, type: 'security' }
  const r1 = evaluateReportReadiness({ policy: evento, draft: minimal })
  assert.equal(r1.readyForServer, true)
  assert.equal(r1.readyForPolicy, false)
  assert.deepEqual(r1.findings.map((f) => f.field).sort(), ['description', 'node_id', 'urgency'])
  assert.ok(r1.findings.every((f) => f.experimental))
  const short = evaluateReportReadiness({ policy: evento, draft: { ...minimal, description: 'humo', node_id: 'b1000000-0000-0000-0000-000000000001', urgency: 'urgent' } })
  assert.match(short.findings[0].explanation, /al menos 10/)
  assert.equal(short.findings.length, 1, 'urgent es un código válido de la spec F1')
  assert.equal(evaluateReportReadiness({ policy: evento, draft: { ...minimal, urgency: 'urgente' } }).findings.find((f) => f.field === 'urgency').code, 'field-invalid', 'la etiqueta en español no es un código')
  const base = evaluateReportReadiness({ policy: BASE_POLICY, draft: minimal })
  assert.equal(base.readyForPolicy, true)
  assert.equal(base.findings.length, 0)
  assert.equal(evaluateReportReadiness({ policy: evento, draft: { ...minimal, urgency: 'altísima' } }).findings.find((f) => f.field === 'urgency').code, 'field-invalid')
  const res = evaluateReportReadiness({ policy: resolvePolicy({ profileId: 'residencial' }).policy, draft: minimal })
  assert.equal(res.readyForPolicy, true)
  assert.ok(res.findings.every((f) => f.severity === 'suggestion'))
  assert.equal(evaluateReportReadiness({ policy: evento, draft: null }).code, 'no-data')
})

test('acciones: rol, zona, estado y versión (misma lógica que el servidor, solo orientativa)', () => {
  const policy = resolvePolicy({ profileId: 'evento' }).policy
  const byAction = (r) => Object.fromEntries(r.actions.map((a) => [a.action, a]))
  const open = views['z1-abierto']
  assert.equal(getAvailableActions({ policy, actor: null, alert: open }).code, 'no-session')
  assert.equal(byAction(getAvailableActions({ policy, actor: P['residente-ana'], alert: open })).take.code, 'not-coordinator')
  assert.equal(byAction(getAvailableActions({ policy, actor: P['coord-rotonda'], alert: open })).take.code, 'other-zone')
  const ok = byAction(getAvailableActions({ policy, actor: P['coord-liberacion'], alert: open, knownVersion: open.version }))
  assert.equal(ok.take.available, true)
  assert.equal(ok.close.code, 'status-incompatible')
  assert.equal(ok.request_info.code, 'lab-only')
  assert.equal(ok.request_info.implemented, false)
  for (const a of ['merge', 'escalate', 'notify', 'auto_close']) assert.equal(ok[a].available, false)
  const stale = byAction(getAvailableActions({ policy, actor: P['coord-liberacion'], alert: open, knownVersion: open.version - 1 + 5 }))
  assert.equal(stale.take.code, 'version-stale')
  const closed = byAction(getAvailableActions({ policy, actor: P['coord-liberacion'], alert: views['z1-cerrado'] }))
  assert.ok(['take', 'close', 'dismiss', 'request_info'].every((a) => closed[a].code === 'status-incompatible'))
  assert.equal(getAvailableActions({ policy, actor: P['coord-liberacion'], alert: null }).code, 'no-data')
  // Base: sin acciones de laboratorio.
  assert.ok(!getAvailableActions({ policy: BASE_POLICY, actor: P['coord-liberacion'], alert: open }).actions.some((a) => a.kind === 'lab'))
})

test('vista previa: exige checklist propuesta, no muta el reporte', () => {
  const policy = resolvePolicy({ profileId: 'residencial' }).policy
  const alert = views['z1-atencion']
  const snapshot = JSON.stringify(alert)
  const actor = P['coord-liberacion']
  const missing = previewTransition({ policy, actor, alert, action: 'close', input: { resolution: 'Listo' }, checklist: { 'revise-datos': true } })
  assert.equal(missing.ok, false)
  assert.deepEqual(missing.missing.map((f) => f.field), ['checklist.similares', 'checklist.resolucion-clara'])
  const done = previewTransition({ policy, actor, alert, action: 'close', input: { resolution: 'Listo' }, checklist: { 'revise-datos': 1, similares: 1, 'resolucion-clara': 1 }, at: 'T' })
  assert.equal(done.ok, true)
  assert.deepEqual([done.event.from_status, done.event.to_status], ['in_progress', 'resolved'])
  assert.equal(previewTransition({ policy, actor, alert, action: 'close', input: { resolution: 'x', expected_version: 1 } }).code, 'version-stale')
  assert.equal(previewTransition({ policy, actor, alert, action: 'request_info' }).labOnly, true)
  assert.equal(previewTransition({ policy, actor, alert, action: 'escalate' }).code, 'not-implemented')
  assert.equal(JSON.stringify(alert), snapshot)
})

test('aviso de espera: solo informativo y solo para abiertos', () => {
  const policy = resolvePolicy({ profileId: 'evento' }).policy
  const open = views['z1-abierto']
  const t0 = Date.parse(open.created_at)
  assert.equal(waitingAdvisory({ policy, alert: open, now: t0 + 9 * 60000 }), null)
  const w = waitingAdvisory({ policy, alert: open, now: t0 + 12 * 60000 })
  assert.equal(w.code, 'waiting-advisory')
  assert.equal(w.waitedMinutes, 12)
  assert.equal(waitingAdvisory({ policy: BASE_POLICY, alert: open, now: t0 + 999 * 60000 }), null)
  assert.equal(waitingAdvisory({ policy, alert: views['z1-atencion'], now: t0 + 999 * 60000 }), null)
  assert.equal(waitingAdvisory({ policy, alert: open, now: NaN }), null)
})

test('determinismo: mismas entradas → mismas salidas', () => {
  for (let i = 0; i < 3; i++) {
    const args = { profileId: 'evento', overrides: { coordination: { waitingAdvisoryMinutes: 12 } } }
    assert.deepEqual(resolvePolicy(args), resolvePolicy(args))
    const policy = resolvePolicy(args).policy
    const a = { policy, actor: P['coord-liberacion'], alert: views['z1-abierto'], knownVersion: 1 }
    assert.deepEqual(getAvailableActions(a), getAvailableActions(a))
    assert.equal(exportPolicy(policy), exportPolicy(policy))
  }
})

test('exportación: solo configuración, sin datos personales', () => {
  const json = JSON.parse(exportPolicy(resolvePolicy({ profileId: 'residencial' }).policy))
  assert.deepEqual(Object.keys(json).sort(), ['coordination', 'engine', 'experimental', 'id', 'label', 'report', 'version'])
  assert.doesNotMatch(JSON.stringify(json), /@|residente|Ana|Luis|user/i)
})

test('mensajes: sin promesas de ayuda, tiempos ni indicaciones', () => {
  const all = Object.values(RESIDENT_MESSAGES).map((m) => `${m.title} ${m.body}`).join(' ')
  assert.doesNotMatch(all, /ayuda (va|está) en camino|llegar[áa]n|en \d+ ?min|te contactar|garantizamos|aplica presión|torniquete|evacúa/i)
  const codes = (args) => guidanceFor(args).map((m) => m.code)
  assert.ok(codes({ phase: 'submitted' }).includes('received-not-attended'))
  assert.ok(codes({ phase: 'send-failed' }).includes('network-unavailable'))
  assert.ok(codes({ phase: 'follow-up', status: 'resolved' }).includes('closed-not-guarantee'))
  assert.ok(codes({ phase: 'follow-up', status: 'raro' }).includes('status-unknown'))
  assert.ok(codes({ phase: 'follow-up', status: 'active', isDemo: true }).includes('demo-limits'))
  for (const phase of ['draft', 'submitted', 'send-failed', 'follow-up', 'unknown']) assert.ok(codes({ phase }).includes('emergency-911'), phase)
})

test('todo resultado lleva versión de política e indicador experimental', () => {
  const policy = resolvePolicy({ profileId: 'privada' }).policy
  const actor = P['coord-liberacion']; const alert = views['z1-abierto']
  for (const r of [
    resolvePolicy({ profileId: 'privada' }), getRequiredFields({ policy, context: 'create' }),
    getAvailableActions({ policy, actor, alert }), evaluateReportReadiness({ policy, draft: {} }),
    previewTransition({ policy, actor, alert, action: 'take' }),
  ]) {
    assert.ok(hasMeta(r)); assert.equal(r.policyVersion, 'propuesta-privada-0.1'); assert.equal(r.experimental, true)
    assert.ok(r.code && r.explanation)
  }
})
