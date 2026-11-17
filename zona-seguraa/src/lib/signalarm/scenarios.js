// lib/signalarm/scenarios.js — U5: banco de escenarios reutilizable.
// Datos de DEMOSTRACIÓN (no son incidentes reales). Una sola fuente para:
//   - pruebas en proceso (scripts/tests/scenarios.test.mjs),
//   - humo HTTP en modo demo (scripts/smoke-api.mjs),
//   - humo contra Supabase de pruebas (scripts/smoke-supabase.mjs, cuando se autorice),
//   - galería de componentes en modo demo (/demo/componentes).
// Sin dependencias ni efectos: solo datos y funciones puras.

export const ZONE = {
  liberacion: 'a1000000-0000-0000-0000-000000000001',
  rotonda: 'a1000000-0000-0000-0000-000000000002',
  catedral: 'a1000000-0000-0000-0000-000000000003',
}
export const NODE = {
  liberacionCentro: 'b1000000-0000-0000-0000-000000000001',
  liberacionMedico: 'b1000000-0000-0000-0000-000000000004',
  rotondaNorte: 'b1000000-0000-0000-0000-000000000006',
}

// Personas lógicas. En modo demo se mapean a DEMO_PERSONAS por la misma clave;
// en Supabase de pruebas, a las cuentas residente.a, residente.b, coord.z1, coord.z2.
export const PERSONAS = {
  residenteA: 'residente-ana',
  residenteB: 'residente-luis',
  coordZ1: 'coord-liberacion',
  coordZ2: 'coord-rotonda',
}

// Reportes sembrados: cada uno llega a su estado con pasos de coordinación.
// `expect` es el estado guardado en BD (ver STATUS_LABELS para la etiqueta).
export const SEED_REPORTS = [
  {
    key: 'z1-abierto',
    persona: PERSONAS.residenteA,
    body: { zone_id: ZONE.liberacion, type: 'security', description: 'Persona intentando abrir autos en el acceso norte' },
    steps: [],
    expect: 'active',
  },
  {
    key: 'z1-atencion',
    persona: PERSONAS.residenteB,
    body: { zone_id: ZONE.liberacion, node_id: NODE.liberacionMedico, type: 'medical', description: 'Señor mareado junto al punto médico' },
    steps: [{ persona: PERSONAS.coordZ1, action: 'take' }],
    expect: 'in_progress',
  },
  {
    key: 'z1-cerrado',
    persona: PERSONAS.residenteA,
    body: { zone_id: ZONE.liberacion, type: 'fire', description: 'Humo en un puesto de comida' },
    steps: [
      { persona: PERSONAS.coordZ1, action: 'take' },
      { persona: PERSONAS.coordZ1, action: 'close', resolution: 'Personal del evento apagó el anafre; sin lesionados (demo)' },
    ],
    expect: 'resolved',
  },
  {
    key: 'z1-descartado',
    persona: PERSONAS.residenteB,
    body: { zone_id: ZONE.liberacion, type: 'evacuation', description: 'Gente corriendo hacia la salida' },
    steps: [{ persona: PERSONAS.coordZ1, action: 'dismiss', dismiss_reason: 'duplicate' }],
    expect: 'false_alarm',
  },
  {
    key: 'z2-abierto',
    persona: PERSONAS.residenteA,
    body: { zone_id: ZONE.rotonda, type: 'security', description: 'Pelea entre aficionados en la rotonda' },
    steps: [],
    expect: 'active',
  },
]

// Matriz de acceso. Se ejecuta EN ORDEN (las filas que mutan van al final).
// op: me | my-report | coord-list-zone | coord-detail | take | patch-level | vote | legacy-create
// version: 'current' (por omisión) o 'stale' para transiciones.
export const ACCESS_MATRIX = [
  // Sin sesión
  { id: 'A01', persona: null, op: 'me', expect: 401 },
  { id: 'A02', persona: null, op: 'my-report', target: 'z1-abierto', expect: 401 },
  { id: 'A03', persona: null, op: 'coord-detail', target: 'z1-abierto', expect: 401 },
  { id: 'A04', persona: null, op: 'take', target: 'z1-abierto', expect: 401 },
  { id: 'A05', persona: null, op: 'vote', target: 'z1-abierto', expect: 401 },
  { id: 'A06', persona: null, op: 'legacy-create', expect: 410 },
  // Residentes
  { id: 'R01', persona: PERSONAS.residenteA, op: 'my-report', target: 'z1-abierto', expect: 200, view: 'reporter' },
  { id: 'R02', persona: PERSONAS.residenteA, op: 'my-report', target: 'z1-atencion', expect: 404, note: 'reporte de otro residente' },
  { id: 'R03', persona: PERSONAS.residenteB, op: 'my-report', target: 'z1-abierto', expect: 404, note: 'reporte de otro residente' },
  { id: 'R04', persona: PERSONAS.residenteA, op: 'coord-detail', target: 'z1-abierto', expect: 403 },
  { id: 'R05', persona: PERSONAS.residenteA, op: 'take', target: 'z1-abierto', expect: 403 },
  { id: 'R06', persona: PERSONAS.residenteA, op: 'patch-level', target: 'z1-abierto', expect: 403 },
  { id: 'R07', persona: PERSONAS.residenteB, op: 'vote', target: 'z1-cerrado', expect: 422, note: 'alerta cerrada' },
  // Coordinación de otra zona
  { id: 'C01', persona: PERSONAS.coordZ2, op: 'coord-detail', target: 'z1-abierto', expect: 404 },
  { id: 'C02', persona: PERSONAS.coordZ2, op: 'take', target: 'z1-abierto', expect: 404 },
  { id: 'C03', persona: PERSONAS.coordZ2, op: 'coord-list-zone', target: 'z1-abierto', expect: 404 },
  { id: 'C04', persona: PERSONAS.coordZ2, op: 'my-report', target: 'z1-abierto', expect: 404 },
  { id: 'C05', persona: PERSONAS.coordZ2, op: 'coord-detail', target: 'z2-abierto', expect: 200, view: 'coordinator' },
  // Coordinación de la zona
  { id: 'C06', persona: PERSONAS.coordZ1, op: 'my-report', target: 'z1-abierto', expect: 200, view: 'coordinator' },
  { id: 'C07', persona: PERSONAS.coordZ1, op: 'coord-list-zone', target: 'z1-abierto', expect: 200 },
  { id: 'C08', persona: PERSONAS.coordZ1, op: 'take', target: 'z1-cerrado', expect: 422 },
  { id: 'C09', persona: PERSONAS.coordZ1, op: 'take', target: 'z1-descartado', expect: 422 },
  { id: 'C10', persona: PERSONAS.coordZ1, op: 'take', target: 'z1-atencion', version: 'stale', expect: 409 },
  // Filas que mutan (al final)
  { id: 'M01', persona: PERSONAS.residenteA, op: 'vote', target: 'z1-abierto', expect: 201 },
  { id: 'M02', persona: PERSONAS.residenteA, op: 'vote', target: 'z1-abierto', expect: 409, note: 'segundo voto' },
  { id: 'M03', persona: PERSONAS.coordZ1, op: 'take', target: 'z1-abierto', expect: 200 },
  { id: 'M04', persona: PERSONAS.coordZ1, op: 'take', target: 'z1-abierto', version: 'stale', expect: 409, note: 'doble clic / otra pestaña' },
]

// Campos que la vista de quien reportó NUNCA debe exponer.
export const REPORTER_FORBIDDEN_KEYS = ['created_by', 'client_report_id', 'client_payload_hash', 'resolution', 'dismiss_reason', 'attended_by', 'version']

// Convierte una fila de la matriz en una petición HTTP. `seeded[key]` = { id, zone_id, version }.
export function matrixRequest(row, seeded) {
  const t = row.target ? seeded[row.target] : null
  if (row.target && !t) throw new Error(`Fila ${row.id}: objetivo ${row.target} no sembrado`)
  const version = row.version === 'stale' ? Math.max(1, t.version - 1) : t?.version
  switch (row.op) {
    case 'me': return { method: 'GET', path: '/api/me' }
    case 'my-report': return { method: 'GET', path: `/api/reports/${t.id}` }
    case 'coord-list-zone': return { method: 'GET', path: `/api/coordinator/alerts?zone_id=${t.zone_id}` }
    case 'coord-detail': return { method: 'GET', path: `/api/coordinator/alerts/${t.id}` }
    case 'take': return { method: 'POST', path: `/api/coordinator/alerts/${t.id}/transitions`, body: { action: 'take', expected_version: version } }
    case 'patch-level': return { method: 'PATCH', path: `/api/alerts/${t.id}`, body: { level: 2 } }
    case 'vote': return { method: 'POST', path: '/api/votes', body: { alert_id: t.id, comment: 'Lo vi también (demo)', role: 'coordinator', nickname: 'Suplantado' } }
    case 'legacy-create': return { method: 'POST', path: '/api/alerts', body: { zone_id: ZONE.liberacion, node_id: NODE.liberacionCentro, type: 'fire' } }
    default: throw new Error(`Operación desconocida: ${row.op}`)
  }
}

// Siembra a través de la API (sirve igual en proceso, HTTP demo o Supabase de pruebas).
// call(persona, { method, path, body }) → { status, json }. Devuelve { key: { id, zone_id, version, status } }.
export async function seedViaApi(call, { newId = () => crypto.randomUUID() } = {}) {
  const seeded = {}
  for (const s of SEED_REPORTS) {
    const created = await call(s.persona, { method: 'POST', path: '/api/reports', body: { client_report_id: newId(), ...s.body } })
    if (created.status !== 201) throw new Error(`Semilla ${s.key}: crear → ${created.status}`)
    let { id, zone_id } = created.json.data
    let version = 1
    let status = created.json.data.status
    for (const step of s.steps) {
      const { persona, action, ...rest } = step
      const r = await call(persona, {
        method: 'POST',
        path: `/api/coordinator/alerts/${id}/transitions`,
        body: { action, expected_version: version, ...rest },
      })
      if (r.status !== 200) throw new Error(`Semilla ${s.key}: ${action} → ${r.status}`)
      version = r.json.data.version
      status = r.json.data.status
    }
    if (status !== s.expect) throw new Error(`Semilla ${s.key}: estado ${status}, se esperaba ${s.expect}`)
    seeded[s.key] = { id, zone_id, version, status }
  }
  return seeded
}

// Ejecuta la matriz. Devuelve filas con { id, ok, status, expect, detail }.
export async function runAccessMatrix(call, seeded, rows = ACCESS_MATRIX) {
  const results = []
  for (const row of rows) {
    const req = matrixRequest(row, seeded)
    const res = await call(row.persona, req)
    let ok = res.status === row.expect
    let detail = ''
    if (ok && row.view === 'reporter') {
      const leaked = REPORTER_FORBIDDEN_KEYS.filter((k) => k in (res.json?.data || {}))
      if (leaked.length) { ok = false; detail = `expone ${leaked.join(', ')}` }
    }
    if (ok && row.view === 'coordinator' && !('version' in (res.json?.data || {}))) {
      ok = false; detail = 'sin versión (no es vista de coordinación)'
    }
    if (ok && row.op === 'vote' && res.status === 201 && res.json?.data?.vote?.weight !== 1) {
      ok = false; detail = 'el rol del cuerpo cambió el peso'
    }
    // Una transición exitosa actualiza la versión para las filas siguientes.
    if (res.status === 200 && row.op === 'take') seeded[row.target].version = res.json.data.version
    results.push({ id: row.id, ok, status: res.status, expect: row.expect, detail, row })
  }
  return results
}

export function describeRow(row) {
  const who = row.persona || 'sin sesión'
  return `${row.id} ${who} · ${row.op}${row.target ? ' ' + row.target : ''}${row.version === 'stale' ? ' (versión vieja)' : ''}${row.note ? ' — ' + row.note : ''}`
}

// Vistas de ejemplo deterministas (sin repositorio) para la galería de componentes.
// Ids y fechas son ficticios. No usar como datos de pruebas de autorización.
const EVENT_FOR = { take: 'report.taken', close: 'report.closed', dismiss: 'report.dismissed' }
const TO_FOR = { take: 'in_progress', close: 'resolved', dismiss: 'false_alarm' }
const PERSONA_LABELS = {
  'residente-ana': 'Ana (residente demo)',
  'residente-luis': 'Luis (residente demo)',
  'coord-liberacion': 'Coordinación Plaza Liberación (demo)',
  'coord-rotonda': 'Coordinación Rotonda (demo)',
}
const NODE_NAMES = { [NODE.liberacionMedico]: 'Punto Médico — Plaza Liberación Oriente', [NODE.liberacionCentro]: 'AVP3-Alfa-01 — Centro Plaza Liberación' }

export function sampleViews(base = Date.parse('2026-11-03T18:00:00Z')) {
  return SEED_REPORTS.map((s, i) => {
    const t0 = base + i * 7 * 60_000
    const id = `e${i + 1}a0c0de-0000-4000-8000-00000000000${i + 1}`
    const history = [{ seq: 1, action: 'report.created', from_status: null, to_status: 'active', actor_role: 'resident', actor_label: PERSONA_LABELS[s.persona], data: {}, created_at: new Date(t0).toISOString() }]
    let status = 'active'
    s.steps.forEach((st, j) => {
      const data = {}
      if (st.resolution) data.resolution = st.resolution
      if (st.dismiss_reason) data.dismiss_reason = st.dismiss_reason
      history.push({ seq: j + 2, action: EVENT_FOR[st.action], from_status: status, to_status: TO_FOR[st.action], actor_role: 'coordinator', actor_label: PERSONA_LABELS[st.persona], data, created_at: new Date(t0 + (j + 1) * 3 * 60_000).toISOString() })
      status = TO_FOR[st.action]
    })
    const last = history[history.length - 1].created_at
    const closeStep = s.steps.find((st) => st.action === 'close')
    const dismissStep = s.steps.find((st) => st.action === 'dismiss')
    return {
      key: s.key,
      id, zone_id: s.body.zone_id, node_id: s.body.node_id || null,
      node: s.body.node_id ? { id: s.body.node_id, name: NODE_NAMES[s.body.node_id] || 'Punto de referencia' } : null,
      type: s.body.type, level: 0, status, description: s.body.description,
      reporter: { display_name: PERSONA_LABELS[s.persona] },
      resolution: closeStep?.resolution || null, dismiss_reason: dismissStep?.dismiss_reason || null,
      version: history.length, created_at: history[0].created_at, updated_at: last,
      resolved_at: status === 'resolved' || status === 'false_alarm' ? last : null,
      history,
    }
  })
}
