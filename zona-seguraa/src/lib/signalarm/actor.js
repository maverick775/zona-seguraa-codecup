// lib/signalarm/actor.js
// Resuelve quién hace la petición. La identidad SIEMPRE sale de la sesión
// (cookie de Supabase Auth, Bearer, o cookie demo firmada), nunca del cuerpo.
import { createServerClient as createSsrClient } from '@supabase/ssr'
import { IS_DEMO_MODE } from './config.js'
import { DEMO_COOKIE, verifyDemoSession } from './demo-session.js'
import { createServerClient } from '@/lib/supabase-server'
import { DomainError } from './domain.js'

function cookieAdapter(request) {
  return {
    getAll: () => request.cookies.getAll(),
    setAll: () => {}, // Las API routes no refrescan la sesión; lo hace el middleware.
  }
}

async function getSupabaseUser(request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) throw new DomainError(503, 'auth-unavailable', 'Autenticación no configurada')
  const supabase = createSsrClient(url, anon, { cookies: cookieAdapter(request) })
  const auth = request.headers.get('authorization')
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : undefined
  const { data, error } = await supabase.auth.getUser(token)
  if (error) {
    // 4xx de Auth = token inválido o ausente; otros = servicio no disponible.
    if (error.status && error.status < 500) return null
    if (/session missing/i.test(error.message || '')) return null
    console.error('[signalarm.actor]', { code: error.status, message: error.message })
    throw new DomainError(503, 'auth-unavailable', 'No se pudo verificar la sesión')
  }
  return data?.user || null
}

async function loadCoordinator(email) {
  const db = createServerClient()
  const { data: coord, error } = await db.from('users_coord').select('id, role').eq('email', email).maybeSingle()
  if (error) {
    console.error('[signalarm.actor]', { op: 'users_coord', code: error.code })
    throw new DomainError(503, 'storage-unavailable', 'No se pudo verificar el rol')
  }
  if (!coord) return null
  const { data: zones, error: zErr } = await db.from('coordinator_zones').select('zone_id').eq('coord_id', coord.id)
  if (zErr) {
    console.error('[signalarm.actor]', { op: 'coordinator_zones', code: zErr.code })
    throw new DomainError(503, 'storage-unavailable', 'No se pudo verificar el rol')
  }
  return { coordId: coord.id, zoneIds: (zones || []).map((z) => z.zone_id) }
}

// Devuelve { userId, displayName, role: 'resident'|'coordinator', coordId?, zoneIds, source } o null.
export async function getActor(request) {
  if (IS_DEMO_MODE) {
    const persona = await verifyDemoSession(request.cookies.get(DEMO_COOKIE)?.value)
    if (!persona) return null
    return {
      userId: persona.userId,
      displayName: persona.displayName,
      role: persona.role,
      coordId: persona.coordId || null,
      zoneIds: persona.zoneIds,
      source: 'demo',
    }
  }
  const user = await getSupabaseUser(request)
  if (!user) return null
  const displayName = user.user_metadata?.display_name || (user.email ? user.email.split('@')[0] : 'Residente')
  const coord = user.email ? await loadCoordinator(user.email) : null
  return {
    userId: user.id,
    displayName,
    role: coord ? 'coordinator' : 'resident',
    coordId: coord?.coordId || null,
    zoneIds: coord?.zoneIds || [],
    source: 'supabase',
  }
}

export async function requireActor(request) {
  const actor = await getActor(request)
  if (!actor) throw new DomainError(401, 'unauthorized', 'Inicia sesión para continuar')
  return actor
}

export async function requireCoordinator(request) {
  const actor = await requireActor(request)
  if (actor.role !== 'coordinator') throw new DomainError(403, 'forbidden', 'Solo coordinación puede hacer esto')
  return actor
}
