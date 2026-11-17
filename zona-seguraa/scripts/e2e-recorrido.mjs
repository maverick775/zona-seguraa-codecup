// R1: recorrido principal en navegador con DOS sesiones de coordinación (modo demo LOCAL).
// residente crea y sigue → coord. A toma → coord. B (otra sesión, versión vieja) choca → A cierra →
// residente ve Cerrado + orientación → historial coherente. Repetible: no depende de datos previos.
// Usa el Playwright preinstalado globalmente (no es dependencia del proyecto).
//   BASE_URL=http://localhost:3100 node scripts/e2e-recorrido.mjs
import { createRequire } from 'node:module'
import { execSync } from 'node:child_process'
const require = createRequire(import.meta.url)
const { chromium } = require(`${execSync('npm root -g').toString().trim()}/playwright`)

const BASE = process.env.BASE_URL || 'http://localhost:3100'
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(BASE)) { console.error('BASE_URL debe ser local'); process.exit(2) }
const SHOTS = process.env.SHOTS_DIR || null
let failures = 0
const check = (name, cond, extra) => { console.log(`${cond ? 'ok  ' : 'FAIL'} ${name}${cond ? '' : ' → ' + JSON.stringify(extra)}`); if (!cond) failures++ }

const browser = await chromium.launch()
async function session(persona) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'es-MX' })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  const r = await page.request.post(`${BASE}/api/demo/session`, { data: { persona } })
  if (!r.ok()) throw new Error(`login ${persona}: ${r.status()}`)
  return { page, errors }
}
const settle = (p) => p.waitForLoadState('load').then(() => p.waitForTimeout(600))
const shot = async (p, name) => { if (SHOTS) await p.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true }) }

try {
  const res = await session('residente-ana')
  const coordA = await session('coord-liberacion')
  const coordB = await session('coord-liberacion')   // segunda sesión del mismo rol
  const other = await session('coord-rotonda')

  // 1. Residente crea
  const desc = `Recorrido R1 ${Date.now()}`
  await res.page.goto(`${BASE}/alerts/create`); await settle(res.page)
  await res.page.getByRole('radio', { name: /Seguridad/ }).check({ force: true })
  await res.page.getByLabel(/Descripción/).fill(desc)
  await res.page.getByRole('button', { name: 'Enviar reporte' }).dblclick()
  await res.page.getByRole('heading', { name: 'Reporte registrado' }).waitFor()
  const folioText = await res.page.locator('dd.font-mono').first().innerText()
  check('residente: confirmación solo tras guardar, con folio', /^[0-9A-F]{8}$/.test(folioText), folioText)
  check('residente: orientación "registrado no es atendido"', await res.page.locator('[data-code=received-not-attended]').isVisible())
  await shot(res.page, 'r1-1-confirmacion')
  await res.page.getByRole('link', { name: 'Ver seguimiento' }).click(); await settle(res.page)
  const reportUrl = res.page.url()
  const id = reportUrl.split('/').pop()
  const mine = await res.page.request.get(`${BASE}/api/reports`)
  check('doble clic → un solo reporte con esa descripción', (await mine.json()).data.filter((r) => r.description === desc).length === 1)

  // 2. Coordinación: ambas sesiones abren el mismo reporte (versión 1)
  for (const c of [coordA, coordB]) { await c.page.goto(`${BASE}/coordinator/reports/${id}`); await settle(c.page) }
  check('coord. A ve Tomar', await coordA.page.getByRole('button', { name: 'Tomar reporte' }).isVisible())
  check('coord. B ve Tomar', await coordB.page.getByRole('button', { name: 'Tomar reporte' }).isVisible())
  const otherRes = await other.page.request.get(`${BASE}/api/coordinator/alerts/${id}`)
  check('coord. de otra zona → 404', otherRes.status() === 404, otherRes.status())

  // 3. A toma; B intenta con versión vieja → conflicto, recarga, ya no ofrece Tomar
  await coordA.page.getByRole('button', { name: 'Tomar reporte' }).click()
  await coordA.page.getByText(/quedó como “En atención”/).waitFor()
  check('coord. A: En atención', true)
  await coordB.page.getByRole('button', { name: 'Tomar reporte' }).click()
  await coordB.page.getByText(/Otra persona actualizó este reporte/).waitFor()
  await settle(coordB.page)
  check('coord. B: conflicto de versión explicado', true)
  check('coord. B: tras recargar ya no ofrece Tomar', !(await coordB.page.getByRole('button', { name: 'Tomar reporte' }).isVisible()))
  check('coord. B: explica por qué no puede Tomar', await coordB.page.getByText(/Tomar: No aplica en el estado actual/).isVisible())
  await shot(coordB.page, 'r1-2-conflicto-coord-b')

  // 4. A cierra con resolución
  await coordA.page.getByRole('button', { name: 'Cerrar con resolución' }).click()
  await coordA.page.getByLabel('¿Cómo se resolvió?').fill('Se verificó en sitio (recorrido de prueba)')
  await coordA.page.getByRole('button', { name: /Confirmar cierre/ }).click()
  await coordA.page.getByText(/quedó como “Cerrado”/).waitFor(); await settle(coordA.page)
  const hist = await coordA.page.locator('section[aria-labelledby=historial] li p.font-semibold').allInnerTexts()
  check('historial: creado → tomado → cerrado', hist.join('|') === 'Reporte creado|Tomado por coordinación|Cerrado', hist)
  await shot(coordA.page, 'r1-3-cierre-historial')

  // 5. B (versión vieja de nuevo) intenta descartar → 409 y nada cambia
  const stale = await coordB.page.request.post(`${BASE}/api/coordinator/alerts/${id}/transitions`, { data: { action: 'dismiss', expected_version: 2, dismiss_reason: 'duplicate' } })
  check('coord. B con versión 2 tras el cierre → 409', stale.status() === 409, stale.status())

  // 6. Residente ve Cerrado + orientación de cierre, sin datos internos
  await res.page.reload(); await settle(res.page)
  check('residente: estado Cerrado', await res.page.getByText('Coordinación lo cerró.').isVisible())
  check('residente: cierre ≠ ausencia de riesgo', await res.page.locator('[data-code=closed-not-guarantee]').isVisible())
  const view = await (await res.page.request.get(`${BASE}/api/reports/${id}`)).json()
  check('residente: sin resolución interna ni versión', !('resolution' in view.data) && !('version' in view.data), Object.keys(view.data))
  await shot(res.page, 'r1-4-residente-cerrado')

  // 7. Historial final consistente en ambas sesiones de coordinación
  const hB = await (await coordB.page.request.get(`${BASE}/api/coordinator/alerts/${id}`)).json()
  check('coord. B lee el mismo historial (3 eventos, v3)', hB.data.history.length === 3 && hB.data.version === 3, { n: hB.data.history.length, v: hB.data.version })

  for (const [name, s] of Object.entries({ res, coordA, coordB })) check(`sin errores de página (${name})`, s.errors.length === 0, s.errors)
} finally {
  await browser.close()
}
console.log(failures ? `\n${failures} fallo(s)` : '\nTodo OK')
process.exit(failures ? 1 : 0)
