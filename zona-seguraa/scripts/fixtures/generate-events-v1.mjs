// Regenera los fixtures de eventos v1 desde el banco U5 (deterministas).
// Uso (desde zona-seguraa/): node scripts/fixtures/generate-events-v1.mjs "$PWD"
import { writeFileSync } from 'node:fs'
const root = process.argv[2]
const { sampleViews } = await import(`${root}/src/lib/signalarm/scenarios.js`)
const { eventsFromHistory } = await import(`${root}/src/lib/signalarm/contracts/events-v1.js`)
const out = `${root}/scripts/fixtures/events-v1`
const views = Object.fromEntries(sampleViews().map((v) => [v.key, v]))
const w = (name, obj) => writeFileSync(`${out}/${name}.json`, JSON.stringify(obj, null, 2) + '\n')
const closed = eventsFromHistory(views['z1-cerrado'])
const dismissed = eventsFromHistory(views['z1-descartado'])
w('valid.report.created', closed[0]); w('valid.report.taken', closed[1]); w('valid.report.closed', closed[2]); w('valid.report.dismissed', dismissed[1])
w('invalid.pii-description', { ...closed[0], data: { ...closed[0].data, description: 'Juan Pérez, tel 33 1234 5678' } })
w('invalid.user-id-in-subject', { ...closed[0], subject: { ...closed[0].subject, created_by: 'd0000000-0000-4000-8000-0000000000a1' } })
w('invalid.bad-transition', { ...closed[2], data: { ...closed[2].data, status_from: 'active' } })
w('invalid.level-escalated', { ...closed[1], data: { ...closed[1].data, level: 3 } })
w('invalid.major-version', { ...closed[0], contract_version: '2.0.0' })
const dev = { spec_version: '1.0', contract: 'signalarm.events', contract_version: '1.0.0', occurred_at: '2026-11-03T18:05:00Z', source: 'fixture:fake-gateway' }
w('draft.device.signal.received', { ...dev, id: 'f1000000-0000-4000-8000-000000000001', type: 'device.signal.received', subject: { kind: 'device', id: 'b1000000-0000-0000-0000-000000000002' }, data: { device_kind: 'avp_simulated', signal: 'button_press', path: 'lora', fixture_only: true } })
w('draft.device.command.requested', { ...dev, id: 'f1000000-0000-4000-8000-000000000002', type: 'device.command.requested', subject: { kind: 'device', id: 'b1000000-0000-0000-0000-000000000002' }, data: { device_kind: 'avp_simulated', command: 'siren_test_silent', request_id: 'f1000000-0000-4000-8000-0000000000aa', fixture_only: true } })
console.log('ok')
