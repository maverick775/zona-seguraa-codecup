// U8: contrato de eventos v1, adaptador falso, consumidor de demostración y fixtures.
import { createInProcessApi } from '../lib/inprocess-api.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import {
  CONTRACT_VERSION, EVENT_TYPES, deterministicEventId, eventsFromHistory, toEventEnvelope, validateEvent,
} from '../../src/lib/signalarm/contracts/events-v1.js'
import { createFakeEventBus, createSequenceAuditConsumer } from '../../src/lib/signalarm/contracts/fake-bus.js'
import { SEED_REPORTS, sampleViews, seedViaApi } from '../../src/lib/signalarm/scenarios.js'

console.info = () => {}
const DIR = new URL('../fixtures/events-v1/', import.meta.url)
const fixtures = Object.fromEntries(readdirSync(DIR).filter((f) => f.endsWith('.json')).map((f) => [f.replace(/\.json$/, ''), JSON.parse(readFileSync(new URL(f, DIR), 'utf8'))]))

test('fixtures válidos, inválidos y en borrador', () => {
  const names = Object.keys(fixtures)
  assert.ok(names.filter((n) => n.startsWith('valid.')).length === 4)
  for (const n of names) {
    const strict = validateEvent(fixtures[n])
    if (n.startsWith('valid.')) assert.ok(strict.valid, `${n}: ${JSON.stringify(strict.errors)}`)
    if (n.startsWith('invalid.')) assert.ok(!strict.valid, `${n} debió rechazarse`)
    if (n.startsWith('draft.')) {
      assert.equal(strict.errors[0].code, 'draft-type', `${n} se rechaza fuera de modo fixture`)
      assert.ok(validateEvent(fixtures[n], { allowDraft: true }).valid, `${n} válido como fixture`)
    }
  }
  const codes = (n) => validateEvent(fixtures[n]).errors.map((e) => e.code)
  assert.ok(codes('invalid.pii-description').includes('unknown-key'))
  assert.ok(codes('invalid.user-id-in-subject').includes('unknown-key'))
  assert.ok(codes('invalid.bad-transition').includes('bad-transition'))
  assert.ok(codes('invalid.level-escalated').includes('bad-level'))
  assert.ok(codes('invalid.major-version').includes('incompatible-version'))
  assert.ok(validateEvent({ ...fixtures['valid.report.created'], contract_version: '1.4.0' }).valid, 'menor compatible')
})

test('fixtures reproducibles desde el banco U5', () => {
  const root = new URL('../../', import.meta.url).pathname
  const before = JSON.stringify(fixtures)
  execFileSync(process.execPath, ['--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'scripts/fixtures/generate-events-v1.mjs', root], { cwd: root })
  const after = Object.fromEntries(readdirSync(DIR).filter((f) => f.endsWith('.json')).map((f) => [f.replace(/\.json$/, ''), JSON.parse(readFileSync(new URL(f, DIR), 'utf8'))]))
  assert.equal(JSON.stringify(after), before)
})

test('privacidad: ningún evento lleva descripción, nombres, correos ni ids de usuario', () => {
  for (const v of sampleViews()) {
    for (const ev of eventsFromHistory(v)) {
      const text = JSON.stringify(ev)
      assert.ok(validateEvent(ev).valid)
      assert.doesNotMatch(text, /description|display_name|actor_label|created_by|@|Ana|Luis|Coordinación/)
      if (v.description) assert.ok(!text.includes(v.description))
    }
  }
})

test('ids deterministas y únicos', () => {
  const ids = new Set()
  for (const v of sampleViews()) for (const ev of eventsFromHistory(v)) {
    assert.equal(ev.id, deterministicEventId(v.id, ev.sequence))
    assert.ok(!ids.has(ev.id)); ids.add(ev.id)
  }
})

test('recorrido real en proceso → eventos válidos, bus falso deduplica, consumidor sin hallazgos', async () => {
  const { call } = await createInProcessApi()
  const seeded = await seedViaApi(call)
  const bus = createFakeEventBus()
  const audit = createSequenceAuditConsumer()
  bus.subscribe('report.', (e) => audit.handle(e))
  let published = 0
  for (const s of SEED_REPORTS) {
    const coord = s.body.zone_id.endsWith('1') ? 'coord-liberacion' : 'coord-rotonda'
    const alert = (await call(coord, { path: `/api/coordinator/alerts/${seeded[s.key].id}` })).json.data
    for (const ev of eventsFromHistory(alert)) {
      assert.deepEqual(bus.publish(ev), { accepted: true, duplicate: false })
      published++
    }
    // Reentrega completa (al menos una vez): todo duplicado, nada nuevo.
    for (const ev of eventsFromHistory(alert)) assert.equal(bus.publish(ev).duplicate, true)
    const last = audit.state()[alert.id]
    assert.equal(last.status, s.expect, `${s.key}: el consumidor reconstruye el estado`)
  }
  assert.equal(bus.log().length, published)
  assert.deepEqual(audit.findings(), [])
  assert.deepEqual(bus.rejected(), [])
})

test('consumidor detecta huecos, desorden y cadena rota; el bus rechaza inválidos', () => {
  const v = sampleViews().find((x) => x.key === 'z1-cerrado')
  const [c, t, cl] = eventsFromHistory(v)
  const audit = createSequenceAuditConsumer()
  audit.handle(c); audit.handle(cl)
  assert.deepEqual(audit.findings().map((f) => f.code), ['gap', 'broken-chain'])
  audit.handle(t)
  assert.ok(audit.findings().some((f) => f.code === 'out-of-order'))
  const bus = createFakeEventBus()
  assert.equal(bus.publish(fixtures['invalid.pii-description']).accepted, false)
  assert.equal(bus.publish(fixtures['draft.device.signal.received']).accepted, false)
  assert.equal(createFakeEventBus({ allowDraft: true }).publish(fixtures['draft.device.signal.received']).accepted, true)
  assert.equal(bus.log().length, 0)
})

test('tipos y versión documentados', () => {
  assert.match(CONTRACT_VERSION, /^\d+\.\d+\.\d+$/)
  assert.deepEqual(Object.entries(EVENT_TYPES).filter(([, s]) => s.stability === 'stable').map(([k]) => k),
    ['report.created', 'report.taken', 'report.closed', 'report.dismissed'])
  // Un evento de historial con urgencia (003) la conserva.
  const v = sampleViews()[0]
  const ev = toEventEnvelope({ ...v, reported_severity: 'urgent' }, v.history[0])
  assert.equal(ev.data.reported_severity, 'urgent')
  assert.ok(validateEvent(ev).valid)
})
