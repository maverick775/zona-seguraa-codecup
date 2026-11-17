// Ejecuta las API routes de Next EN PROCESO (sin servidor) en modo demo.
// Uso solo en pruebas: fija variables de entorno de demo antes de importar las rutas.
import { register } from 'node:module'
import { randomBytes } from 'node:crypto'

register('./alias-hooks.mjs', import.meta.url)

// Al evaluar este módulo (impórtalo ANTES que config.js): config.js lee el modo al cargarse.
process.env.NEXT_PUBLIC_SIGNALARM_DATA_MODE = 'demo'
process.env.SIGNALARM_DEMO_SECRET ||= randomBytes(32).toString('base64')
delete process.env.VERCEL
delete process.env.VERCEL_ENV

export async function createInProcessApi() {
  globalThis.__signalarmDemoStore = undefined // memoria limpia por instancia

  const { NextRequest } = await import('next/server.js')
  const { signDemoSession, DEMO_COOKIE } = await import('../../src/lib/signalarm/demo-session.js')
  const r = (p) => import(`../../src/app/api/${p}/route.js`)
  const ROUTES = [
    [/^\/api\/me$/, () => r('me'), []],
    [/^\/api\/reports$/, () => r('reports'), []],
    [/^\/api\/reports\/([^/]+)$/, () => r('reports/[id]'), ['id']],
    [/^\/api\/coordinator\/alerts$/, () => r('coordinator/alerts'), []],
    [/^\/api\/coordinator\/alerts\/([^/]+)$/, () => r('coordinator/alerts/[id]'), ['id']],
    [/^\/api\/coordinator\/alerts\/([^/]+)\/transitions$/, () => r('coordinator/alerts/[id]/transitions'), ['id']],
    [/^\/api\/alerts$/, () => r('alerts'), []],
    [/^\/api\/alerts\/([^/]+)$/, () => r('alerts/[id]'), ['id']],
    [/^\/api\/votes$/, () => r('votes'), []],
  ]
  const cookies = new Map()

  async function call(persona, { method = 'GET', path, body }) {
    const pathname = path.split('?')[0]
    const route = ROUTES.find(([re]) => re.test(pathname))
    if (!route) throw new Error(`Ruta no mapeada: ${pathname}`)
    const [re, load, names] = route
    const match = pathname.match(re)
    const params = Object.fromEntries(names.map((n, i) => [n, match[i + 1]]))
    const mod = await load()
    const handler = mod[method]
    if (!handler) return { status: 405, json: null }
    const headers = { 'content-type': 'application/json' }
    if (persona) {
      if (!cookies.has(persona)) cookies.set(persona, await signDemoSession(persona))
      headers.cookie = `${DEMO_COOKIE}=${cookies.get(persona)}`
    }
    const req = new NextRequest(`http://localhost${path}`, {
      method, headers, body: body === undefined ? undefined : JSON.stringify(body),
    })
    const res = await handler(req, { params: Promise.resolve(params) })
    const text = await res.text()
    let json = null
    try { json = JSON.parse(text) } catch {}
    return { status: res.status, json, headers: res.headers }
  }
  return { call }
}
