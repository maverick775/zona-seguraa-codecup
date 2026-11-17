// Prueba de humo HTTP de los flujos N0 y de coordinación contra un servidor
// local en MODO DEMO (datos en memoria). No usar contra entornos compartidos.
//
//   NEXT_PUBLIC_SIGNALARM_DATA_MODE=demo npm run build
//   NEXT_PUBLIC_SIGNALARM_DATA_MODE=demo SIGNALARM_DEMO_SECRET=<32+ chars> SIGNALARM_DEMO_INSECURE_COOKIE=1 npx next start -p 3100
//   BASE_URL=http://localhost:3100 node scripts/smoke-api.mjs
import { describeRow, runAccessMatrix, seedViaApi } from '../src/lib/signalarm/scenarios.js'

const BASE = process.env.BASE_URL || 'http://localhost:3100'
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(BASE)) {
  console.error('BASE_URL debe ser local'); process.exit(2)
}
const ZONE1 = 'a1000000-0000-0000-0000-000000000001'
let failures = 0
const check = (name, cond, extra) => {
  console.log(`${cond ? 'ok  ' : 'FAIL'} ${name}${cond ? '' : ' → ' + JSON.stringify(extra)}`)
  if (!cond) failures++
}

async function call(path, { method = 'GET', body, cookie, redirect = 'follow' } = {}) {
  const res = await fetch(BASE + path, {
    method, redirect,
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  })
  const text = await res.text()
  let json = null
  try { json = JSON.parse(text) } catch {}
  return { status: res.status, json, headers: res.headers }
}

async function login(persona) {
  const r = await call('/api/demo/session', { method: 'POST', body: { persona } })
  const set = r.headers.get('set-cookie') || ''
  return set.split(';')[0]
}

const report = (over = {}) => ({ client_report_id: crypto.randomUUID(), zone_id: ZONE1, type: 'security', description: 'Persona forzando un auto', ...over })

// --- Sin sesión
check('GET /api/me sin sesión → 401', (await call('/api/me')).status === 401)
check('POST /api/reports sin sesión → 401', (await call('/api/reports', { method: 'POST', body: report() })).status === 401)
check('GET /api/coordinator/alerts sin sesión → 401', (await call('/api/coordinator/alerts')).status === 401)
check('PATCH /api/alerts/:id sin sesión → 401', (await call(`/api/alerts/${crypto.randomUUID()}`, { method: 'PATCH', body: { status: 'resolved' } })).status === 401)
const page = await call('/coordinator/reports', { redirect: 'manual' })
check('Página /coordinator/reports sin sesión → redirige a /login', page.status === 307 && (page.headers.get('location') || '').includes('/login?next=%2Fcoordinator%2Freports'), page.status)
check('Cookie demo falsificada → 401', (await call('/api/me', { cookie: 'sg_demo_session=eyJwIjoiY29vcmQtbGliZXJhY2lvbiJ9.firma' })).status === 401)

// --- Residente
const ana = await login('residente-ana')
check('login demo residente', ana.startsWith('sg_demo_session='))
const me = await call('/api/me', { cookie: ana })
check('GET /api/me → residente', me.status === 200 && me.json.data.role === 'resident', me.json)

const bad = await call('/api/reports', { method: 'POST', cookie: ana, body: { zone_id: 'x', type: 'robo' } })
check('POST inválido → 400 con detalles', bad.status === 400 && bad.json.error.details?.type && bad.json.error.details?.client_report_id, bad.json)
check('POST JSON roto → 400', (await call('/api/reports', { method: 'POST', cookie: ana, body: '{nope' })).status === 400)

// Repetible: se mide "Mis reportes" antes de crear (el servidor demo puede tener datos de corridas previas).
const mineBefore = (await call('/api/reports', { cookie: ana })).json?.data?.length ?? 0
const body = report({ created_by_nick: 'Suplantado', role: 'coordinator', level: 3 })
const created = await call('/api/reports', { method: 'POST', cookie: ana, body })
const id = created.json?.data?.id
check('POST N0 sin nodo → 201, level 0, activo', created.status === 201 && created.json.data.level === 0 && created.json.data.status === 'active' && created.json.data.node === null, created.json)
check('respuesta incluye X-Request-Id', !!created.headers.get('x-request-id'))

const replay = await call('/api/reports', { method: 'POST', cookie: ana, body })
check('reintento idéntico → 200 mismo id', replay.status === 200 && replay.json.data.id === id && replay.json.data.replayed === true, replay.json)
const mismatch = await call('/api/reports', { method: 'POST', cookie: ana, body: { ...body, type: 'fire' } })
check('misma clave, otro cuerpo → 409', mismatch.status === 409 && mismatch.json.error.code === 'idempotency-mismatch', mismatch.json)

const mine = await call('/api/reports', { cookie: ana })
const mineRow = mine.json?.data?.find((r) => r.id === id)
check('Mis reportes → +1 y vista reducida', mine.status === 200 && mine.json.data.length === mineBefore + 1 && mineRow && !('resolution' in mineRow) && !('created_by' in mineRow), { before: mineBefore, now: mine.json?.data?.length })
check('autor ve su reporte', (await call(`/api/reports/${id}`, { cookie: ana })).status === 200)
check('residente → bandeja 403', (await call('/api/coordinator/alerts', { cookie: ana })).status === 403)
check('residente → transición 403', (await call(`/api/coordinator/alerts/${id}/transitions`, { method: 'POST', cookie: ana, body: { action: 'take', expected_version: 1 } })).status === 403)
check('residente → PATCH legado 403', (await call(`/api/alerts/${id}`, { method: 'PATCH', cookie: ana, body: { level: 2 } })).status === 403)

const pub = await call(`/api/alerts?zone_id=${ZONE1}`)
check('GET /api/alerts público no expone created_by ni client_report_id', pub.status === 200 && pub.json.length >= 1 && !('created_by' in pub.json[0]) && !('client_report_id' in pub.json[0]), pub.json?.[0])

// --- Otro residente
const luis = await login('residente-luis')
check('otro residente no ve el reporte → 404', (await call(`/api/reports/${id}`, { cookie: luis })).status === 404)

// --- Coordinador de otra zona
const rot = await login('coord-rotonda')
const rotList = await call('/api/coordinator/alerts', { cookie: rot })
check('coord. de otra zona: bandeja sin el reporte', rotList.status === 200 && !rotList.json.data.some((a) => a.id === id))
check('coord. de otra zona: detalle → 404', (await call(`/api/coordinator/alerts/${id}`, { cookie: rot })).status === 404)
check('coord. de otra zona: transición → 404', (await call(`/api/coordinator/alerts/${id}/transitions`, { method: 'POST', cookie: rot, body: { action: 'take', expected_version: 1 } })).status === 404)
check('coord. de otra zona: filtro por zona ajena → 404', (await call(`/api/coordinator/alerts?zone_id=${ZONE1}`, { cookie: rot })).status === 404)

// --- Coordinador de la zona
const lib = await login('coord-liberacion')
const list = await call('/api/coordinator/alerts?status=active,in_progress&level=0', { cookie: lib })
check('bandeja filtrada incluye el N0', list.status === 200 && list.json.data.some((a) => a.id === id), list.json)
check('filtro de estado inválido → 400', (await call('/api/coordinator/alerts?status=borrado', { cookie: lib })).status === 400)
const T = (b) => call(`/api/coordinator/alerts/${id}/transitions`, { method: 'POST', cookie: lib, body: b })
check('close desde Abierto → 422', (await T({ action: 'close', expected_version: 1, resolution: 'x' })).status === 422)
check('close sin resolución → 400', (await T({ action: 'close', expected_version: 1 })).status === 400)
const take = await T({ action: 'take', expected_version: 1 })
check('take → En atención, versión 2', take.status === 200 && take.json.data.status === 'in_progress' && take.json.data.version === 2, take.json)
const stale = await T({ action: 'close', expected_version: 1, resolution: 'x' })
check('versión vieja → 409 con versión actual', stale.status === 409 && stale.json.error.code === 'version-conflict' && stale.json.error.details?.current_version === 2, stale.json)
check('PATCH legado con status → 409 use-transitions', (await call(`/api/alerts/${id}`, { method: 'PATCH', cookie: lib, body: { status: 'resolved' } })).status === 409)
const close = await T({ action: 'close', expected_version: 2, resolution: 'Se habló con seguridad del estacionamiento' })
check('close → Cerrado', close.status === 200 && close.json.data.status === 'resolved', close.json)
const detail = await call(`/api/coordinator/alerts/${id}`, { cookie: lib })
check('historial con 3 eventos', detail.status === 200 && detail.json.data.history.map((e) => e.action).join() === 'report.created,report.taken,report.closed', detail.json?.data?.history)
check('autor ve estado Cerrado sin resolución interna', await call(`/api/reports/${id}`, { cookie: ana }).then((r) => r.json.data.status === 'resolved' && !('resolution' in r.json.data)))

// --- Descartar
const second = await call('/api/reports', { method: 'POST', cookie: ana, body: report({ type: 'medical' }) })
const id2 = second.json.data.id
const D = (b) => call(`/api/coordinator/alerts/${id2}/transitions`, { method: 'POST', cookie: lib, body: b })
check('dismiss other sin nota → 400', (await D({ action: 'dismiss', expected_version: 1, dismiss_reason: 'other' })).status === 400)
check('dismiss duplicate → Descartado', (await D({ action: 'dismiss', expected_version: 1, dismiss_reason: 'duplicate' })).json?.data?.status === 'false_alarm')

// --- S1: accesos heredados
check('POST /api/alerts legado → 410', (await call('/api/alerts', { method: 'POST', body: { zone_id: ZONE1, node_id: ZONE1, type: 'fire' } })).status === 410)
check('POST /api/votes sin sesión → 401', (await call('/api/votes', { method: 'POST', body: { alert_id: id, nickname: 'x', role: 'coordinator' } })).status === 401)
const third = await call('/api/reports', { method: 'POST', cookie: ana, body: report({ type: 'fire' }) })
const id3 = third.json.data.id
const v1 = await call('/api/votes', { method: 'POST', cookie: luis, body: { alert_id: id3, nickname: 'Suplantado', role: 'coordinator' } })
check('voto residente con role:coordinator en el cuerpo → peso 1', v1.status === 201 && v1.json.data.vote.weight === 1 && v1.json.data.vote.role === 'visitor', v1.json)
check('segundo voto del mismo usuario → 409', (await call('/api/votes', { method: 'POST', cookie: luis, body: { alert_id: id3 } })).status === 409)
const v2 = await call('/api/votes', { method: 'POST', cookie: rot, body: { alert_id: id3 } })
check('coordinador de OTRA zona vota con peso 1', v2.status === 201 && v2.json.data.vote.weight === 1, v2.json)
const v3 = await call('/api/votes', { method: 'POST', cookie: lib, body: { alert_id: id3 } })
check('coordinador de la zona vota con peso 2 y no escala', v3.status === 201 && v3.json.data.vote.weight === 2 && v3.json.data.escalated === false, v3.json)
const pubAlert = await call(`/api/alerts/${id3}`)
check('nivel sigue en 0 tras votos; voto público sin voter_user_id', pubAlert.json.level === 0 && pubAlert.json.votes.length === 3 && !('voter_user_id' in pubAlert.json.votes[0]), pubAlert.json)
check('votar en alerta cerrada → 422', (await call('/api/votes', { method: 'POST', cookie: ana, body: { alert_id: id } })).status === 422)
for (const m of ['PATCH', 'PUT', 'DELETE']) {
  const r = await call(`/api/coordinator/alerts/${id}`, { method: m, cookie: lib, body: { history: [] } })
  check(`${m} sobre detalle/historial → 405`, r.status === 405, r.status)
}
const hist = await call(`/api/coordinator/alerts/${id}`, { cookie: lib })
check('historial intacto tras intentos de mutación', hist.json.data.history.length === 3)

// --- U5: banco de escenarios (misma matriz que scripts/tests/scenarios.test.mjs)
const sessions = {}
const matrixCall = async (persona, { method, path, body }) => {
  if (persona && !sessions[persona]) sessions[persona] = await login(persona)
  return call(path, { method, body, cookie: persona ? sessions[persona] : undefined })
}
const seeded = await seedViaApi(matrixCall)
for (const r of await runAccessMatrix(matrixCall, seeded)) {
  check(`matriz ${describeRow(r.row)} → ${r.expect}`, r.ok, { status: r.status, detail: r.detail })
}

console.log(failures ? `\n${failures} fallo(s)` : '\nTodo OK')
process.exit(failures ? 1 : 0)
