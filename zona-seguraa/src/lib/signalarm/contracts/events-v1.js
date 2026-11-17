// lib/signalarm/contracts/events-v1.js — U8: contrato versionado de eventos de Signalarm.
// v1 cubre el recorrido N0 que YA existe (alert_events): creado, tomado, cerrado, descartado.
// Señales y comandos de dispositivos quedan como BORRADOR (solo fixtures, sin ThingsBoard real).
//
// Privacidad: el sobre NO lleva descripción, nombres, correos ni ids de usuario. Solo el rol.
// Validador escrito a mano (sin dependencias); los esquemas JSON se exportan como documentación.

export const CONTRACT = 'signalarm.events'
export const CONTRACT_VERSION = '1.0.0'
export const SPEC_VERSION = '1.0'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/
const STATUSES = ['active', 'in_progress', 'resolved', 'false_alarm']
const REPORT_TYPES = ['medical', 'security', 'fire', 'evacuation']
const DISMISS_REASONS = ['false_report', 'duplicate', 'not_actionable', 'other']
const SEVERITIES = ['informational', 'suspicious', 'urgent']

// Tipos estables (derivados de alert_events.action) y su transición esperada.
export const EVENT_TYPES = {
  'report.created': { stability: 'stable', from: null, to: 'active', actor_role: 'resident' },
  'report.taken': { stability: 'stable', from: ['active'], to: 'in_progress', actor_role: 'coordinator' },
  'report.closed': { stability: 'stable', from: ['in_progress'], to: 'resolved', actor_role: 'coordinator' },
  'report.dismissed': { stability: 'stable', from: ['active', 'in_progress'], to: 'false_alarm', actor_role: 'coordinator' },
  // Borradores: solo fixtures; no los produce ni consume nada real.
  'device.signal.received': { stability: 'draft' },
  'device.command.requested': { stability: 'draft' },
}

const ENVELOPE_KEYS = ['spec_version', 'contract', 'contract_version', 'id', 'type', 'source', 'occurred_at', 'subject', 'sequence', 'zone_id', 'data']
const DATA_KEYS = {
  'report.created': ['level', 'report_type', 'status_from', 'status_to', 'actor_role', 'has_reference_point', 'reported_severity'],
  'report.taken': ['level', 'report_type', 'status_from', 'status_to', 'actor_role'],
  'report.closed': ['level', 'report_type', 'status_from', 'status_to', 'actor_role', 'has_resolution'],
  'report.dismissed': ['level', 'report_type', 'status_from', 'status_to', 'actor_role', 'dismiss_reason'],
  'device.signal.received': ['device_kind', 'signal', 'path', 'fixture_only'],
  'device.command.requested': ['device_kind', 'command', 'request_id', 'fixture_only'],
}

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)

// Devuelve { valid, errors: [{ path, code, message }] }. No lanza.
export function validateEvent(ev, { allowDraft = false } = {}) {
  const errors = []
  const e = (path, code, message) => errors.push({ path, code, message })
  if (!isObj(ev)) return { valid: false, errors: [{ path: '', code: 'not-object', message: 'El evento debe ser un objeto' }] }
  for (const k of Object.keys(ev)) if (!ENVELOPE_KEYS.includes(k)) e(k, 'unknown-key', `Clave no permitida: ${k}`)
  if (ev.spec_version !== SPEC_VERSION) e('spec_version', 'bad-version', `Debe ser ${SPEC_VERSION}`)
  if (ev.contract !== CONTRACT) e('contract', 'bad-contract', `Debe ser ${CONTRACT}`)
  if (typeof ev.contract_version !== 'string' || ev.contract_version.split('.')[0] !== CONTRACT_VERSION.split('.')[0]) {
    e('contract_version', 'incompatible-version', `Mayor compatible: ${CONTRACT_VERSION.split('.')[0]}`)
  }
  if (!UUID.test(ev.id || '')) e('id', 'bad-uuid', 'id debe ser UUID')
  if (typeof ev.source !== 'string' || !ev.source) e('source', 'required', 'Falta source')
  if (!ISO.test(ev.occurred_at || '') || Number.isNaN(Date.parse(ev.occurred_at))) e('occurred_at', 'bad-date', 'Fecha ISO 8601 con zona')
  const spec = EVENT_TYPES[ev.type]
  if (!spec) e('type', 'unknown-type', `Tipo desconocido: ${ev.type}`)
  else if (spec.stability === 'draft' && !allowDraft) e('type', 'draft-type', 'Tipo en borrador: solo válido como fixture')

  const isReport = ev.type?.startsWith('report.')
  if (!isObj(ev.subject)) e('subject', 'required', 'Falta subject')
  else {
    const kind = isReport ? 'report' : 'device'
    if (ev.subject.kind !== kind) e('subject.kind', 'bad-kind', `Debe ser ${kind}`)
    if (!UUID.test(ev.subject.id || '')) e('subject.id', 'bad-uuid', 'subject.id debe ser UUID')
    for (const k of Object.keys(ev.subject)) if (!['kind', 'id'].includes(k)) e(`subject.${k}`, 'unknown-key', `Clave no permitida: ${k}`)
  }
  if (isReport) {
    if (!Number.isInteger(ev.sequence) || ev.sequence < 1) e('sequence', 'bad-sequence', 'Entero ≥ 1 (seq del historial)')
    if (!UUID.test(ev.zone_id || '')) e('zone_id', 'bad-uuid', 'zone_id debe ser UUID')
  }

  const d = ev.data
  if (!isObj(d)) e('data', 'required', 'Falta data')
  else if (spec) {
    for (const k of Object.keys(d)) if (!(DATA_KEYS[ev.type] || []).includes(k)) e(`data.${k}`, 'unknown-key', `Clave no permitida en ${ev.type}: ${k}`)
    if (isReport) {
      if (d.level !== 0) e('data.level', 'bad-level', 'v1 solo cubre N0 (level 0)')
      if (!REPORT_TYPES.includes(d.report_type)) e('data.report_type', 'bad-enum', 'Tipo de reporte inválido')
      if (d.actor_role !== spec.actor_role) e('data.actor_role', 'bad-role', `Debe ser ${spec.actor_role}`)
      if (d.status_to !== spec.to) e('data.status_to', 'bad-transition', `Debe ser ${spec.to}`)
      if (spec.from === null ? d.status_from !== null : !spec.from.includes(d.status_from)) e('data.status_from', 'bad-transition', 'Estado de origen inválido')
      if (ev.type === 'report.created') {
        if (ev.sequence !== 1) e('sequence', 'bad-sequence', 'report.created debe ser sequence 1')
        if (typeof d.has_reference_point !== 'boolean') e('data.has_reference_point', 'required', 'Booleano requerido')
        if (d.reported_severity !== null && d.reported_severity !== undefined && !SEVERITIES.includes(d.reported_severity)) e('data.reported_severity', 'bad-enum', 'Urgencia inválida')
      }
      if (ev.type === 'report.closed' && d.has_resolution !== true) e('data.has_resolution', 'required', 'Un cierre siempre tiene resolución')
      if (ev.type === 'report.dismissed' && !DISMISS_REASONS.includes(d.dismiss_reason)) e('data.dismiss_reason', 'bad-enum', 'Motivo inválido')
    } else if (d.fixture_only !== true) e('data.fixture_only', 'required', 'Los tipos en borrador deben marcarse fixture_only: true')
  }
  return { valid: errors.length === 0, errors }
}

// Convierte un evento del historial (alert_events / vista de coordinación) en un sobre v1.
// `idFor` permite ids deterministas en pruebas; por omisión se derivan de alerta+seq.
export function toEventEnvelope(alert, historyEvent, { source = 'signalarm-core' } = {}) {
  const data = {
    level: alert.level,
    report_type: alert.type,
    status_from: historyEvent.from_status ?? null,
    status_to: historyEvent.to_status,
    actor_role: historyEvent.actor_role,
  }
  if (historyEvent.action === 'report.created') {
    data.has_reference_point = !!(historyEvent.data?.node_id ?? alert.node_id ?? alert.node)
    data.reported_severity = historyEvent.data?.reported_severity ?? alert.reported_severity ?? null
  }
  if (historyEvent.action === 'report.closed') data.has_resolution = !!historyEvent.data?.resolution
  if (historyEvent.action === 'report.dismissed') data.dismiss_reason = historyEvent.data?.dismiss_reason
  return {
    spec_version: SPEC_VERSION,
    contract: CONTRACT,
    contract_version: CONTRACT_VERSION,
    id: deterministicEventId(alert.id, historyEvent.seq),
    type: historyEvent.action,
    source,
    occurred_at: new Date(historyEvent.created_at).toISOString(),
    subject: { kind: 'report', id: alert.id },
    sequence: historyEvent.seq,
    zone_id: alert.zone_id,
    data,
  }
}

// id estable por (reporte, seq): reprocesar el historial produce los mismos ids → deduplicable.
// Dos FNV-1a de 64 bits con semillas distintas (síncrono, sin dependencias). No es criptográfico.
function fnv64(str, seed) {
  let h = seed
  for (let i = 0; i < str.length; i++) {
    h ^= BigInt(str.charCodeAt(i))
    h = (h * 0x100000001b3n) & 0xffffffffffffffffn
  }
  return h.toString(16).padStart(16, '0')
}
export function deterministicEventId(alertId, seq) {
  const key = `${String(alertId).toLowerCase()}:${seq}`
  const hex = fnv64(key, 0xcbf29ce484222325n) + fnv64(key, 0x84222325cbf29ce4n)
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`
}

export function eventsFromHistory(alert) {
  return (alert.history || []).map((h) => toEventEnvelope(alert, h))
}
