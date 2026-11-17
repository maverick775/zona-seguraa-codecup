// lib/signalarm/http.js — respuestas { data, error } con request id.
import { NextResponse } from 'next/server'
import { DomainError } from './domain.js'

export function newRequestId(request) {
  const incoming = request?.headers?.get('x-request-id')
  return incoming && /^[\w-]{8,64}$/.test(incoming) ? incoming : crypto.randomUUID()
}

export function ok(data, { status = 200, requestId, headers = {} } = {}) {
  return NextResponse.json(
    { data, error: null },
    { status, headers: { 'X-Request-Id': requestId, 'Cache-Control': 'no-store', ...headers } }
  )
}

export function fail(status, code, message, { requestId, details } = {}) {
  return NextResponse.json(
    { data: null, error: { code, message, ...(details ? { details } : {}) } },
    { status, headers: { 'X-Request-Id': requestId, 'Cache-Control': 'no-store' } }
  )
}

export async function readJson(request) {
  try {
    return await request.json()
  } catch {
    throw new DomainError(400, 'invalid-json', 'El cuerpo no es JSON válido')
  }
}

// Envuelve un handler: errores de dominio → su código; cualquier otro → 500 sin detalles.
export function handle(route, fn) {
  return async (request, ctx) => {
    const requestId = newRequestId(request)
    const started = Date.now()
    let status = 500
    try {
      const res = await fn(request, ctx, requestId)
      status = res.status
      return res
    } catch (err) {
      if (err instanceof DomainError) {
        status = err.status
        return fail(err.status, err.code, err.message, { requestId, details: Object.keys(err.extra).length ? err.extra : undefined })
      }
      console.error(`[${route}] unhandled`, { requestId, message: err?.message })
      return fail(500, 'internal-error', 'Ocurrió un error inesperado. Intenta de nuevo.', { requestId })
    } finally {
      console.info(`[${route}]`, { requestId, status, ms: Date.now() - started })
    }
  }
}
