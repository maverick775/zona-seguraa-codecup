// lib/signalarm/labels.js — etiquetas es-MX compartidas por las pantallas.
export const TYPE_LABELS = {
  medical: 'Emergencia médica',
  security: 'Seguridad',
  fire: 'Incendio',
  evacuation: 'Evacuación',
}
export const TYPE_ICONS = { medical: '🏥', security: '🚨', fire: '🔥', evacuation: '🚪' }

// Estados guardados en BD → etiqueta de gestión (spec F1: Abierto, En atención, Cerrado, Descartado).
export const STATUS_LABELS = {
  active: 'Abierto',
  in_progress: 'En atención',
  resolved: 'Cerrado',
  false_alarm: 'Descartado',
}
export const STATUS_BADGE = {
  active: 'bg-red-50 text-red-800 border-red-300',
  in_progress: 'bg-blue-50 text-blue-800 border-blue-300',
  resolved: 'bg-green-50 text-green-800 border-green-300',
  false_alarm: 'bg-gray-100 text-gray-700 border-gray-300',
}

export const LEVEL_LABELS = {
  0: 'N0 · Reporte ciudadano',
  1: 'N1 · Aviso',
  2: 'N2 · Advertencia',
  3: 'N3 · Emergencia',
}

// Urgencia reportada (spec F1 · reported_severity). Solo etiqueta: no es nivel ni prioridad.
export const REPORTED_SEVERITY_LABELS = {
  informational: 'Informativa',
  suspicious: 'Sospechosa',
  urgent: 'Urgente',
}

export const DISMISS_REASON_LABELS = {
  false_report: 'Reporte falso',
  duplicate: 'Duplicado',
  not_actionable: 'No requiere acción',
  other: 'Otro motivo',
}

export const EVENT_LABELS = {
  'report.created': 'Reporte creado',
  'report.taken': 'Tomado por coordinación',
  'report.closed': 'Cerrado',
  'report.dismissed': 'Descartado',
}

export function shortId(id) {
  return id ? String(id).slice(0, 8).toUpperCase() : ''
}

export function formatDateTime(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleString('es-MX', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}
