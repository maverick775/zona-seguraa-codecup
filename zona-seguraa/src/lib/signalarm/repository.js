// lib/signalarm/repository.js — elige el repositorio según el modo explícito.
import { IS_DEMO_MODE } from './config.js'
import { getDemoRepository } from './repo-memory.js'
import { createSupabaseRepository } from './repo-supabase.js'

export function getRepository() {
  if (!IS_DEMO_MODE) return createSupabaseRepository()
  // Segunda barrera (la primera está en middleware): nunca memoria en Vercel.
  if (process.env.VERCEL || process.env.VERCEL_ENV) {
    throw new Error('Modo demo bloqueado en Vercel: los datos en memoria no son persistentes')
  }
  return getDemoRepository()
}
