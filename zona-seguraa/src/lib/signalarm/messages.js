// lib/signalarm/messages.js — U6: catálogo centralizado de mensajes (es-MX).
// Reglas de redacción:
//   - Recibido no equivale a atendido; cerrado no equivale a "sin riesgo".
//   - Sin indicaciones médicas ni tácticas.
//   - Sin prometer respuesta oficial, ayuda enviada ni tiempos.
// Las explicaciones de motivos (REASONS) las usa el motor de políticas (policy.js).

export const RESIDENT_MESSAGES = {
  'received-not-attended': {
    title: 'Tu reporte quedó registrado',
    body: 'Registrado no significa atendido. Coordinación de la zona puede verlo, pero esto no envía ayuda ni avisa a servicios de emergencia.',
  },
  'emergency-911': {
    title: 'Si hay peligro inmediato',
    body: 'Llama al 911. Este reporte no sustituye esa llamada.',
    action: { label: 'Llamar al 911', href: 'tel:911' },
  },
  'helpful-info': {
    title: 'Información que podría ayudar',
    body: 'Si puedes hacerlo sin ponerte en riesgo: qué viste, dónde (un punto de referencia) y desde cuándo. No compartas datos personales de otras personas.',
  },
  'how-to-follow': {
    title: 'Cómo seguir tu reporte',
    body: 'Consulta "Mis reportes". Ahí verás si sigue abierto, si alguien de coordinación lo tomó o si se cerró. El estado cambia solo cuando coordinación actúa.',
  },
  'in-progress': {
    title: 'Coordinación lo está atendiendo',
    body: 'Una persona de coordinación tomó el reporte. Eso no indica un tiempo de respuesta ni qué acciones se tomarán.',
  },
  'closed-not-guarantee': {
    title: 'Cierre administrativo',
    body: 'Que el reporte esté cerrado significa que coordinación terminó su seguimiento. No garantiza que ya no exista riesgo.',
  },
  'dismissed-meaning': {
    title: 'Reporte descartado',
    body: 'Coordinación lo marcó como duplicado, sin acción necesaria o no confirmado. Si la situación continúa o cambia, puedes hacer un reporte nuevo.',
  },
  'network-unavailable': {
    title: 'Sin conexión con el servicio',
    body: 'No pudimos confirmar el registro. Tu reporte NO se ha guardado todavía. Puedes reintentar; no se creará un duplicado.',
  },
  'status-unknown': {
    title: 'No pudimos consultar el estado',
    body: 'Mostramos el último estado conocido o ninguno. Esto no indica que el reporte haya avanzado o se haya cerrado.',
  },
  'demo-limits': {
    title: 'Modo demostración',
    body: 'Los datos son de prueba, se guardan en memoria y se borran al reiniciar. No se contacta a nadie.',
  },
}

// Explicaciones de los códigos de motivo del motor de políticas.
export const REASONS = {
  ok: 'Disponible según las reglas vigentes.',
  'no-session': 'Requiere iniciar sesión.',
  'not-coordinator': 'Solo coordinación puede hacer esto.',
  'other-zone': 'El reporte pertenece a una zona que no tienes asignada.',
  'status-incompatible': 'No aplica en el estado actual del reporte.',
  'version-stale': 'El reporte cambió desde que lo abriste. Recarga antes de actuar.',
  'lab-only': 'Acción propuesta: solo existe en el laboratorio y no guarda nada.',
  'not-implemented': 'No está implementado en esta ronda.',
  'policy-invalid-fallback': 'Configuración inválida: se aplica BASE_POLICY (reglas vigentes), sin perfiles, ajustes ni acciones de laboratorio.',
  'policy-valid': 'Configuración propuesta válida.',
  'base-policy': 'Reglas vigentes del prototipo (sin propuestas).',
  'field-required-server': 'Obligatorio en el servidor.',
  'field-required-policy': 'Obligatorio según la configuración propuesta (no aprobada).',
  'field-suggested-policy': 'Sugerido por la configuración propuesta (no bloquea).',
  'field-invalid': 'El valor no es válido.',
  'no-data': 'No hay datos suficientes para evaluar.',
  'waiting-advisory': 'Lleva más tiempo sin tomarse que el umbral propuesto. Es solo un aviso: no cambia prioridad ni nivel.',
}

export function residentMessage(code) {
  return RESIDENT_MESSAGES[code] || null
}

export function reasonText(code) {
  return REASONS[code] || code
}

// Elige los mensajes de orientación para quien reportó. Pura y determinista.
// phase: 'draft' | 'submitted' | 'send-failed' | 'follow-up' | 'unknown'
export function guidanceFor({ phase, status, isDemo = false }) {
  const codes = []
  if (phase === 'draft') codes.push('emergency-911', 'helpful-info')
  if (phase === 'send-failed') codes.push('network-unavailable', 'emergency-911')
  if (phase === 'submitted') codes.push('received-not-attended', 'how-to-follow', 'emergency-911')
  if (phase === 'unknown') codes.push('status-unknown', 'emergency-911')
  if (phase === 'follow-up') {
    if (status === 'active') codes.push('received-not-attended', 'helpful-info')
    else if (status === 'in_progress') codes.push('in-progress')
    else if (status === 'resolved') codes.push('closed-not-guarantee')
    else if (status === 'false_alarm') codes.push('dismissed-meaning')
    else codes.push('status-unknown')
    codes.push('emergency-911')
  }
  if (isDemo) codes.push('demo-limits')
  return [...new Set(codes)].map((code) => ({ code, ...RESIDENT_MESSAGES[code] }))
}
