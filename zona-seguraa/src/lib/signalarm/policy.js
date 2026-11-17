// lib/signalarm/policy.js — U6-A: motor de políticas del LABORATORIO (solo demo).
//
// Qué es: funciones puras que explican qué pediría o permitiría una configuración
// propuesta de comunidad, con código de motivo, explicación y versión de política.
// Qué NO es:
//   - No sustituye la autorización del servidor (API routes + domain.js deciden).
//   - No cambia estado, prioridad ni nivel. No ejecuta acciones.
//   - No es un framework de reglas: solo cubre los casos de esta demostración.
// Una política inválida NUNCA amplía nada: se usa BASE_POLICY (reglas vigentes).
// Ningún campo de la política toca roles, zonas ni permisos.
import {
  DESCRIPTION_MAX, DISMISS_REASONS, REPORT_TYPES, TRANSITIONS, canCoordinate, planTransition, validateCreateReport,
} from './domain.js'
import { reasonText } from './messages.js'

export const POLICY_ENGINE_VERSION = 'u6-lab-0.1'
const REQUIREMENT = ['optional', 'suggested', 'required']
// Urgencia REPORTADA: códigos de la spec F1 (reported_severity), aprobados por el owner 2026-11-03.
// No es nivel ni prioridad. Columna en migración 003 (preparada, no aplicada).
export const URGENCY_VALUES = ['informational', 'suspicious', 'urgent']
export const LAB_ACTIONS = {
  request_info: 'Pedir más información a quien reportó',
  mark_possible_duplicate: 'Marcar como posible duplicado',
}
export const NOT_IMPLEMENTED_ACTIONS = {
  merge: 'Fusionar reportes: no implementado; requiere modelo de incidentes (Sprint 2).',
  escalate: 'Escalar a N1–N3: no implementado; requiere validación comunitaria y reglas aprobadas.',
  notify: 'Notificar a residentes o servicios: no implementado; no hay SMS, push ni conectores oficiales.',
  auto_close: 'Cierre automático: no se propone; todo cierre lo decide una persona.',
}

// Reglas vigentes del prototipo, sin propuestas. Reflejan domain.js.
export const BASE_POLICY = Object.freeze({
  id: 'vigente',
  label: 'Reglas vigentes (prototipo)',
  version: 'vigente-2026-11-03',
  experimental: false,
  report: { description: 'optional', descriptionMinLength: 0, referencePoint: 'optional', urgency: 'optional' },
  coordination: {
    closeChecklist: [],
    dismissReasons: [...DISMISS_REASONS],
    noteRequiredFor: ['other'],
    waitingAdvisoryMinutes: null,
    labActions: [],
  },
})

// Perfiles SINTÉTICOS de diseño. No son decisiones aprobadas.
export const POLICY_PROFILES = {
  residencial: {
    label: 'Comunidad residencial (ejemplo)',
    version: 'propuesta-residencial-0.1',
    report: { description: 'suggested', urgency: 'suggested' },
    coordination: {
      closeChecklist: [
        { id: 'revise-datos', label: 'Revisé descripción y punto de referencia' },
        { id: 'similares', label: 'Busqué reportes similares en la zona' },
        { id: 'resolucion-clara', label: 'La resolución explica qué se hizo, sin datos personales' },
      ],
      noteRequiredFor: ['other', 'false_report'],
      waitingAdvisoryMinutes: 30,
      labActions: ['request_info'],
    },
  },
  evento: {
    label: 'Evento o espacio público (ejemplo)',
    version: 'propuesta-evento-0.1',
    report: { description: 'required', descriptionMinLength: 10, referencePoint: 'required', urgency: 'required' },
    coordination: {
      closeChecklist: [
        { id: 'punto', label: 'Confirmé el punto de referencia con el equipo en sitio' },
        { id: 'similares', label: 'Busqué reportes similares en la zona' },
      ],
      noteRequiredFor: ['other', 'not_actionable'],
      waitingAdvisoryMinutes: 10,
      labActions: ['request_info', 'mark_possible_duplicate'],
    },
  },
  privada: {
    label: 'Instalación privada (ejemplo)',
    version: 'propuesta-privada-0.1',
    report: { description: 'required', descriptionMinLength: 5, referencePoint: 'suggested' },
    coordination: {
      closeChecklist: [{ id: 'responsable', label: 'Informé al responsable de la instalación (fuera del sistema)' }],
      dismissReasons: ['duplicate', 'not_actionable', 'other'],
      waitingAdvisoryMinutes: 15,
      labActions: [],
    },
  },
}

const KEYS = {
  root: ['id', 'label', 'version', 'experimental', 'report', 'coordination'],
  report: ['description', 'descriptionMinLength', 'referencePoint', 'urgency'],
  coordination: ['closeChecklist', 'dismissReasons', 'noteRequiredFor', 'waitingAdvisoryMinutes', 'labActions'],
}

const meta = (policy) => ({ policyVersion: policy.version, experimental: !!policy.experimental, engine: POLICY_ENGINE_VERSION })
const reason = (code, extra = {}) => ({ code, explanation: reasonText(code), ...extra })
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)

// --- validatePolicy ----------------------------------------------------------
export function validatePolicy(policy) {
  const errors = []
  const err = (path, code, explanation) => errors.push({ path, code, explanation })
  if (!isObj(policy)) {
    err('', 'not-object', 'La política debe ser un objeto JSON.')
    return { valid: false, errors }
  }
  for (const k of Object.keys(policy)) if (!KEYS.root.includes(k)) err(k, 'unknown-key', `Clave desconocida "${k}": se rechaza para que un error de escritura no se aplique en silencio.`)
  if (typeof policy.version !== 'string' || !policy.version.trim()) err('version', 'version-missing', 'Falta la versión de la política.')

  const r = policy.report
  if (!isObj(r)) err('report', 'not-object', 'report debe ser un objeto.')
  else {
    for (const k of Object.keys(r)) if (!KEYS.report.includes(k)) err(`report.${k}`, 'unknown-key', `Clave desconocida "${k}".`)
    for (const k of ['description', 'referencePoint', 'urgency']) {
      if (!REQUIREMENT.includes(r[k])) err(`report.${k}`, 'invalid-requirement', 'Usa optional, suggested o required.')
    }
    if (!Number.isInteger(r.descriptionMinLength) || r.descriptionMinLength < 0 || r.descriptionMinLength > DESCRIPTION_MAX) {
      err('report.descriptionMinLength', 'out-of-range', `Entero entre 0 y ${DESCRIPTION_MAX}.`)
    } else if (r.descriptionMinLength > 0 && r.description === 'optional') {
      err('report.descriptionMinLength', 'inconsistent', 'Un mínimo de caracteres requiere description suggested o required.')
    }
  }

  const c = policy.coordination
  if (!isObj(c)) err('coordination', 'not-object', 'coordination debe ser un objeto.')
  else {
    for (const k of Object.keys(c)) if (!KEYS.coordination.includes(k)) err(`coordination.${k}`, 'unknown-key', `Clave desconocida "${k}".`)
    if (!Array.isArray(c.dismissReasons) || c.dismissReasons.length === 0) {
      err('coordination.dismissReasons', 'empty', 'Debe haber al menos un motivo de descarte.')
    } else {
      const bad = c.dismissReasons.filter((x) => !DISMISS_REASONS.includes(x))
      if (bad.length) err('coordination.dismissReasons', 'unknown-value', `Motivos no soportados por el servidor: ${bad.join(', ')}.`)
    }
    if (!Array.isArray(c.noteRequiredFor)) err('coordination.noteRequiredFor', 'not-array', 'Debe ser una lista.')
    else {
      if (!c.noteRequiredFor.includes('other')) err('coordination.noteRequiredFor', 'weaker-than-server', 'El servidor exige nota con el motivo "other"; la política no puede relajarlo.')
      const bad = c.noteRequiredFor.filter((x) => !DISMISS_REASONS.includes(x))
      if (bad.length) err('coordination.noteRequiredFor', 'unknown-value', `Motivos desconocidos: ${bad.join(', ')}.`)
    }
    if (!Array.isArray(c.closeChecklist)) err('coordination.closeChecklist', 'not-array', 'Debe ser una lista.')
    else {
      const ids = new Set()
      c.closeChecklist.forEach((it, i) => {
        if (!isObj(it) || typeof it.id !== 'string' || !it.id || typeof it.label !== 'string' || !it.label.trim()) {
          err(`coordination.closeChecklist[${i}]`, 'invalid-item', 'Cada punto necesita id y label.')
        } else if (ids.has(it.id)) err(`coordination.closeChecklist[${i}]`, 'duplicate-id', `id repetido "${it.id}".`)
        else ids.add(it.id)
      })
      if (c.closeChecklist.length > 8) err('coordination.closeChecklist', 'too-long', 'Máximo 8 puntos.')
    }
    const w = c.waitingAdvisoryMinutes
    if (w !== null && (!Number.isInteger(w) || w < 1 || w > 1440)) err('coordination.waitingAdvisoryMinutes', 'out-of-range', 'null o entero entre 1 y 1440.')
    if (!Array.isArray(c.labActions)) err('coordination.labActions', 'not-array', 'Debe ser una lista.')
    else {
      const bad = c.labActions.filter((x) => !(x in LAB_ACTIONS))
      if (bad.length) err('coordination.labActions', 'unknown-value', `Acciones de laboratorio desconocidas: ${bad.join(', ')}.`)
    }
  }
  return { valid: errors.length === 0, errors }
}

// --- resolvePolicy -----------------------------------------------------------
// profileId: clave de POLICY_PROFILES o 'vigente'. overrides: objeto parcial (p. ej. editado en el laboratorio).
// Resultado único para cualquier configuración inválida: BASE_POLICY explícita,
// sin la candidata rechazada (no quedan valores residuales ni acciones de laboratorio).
export function invalidPolicyResult(errors) {
  return { policy: BASE_POLICY, valid: false, fallback: 'BASE_POLICY', errors, ...reason('policy-invalid-fallback'), ...meta(BASE_POLICY) }
}

export function resolvePolicy({ profileId = 'vigente', overrides } = {}) {
  const profile = profileId === 'vigente' ? null : POLICY_PROFILES[profileId]
  if (profileId !== 'vigente' && !profile) {
    return invalidPolicyResult([{ path: 'profileId', code: 'unknown-profile', explanation: `Perfil desconocido "${profileId}".` }])
  }
  if (overrides !== undefined && overrides !== null && !isObj(overrides)) {
    return invalidPolicyResult([{ path: '', code: 'not-object', explanation: 'Los ajustes deben ser un objeto JSON.' }])
  }
  const merged = mergePolicy(mergePolicy(BASE_POLICY, profile ? { id: profileId, experimental: true, ...profile } : {}), overrides)
  // Cualquier ajuste convierte la política en experimental.
  if (isObj(overrides) && Object.keys(overrides).length) merged.experimental = true
  const { valid, errors } = validatePolicy(merged)
  if (!valid) return invalidPolicyResult(errors)
  return { policy: merged, valid, fallback: null, errors, ...reason(profile || merged.experimental ? 'policy-valid' : 'base-policy'), ...meta(merged) }
}

function mergePolicy(base, patch) {
  const out = structuredClone(base)
  if (!isObj(patch)) return out
  for (const [k, v] of Object.entries(patch)) {
    if ((k === 'report' || k === 'coordination') && isObj(v) && isObj(out[k])) out[k] = { ...out[k], ...structuredClone(v) }
    else out[k] = structuredClone(v)
  }
  return out
}

// Copia exportable: solo la configuración (no hay datos personales en la política).
export function exportPolicy(policy) {
  const { id, label, version, experimental, report, coordination } = policy
  return JSON.stringify({ id, label, version, experimental, report, coordination, engine: POLICY_ENGINE_VERSION }, null, 2)
}

// --- getRequiredFields -------------------------------------------------------
// context: 'create' | 'close' | 'dismiss'. input: { dismiss_reason } para dismiss.
export function getRequiredFields({ policy, context, input = {} }) {
  const fields = []
  const add = (field, level, code) => fields.push({ field, level, ...reason(code), experimental: level !== 'server' })
  if (context === 'create') {
    add('zone_id', 'server', 'field-required-server')
    add('type', 'server', 'field-required-server')
    const r = policy.report
    for (const [field, key] of [['description', 'description'], ['node_id', 'referencePoint'], ['urgency', 'urgency']]) {
      if (r[key] === 'required') add(field, 'policy', 'field-required-policy')
      else if (r[key] === 'suggested') add(field, 'suggested', 'field-suggested-policy')
    }
  } else if (context === 'close') {
    add('resolution', 'server', 'field-required-server')
    for (const it of policy.coordination.closeChecklist) add(`checklist.${it.id}`, 'policy', 'field-required-policy')
  } else if (context === 'dismiss') {
    add('dismiss_reason', 'server', 'field-required-server')
    if (input.dismiss_reason === 'other') add('note', 'server', 'field-required-server')
    else if (policy.coordination.noteRequiredFor.includes(input.dismiss_reason)) add('note', 'policy', 'field-required-policy')
  }
  const anyPolicy = fields.some((f) => f.level === 'policy')
  return { context, fields, ...reason(anyPolicy ? 'field-required-policy' : 'field-required-server'), ...meta(policy) }
}

// --- getAvailableActions -----------------------------------------------------
// Orientación para la interfaz. El servidor vuelve a decidir todo.
export function getAvailableActions({ policy, actor, alert, knownVersion }) {
  const base = meta(policy)
  if (!alert) return { actions: [], ...reason('no-data'), ...base }
  const gate = () => {
    if (!actor) return 'no-session'
    if (actor.role !== 'coordinator') return 'not-coordinator'
    if (!canCoordinate(actor, alert.zone_id)) return 'other-zone'
    return null
  }
  const g = gate()
  const stale = Number.isInteger(knownVersion) && knownVersion !== alert.version
  const actions = Object.entries(TRANSITIONS).map(([action, rule]) => {
    // Mismo orden que el servidor (planTransition): primero la versión, después el estado.
    const code = g || (stale ? 'version-stale' : !rule.from.includes(alert.status) ? 'status-incompatible' : 'ok')
    return { action, kind: 'real', available: code === 'ok', implemented: true, experimental: false, ...reason(code) }
  })
  for (const a of policy.coordination.labActions) {
    const open = alert.status === 'active' || alert.status === 'in_progress'
    const code = g || (!open ? 'status-incompatible' : 'lab-only')
    actions.push({ action: a, label: LAB_ACTIONS[a], kind: 'lab', available: code === 'lab-only', implemented: false, experimental: true, ...reason(code) })
  }
  for (const [a, text] of Object.entries(NOT_IMPLEMENTED_ACTIONS)) {
    actions.push({ action: a, kind: 'not-implemented', available: false, implemented: false, experimental: false, code: 'not-implemented', explanation: text })
  }
  return { actions, ...reason(g || (stale ? 'version-stale' : 'ok')), ...base }
}

// --- evaluateReportReadiness -------------------------------------------------
// draft: { zone_id, type, description, node_id, urgency }. Separa lo que bloquea
// en el servidor de lo que solo pide la política propuesta.
const PLACEHOLDER_KEY = '00000000-0000-4000-8000-000000000000'
export function evaluateReportReadiness({ policy, draft }) {
  const base = meta(policy)
  if (!isObj(draft)) return { readyForServer: false, readyForPolicy: false, findings: [], ...reason('no-data'), ...base }
  const findings = []
  const { errors } = validateCreateReport({ ...draft, client_report_id: PLACEHOLDER_KEY })
  for (const [field, message] of Object.entries(errors || {})) {
    if (field === 'client_report_id' || field === 'urgency') continue
    findings.push({ field, severity: 'blocking-server', code: 'field-invalid', explanation: message, experimental: false })
  }
  const r = policy.report
  const desc = typeof draft.description === 'string' ? draft.description.trim() : ''
  const check = (field, requirement, present, extra) => {
    if (present) return
    if (requirement === 'required') findings.push({ field, severity: 'blocking-policy', ...reason('field-required-policy'), ...(extra || {}), experimental: true })
    if (requirement === 'suggested') findings.push({ field, severity: 'suggestion', ...reason('field-suggested-policy'), experimental: true })
  }
  check('description', r.description, desc.length > 0 && desc.length >= r.descriptionMinLength,
    desc.length > 0 && desc.length < r.descriptionMinLength ? { explanation: `La configuración propuesta pide al menos ${r.descriptionMinLength} caracteres.` } : undefined)
  check('node_id', r.referencePoint, !!draft.node_id)
  if (draft.urgency !== undefined && draft.urgency !== null && draft.urgency !== '' && !URGENCY_VALUES.includes(draft.urgency)) {
    findings.push({ field: 'urgency', severity: 'blocking-policy', code: 'field-invalid', explanation: 'Urgencia no reconocida.', experimental: true })
  } else check('urgency', r.urgency, !!draft.urgency)
  const readyForServer = !findings.some((f) => f.severity === 'blocking-server')
  const readyForPolicy = readyForServer && !findings.some((f) => f.severity === 'blocking-policy')
  return { readyForServer, readyForPolicy, findings, ...reason(readyForPolicy ? 'ok' : 'field-required-policy'), ...base }
}

// --- Vista previa de transición (sin efectos) ---------------------------------
export function previewTransition({ policy, actor, alert, action, input = {}, checklist = {}, at }) {
  const base = meta(policy)
  const avail = getAvailableActions({ policy, actor, alert, knownVersion: input.expected_version })
  const a = avail.actions.find((x) => x.action === action)
  if (!a) return { ok: false, ...reason('not-implemented'), ...base }
  if (!a.available) return { ok: false, code: a.code, explanation: a.explanation, ...base }
  if (a.kind === 'lab') {
    return { ok: true, labOnly: true, event: { action: `lab.${action}`, label: a.label, from_status: alert.status, to_status: alert.status, created_at: at }, ...reason('lab-only'), ...base }
  }
  const req = getRequiredFields({ policy, context: action, input })
  const missing = req.fields.filter((f) => {
    if (f.level === 'suggested') return false
    if (f.field.startsWith('checklist.')) return !checklist[f.field.slice(10)]
    const v = input[f.field]
    return !(typeof v === 'string' ? v.trim() : v)
  })
  if (missing.length) return { ok: false, code: 'field-required', explanation: 'Faltan campos obligatorios.', missing, ...base }
  try {
    const rule = planTransition(alert, { action, expected_version: alert.version })
    return { ok: true, labOnly: false, event: { action: rule.event, from_status: alert.status, to_status: rule.to, created_at: at }, ...reason('ok'), ...base }
  } catch (e) {
    return { ok: false, code: e.code || 'error', explanation: e.message, ...base }
  }
}

// --- Aviso de espera (no cambia nada) -----------------------------------------
export function waitingAdvisory({ policy, alert, now }) {
  const min = policy.coordination.waitingAdvisoryMinutes
  if (!alert || !min || alert.status !== 'active' || !Number.isFinite(now)) return null
  const waited = Math.floor((now - Date.parse(alert.created_at)) / 60000)
  if (!(waited >= min)) return null
  return { waitedMinutes: waited, thresholdMinutes: min, ...reason('waiting-advisory'), ...meta(policy) }
}

export { REPORT_TYPES }
