import { NextResponse } from 'next/server'
import { DEMO_PERSONAS, IS_DEMO_MODE } from '@/lib/signalarm/config'
import { DEMO_COOKIE, DEMO_SESSION_TTL_S, demoSecretConfigured, signDemoSession } from '@/lib/signalarm/demo-session'
import { fail, handle, ok, readJson } from '@/lib/signalarm/http'

// Sesión de DEMOSTRACIÓN. Solo existe con NEXT_PUBLIC_SIGNALARM_DATA_MODE=demo;
// en cualquier otro modo responde 404.

export const GET = handle('demo.session.GET', async (_request, _ctx, requestId) => {
  if (!IS_DEMO_MODE) return fail(404, 'not-found', 'No disponible', { requestId })
  return ok(
    {
      secret_configured: demoSecretConfigured(),
      personas: DEMO_PERSONAS.map(({ key, displayName, role }) => ({ key, display_name: displayName, role })),
    },
    { requestId }
  )
})

export const POST = handle('demo.session.POST', async (request, _ctx, requestId) => {
  if (!IS_DEMO_MODE) return fail(404, 'not-found', 'No disponible', { requestId })
  if (!demoSecretConfigured()) {
    return fail(503, 'demo-not-configured', 'Falta SIGNALARM_DEMO_SECRET (mínimo 32 caracteres)', { requestId })
  }
  const body = await readJson(request)
  const persona = DEMO_PERSONAS.find((p) => p.key === body?.persona)
  if (!persona) return fail(400, 'validation-error', 'Persona demo desconocida', { requestId })
  const res = ok({ display_name: persona.displayName, role: persona.role }, { requestId })
  res.cookies.set(DEMO_COOKIE, await signDemoSession(persona.key), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production' && process.env.SIGNALARM_DEMO_INSECURE_COOKIE !== '1',
    path: '/',
    maxAge: DEMO_SESSION_TTL_S,
  })
  return res
})

export const DELETE = handle('demo.session.DELETE', async (_request, _ctx, requestId) => {
  if (!IS_DEMO_MODE) return fail(404, 'not-found', 'No disponible', { requestId })
  const res = NextResponse.json({ data: { signed_out: true }, error: null }, { headers: { 'X-Request-Id': requestId } })
  res.cookies.set(DEMO_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 })
  return res
})
