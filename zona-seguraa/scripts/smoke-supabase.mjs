// Verificación con Auth REAL contra un Supabase de PRUEBAS (S2). No usar en producción.
// No imprime tokens, contraseñas ni datos personales: solo códigos y conteos.
//
// Requiere (variables de entorno, nunca en el repo):
//   BASE_URL                       app local en modo real (http://localhost:3000)
//   NEXT_PUBLIC_SUPABASE_URL       https://<ref>.supabase.co del proyecto de PRUEBAS
//   NEXT_PUBLIC_SUPABASE_ANON_KEY  anon key (pública)
//   SG_TEST_PASSWORD               contraseña común de las 4 cuentas de prueba
//   SG_EXPECT_REF                  ref esperado; si no coincide con la URL, aborta
// Cuentas (crear antes, ver S2-plan-supabase.md):
//   residente.a@…, residente.b@…, coord.z1@…, coord.z2@…  → SG_TEST_EMAIL_DOMAIN
//
// La prueba de RLS usa la anon key + JWT del usuario contra PostgREST (no service role).
import { createClient } from '@supabase/supabase-js'
import { PERSONAS, describeRow, runAccessMatrix, seedViaApi } from '../src/lib/signalarm/scenarios.js'

const { BASE_URL = 'http://localhost:3000', NEXT_PUBLIC_SUPABASE_URL: URL_, NEXT_PUBLIC_SUPABASE_ANON_KEY: ANON,
  SG_TEST_PASSWORD: PW, SG_TEST_EMAIL_DOMAIN: DOMAIN, SG_EXPECT_REF: REF } = process.env
if (!URL_ || !ANON || !PW || !DOMAIN || !REF) { console.error('Faltan variables (ver encabezado)'); process.exit(2) }
if (new URL(URL_).hostname.split('.')[0] !== REF) { console.error('El ref de la URL no coincide con SG_EXPECT_REF: abortado'); process.exit(2) }
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(BASE_URL)) { console.error('BASE_URL debe ser local'); process.exit(2) }

const ZONE1 = 'a1000000-0000-0000-0000-000000000001'
let failures = 0
const check = (name, cond, extra) => { console.log(`${cond ? 'ok  ' : 'FAIL'} ${name}${cond ? '' : ' → ' + JSON.stringify(extra)}`); if (!cond) failures++ }

async function signIn(local) {
  const sb = createClient(URL_, ANON, { auth: { persistSession: false } })
  const { data, error } = await sb.auth.signInWithPassword({ email: `${local}@${DOMAIN}`, password: PW })
  if (error) throw new Error(`login ${local}: ${error.status}`)
  return { token: data.session.access_token, rest: createClient(URL_, ANON, { global: { headers: { Authorization: `Bearer ${data.session.access_token}` } }, auth: { persistSession: false } }) }
}
async function call(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(BASE_URL + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined })
  return { status: res.status, json: await res.json().catch(() => null) }
}

const A = await signIn('residente.a'), B = await signIn('residente.b'), K1 = await signIn('coord.z1'), K2 = await signIn('coord.z2')

check('sin sesión → 401', (await call('/api/reports', { method: 'POST', body: {} })).status === 401)
check('roles resueltos', (await call('/api/me', { token: A.token })).json?.data?.role === 'resident' && (await call('/api/me', { token: K1.token })).json?.data?.role === 'coordinator')

const body = { client_report_id: crypto.randomUUID(), zone_id: ZONE1, type: 'security', description: 'Prueba S2 (dato ficticio)' }
const c = await call('/api/reports', { method: 'POST', token: A.token, body })
const id = c.json?.data?.id
check('A crea N0 → 201 level 0', c.status === 201 && c.json.data.level === 0, c.status)
check('reintento idéntico → 200 mismo id', (await call('/api/reports', { method: 'POST', token: A.token, body })).json?.data?.id === id)
check('misma clave otro cuerpo → 409', (await call('/api/reports', { method: 'POST', token: A.token, body: { ...body, type: 'fire' } })).status === 409)
check('B no ve el reporte de A → 404', (await call(`/api/reports/${id}`, { token: B.token })).status === 404)
check('coord. zona 2 → 404 detalle y transición', (await call(`/api/coordinator/alerts/${id}`, { token: K2.token })).status === 404 &&
  (await call(`/api/coordinator/alerts/${id}/transitions`, { method: 'POST', token: K2.token, body: { action: 'take', expected_version: 1 } })).status === 404)
const take = await call(`/api/coordinator/alerts/${id}/transitions`, { method: 'POST', token: K1.token, body: { action: 'take', expected_version: 1 } })
check('coord. zona 1 toma → v2', take.json?.data?.version === 2, take.status)
check('versión vieja → 409', (await call(`/api/coordinator/alerts/${id}/transitions`, { method: 'POST', token: K1.token, body: { action: 'close', expected_version: 1, resolution: 'x' } })).status === 409)

// RLS: acceso DIRECTO con la anon key + JWT de usuario (sin pasar por la API)
const ins = await A.rest.from('alerts').insert({ zone_id: ZONE1, type: 'fire', level: 3 })
check('RLS: residente no inserta alerts directo', !!ins.error, ins.status)
const upd = await A.rest.from('alerts').update({ status: 'resolved' }).eq('id', id).select()
check('RLS: residente no actualiza alerts directo', !!upd.error || (upd.data || []).length === 0, upd.status)
const ev = await K1.rest.from('alert_events').insert({ alert_id: id, seq: 99, action: 'report.closed', to_status: 'resolved', actor_role: 'coordinator' })
check('RLS: coordinador no escribe historial directo', !!ev.error, ev.status)
const sel = await B.rest.from('alerts').select('id').eq('id', id)
check('RLS: residente B no lee alerts directo', !!sel.error || (sel.data || []).length === 0, sel.status)
const coordSelf = await A.rest.from('users_coord').insert({ email: `residente.a@${DOMAIN}` })
check('RLS: residente no se autoasigna coordinador', !!coordSelf.error, coordSelf.status)

// U5: banco de escenarios con Auth real (misma matriz que modo demo).
const TOKENS = { [PERSONAS.residenteA]: A.token, [PERSONAS.residenteB]: B.token, [PERSONAS.coordZ1]: K1.token, [PERSONAS.coordZ2]: K2.token }
const matrixCall = (persona, { method, path, body }) => call(path, { method, body, token: persona ? TOKENS[persona] : undefined })
const seeded = await seedViaApi(matrixCall)
for (const r of await runAccessMatrix(matrixCall, seeded)) {
  check(`matriz ${describeRow(r.row)} → ${r.expect}`, r.ok, { status: r.status, detail: r.detail })
}

console.log(`\nReporte de prueba: ${id ? id.slice(0, 8) : '—'} (persistencia tras reinicio: reiniciar la app y volver a consultar /api/reports/${id ? id.slice(0, 8) : ''}…)`)
console.log(failures ? `${failures} fallo(s)` : 'Todo OK')
process.exit(failures ? 1 : 0)
