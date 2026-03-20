// lib/supabase-server.js
// Cliente Supabase para el SERVIDOR (API routes y server components)
// Usa SUPABASE_SERVICE_ROLE_KEY — NUNCA exponer en el frontend
// Bypasea Row Level Security: úsalo solo para operaciones de escritura confiables

import { createClient } from '@supabase/supabase-js'

// Cliente con permisos totales (service role) — para API routes
export function createServerClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error('Falta NEXT_PUBLIC_SUPABASE_URL en las variables de entorno')
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Falta SUPABASE_SERVICE_ROLE_KEY en las variables de entorno')
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false     // Las API routes son stateless
      }
    }
  )
}

// Helper para verificar que el usuario de una request es coordinador autenticado
// Uso en API routes protegidas: const coord = await getAuthenticatedCoordinator(request)
export async function getAuthenticatedCoordinator(request) {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null

  const token = authHeader.replace('Bearer ', '')

  // Verificar el token contra Supabase Auth
  const { createClient: createAdminClient } = await import('@supabase/supabase-js')
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  const { data: { user }, error } = await adminClient.auth.getUser(token)

  if (error || !user) return null
  return user
}

