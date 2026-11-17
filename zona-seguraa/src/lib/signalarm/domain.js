// lib/signalarm/domain.js
// Reglas de negocio puras del reporte N0 y de las transiciones del coordinador.
// Sin dependencias de Next ni Supabase (se prueba con `node --test`).

export const REPORT_TYPES = ['medical', 'security', 'fire', 'evacuation']
export const DISMISS_REASONS = ['false_report', 'duplicate', 'not_actionable', 'other']
export const DESCRIPTION_MAX = 500
export const RESOLUTION_MAX = 1000
export const NOTE_MAX = 500
export const N0_LEVEL = 0

// Forma genérica 8-4-4-4-12: los ids del seed (a1000000-0000-0000-...) no son v4.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const TRANSITIONS = {
  take: { from: ['active'], to: 'in_progress', event: 'report.taken' },
  close: { from: ['in_progress'], to: 'resolved', event: 'report.closed' },
  dismiss: { from: ['active', 'in_progress'], to: 'false_alarm', event: 'report.dismissed' },
}

export class DomainError extends Error {
  constructor(status, code, message, extra = {}) {
    super(message)
    this.status = status
    this.code = code
    this.extra = extra
  }
}

export function isUuid(v) {
  return typeof v === 'string' && UUID_RE.test(v)
}

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
}

// Valida el cuerpo de POST /api/reports. Los campos de identidad que mande el
// cliente (created_by, created_by_nick, nickname, role, level, status) se ignoran:
// la identidad sale de la sesión y el nivel siempre es N0.
export function validateCreateReport(body) {
  if (!isPlainObject(body)) {
    return { errors: { body: 'El cuerpo debe ser un objeto JSON' } }
  }
  const errors = {}
  if (!isUuid(body.client_report_id)) errors.client_report_id = 'Identificador de envío inválido'
  if (!isUuid(body.zone_id)) errors.zone_id = 'Selecciona una zona válida'
  if (body.node_id !== undefined && body.node_id !== null && body.node_id !== '' && !isUuid(body.node_id)) {
    errors.node_id = 'Punto de referencia inválido'
  }
  if (!REPORT_TYPES.includes(body.type)) errors.type = 'Selecciona el tipo de situación'
  let description = null
  if (body.description !== undefined && body.description !== null) {
    if (typeof body.description !== 'string') {
      errors.description = 'La descripción debe ser texto'
    } else {
      description = body.description.trim() || null
      if (description && description.length > DESCRIPTION_MAX) {
        errors.description = `Máximo ${DESCRIPTION_MAX} caracteres`
      }
    }
  }
  if (Object.keys(errors).length) return { errors }
  return {
    value: {
      client_report_id: body.client_report_id.toLowerCase(),
      zone_id: body.zone_id.toLowerCase(),
      node_id: body.node_id ? body.node_id.toLowerCase() : null,
      type: body.type,
      description,
    },
  }
}

// JSON canónico (claves ordenadas) de los campos que definen el reporte.
export function canonicalReportPayload(value) {
  const { zone_id, node_id, type, description } = value
  const obj = { description: description ?? null, node_id: node_id ?? null, type, zone_id }
  return JSON.stringify(obj, Object.keys(obj).sort())
}

export async function reportPayloadHash(value) {
  const bytes = new TextEncoder().encode(canonicalReportPayload(value))
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

export function validateTransition(body) {
  if (!isPlainObject(body)) return { errors: { body: 'El cuerpo debe ser un objeto JSON' } }
  const errors = {}
  const { action } = body
  if (!TRANSITIONS[action]) errors.action = 'Acción inválida (take, close o dismiss)'
  if (!Number.isInteger(body.expected_version) || body.expected_version < 1) {
    errors.expected_version = 'Falta la versión esperada'
  }
  const resolution = typeof body.resolution === 'string' ? body.resolution.trim() : ''
  const note = typeof body.note === 'string' ? body.note.trim() : ''
  if (action === 'close') {
    if (!resolution) errors.resolution = 'Describe cómo se resolvió'
    else if (resolution.length > RESOLUTION_MAX) errors.resolution = `Máximo ${RESOLUTION_MAX} caracteres`
  }
  if (action === 'dismiss') {
    if (!DISMISS_REASONS.includes(body.dismiss_reason)) errors.dismiss_reason = 'Selecciona un motivo'
    if (body.dismiss_reason === 'other' && !note) errors.note = 'Explica el motivo'
  }
  if (note.length > NOTE_MAX) errors.note = `Máximo ${NOTE_MAX} caracteres`
  if (Object.keys(errors).length) return { errors }
  return {
    value: {
      action,
      expected_version: body.expected_version,
      resolution: action === 'close' ? resolution : null,
      dismiss_reason: action === 'dismiss' ? body.dismiss_reason : null,
      note: note || null,
    },
  }
}

// Decide la transición sobre el estado actual. Lanza DomainError si no aplica.
export function planTransition(alert, value) {
  if (alert.version !== value.expected_version) {
    throw new DomainError(409, 'version-conflict', 'El reporte cambió; recarga para ver su estado actual', {
      current_version: alert.version,
    })
  }
  const rule = TRANSITIONS[value.action]
  if (!rule.from.includes(alert.status)) {
    throw new DomainError(422, 'invalid-transition', `No se puede ${value.action} un reporte en estado ${alert.status}`)
  }
  return rule
}

export function canCoordinate(actor, zoneId) {
  return actor?.role === 'coordinator' && Array.isArray(actor.zoneIds) && actor.zoneIds.includes(zoneId)
}

// Vista reducida para quien reportó: no ve quién atiende ni la resolución interna.
export function toReporterView(alert) {
  return {
    id: alert.id,
    zone_id: alert.zone_id,
    type: alert.type,
    level: alert.level,
    status: alert.status,
    description: alert.description ?? null,
    node: alert.node ? { name: alert.node.name } : null,
    created_at: alert.created_at,
    updated_at: alert.updated_at,
  }
}

export function toCoordinatorView(alert) {
  return {
    id: alert.id,
    zone_id: alert.zone_id,
    node_id: alert.node_id ?? null,
    node: alert.node ?? null,
    type: alert.type,
    level: alert.level,
    status: alert.status,
    description: alert.description ?? null,
    reporter: { display_name: alert.created_by_nick || 'Residente' },
    resolution: alert.resolution ?? null,
    dismiss_reason: alert.dismiss_reason ?? null,
    version: alert.version,
    created_at: alert.created_at,
    updated_at: alert.updated_at,
    resolved_at: alert.resolved_at ?? null,
  }
}

// --- Validación comunitaria (votos) ----------------------------------------
// La identidad y el peso salen de la sesión; del cuerpo solo se aceptan
// alert_id y comment. Los votos NO cambian el nivel (sin escalamiento
// automático en esta ronda; ver S3-6 en avp3/08-sprints-prototipo-criterios.md).
export const VOTE_COMMENT_MAX = 300
export const VOTE_WEIGHT = { resident: 1, coordinator: 2 }

export function validateVote(body) {
  if (!isPlainObject(body)) return { errors: { body: 'El cuerpo debe ser un objeto JSON' } }
  const errors = {}
  if (!isUuid(body.alert_id)) errors.alert_id = 'Alerta inválida'
  let comment = null
  if (body.comment !== undefined && body.comment !== null) {
    if (typeof body.comment !== 'string') errors.comment = 'El comentario debe ser texto'
    else {
      comment = body.comment.trim() || null
      if (comment && comment.length > VOTE_COMMENT_MAX) errors.comment = `Máximo ${VOTE_COMMENT_MAX} caracteres`
    }
  }
  if (Object.keys(errors).length) return { errors }
  return { value: { alert_id: body.alert_id.toLowerCase(), comment } }
}

// Peso y rol del voto según la sesión y la zona de la alerta.
export function voteRoleFor(actor, alert) {
  return canCoordinate(actor, alert.zone_id)
    ? { role: 'coordinator', weight: VOTE_WEIGHT.coordinator }
    : { role: 'visitor', weight: VOTE_WEIGHT.resident }
}

export function assertVotable(alert) {
  if (alert.status === 'resolved' || alert.status === 'false_alarm') {
    throw new DomainError(422, 'alert-closed', 'No se puede validar una alerta cerrada')
  }
}
