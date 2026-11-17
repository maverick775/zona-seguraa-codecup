// lib/supabase.js
// Cliente Supabase para el NAVEGADOR (componentes 'use client' y hooks)
// Usa NEXT_PUBLIC_ keys — es seguro exponerlas en el frontend
// NO usar para operaciones que requieran permisos elevados

import { createBrowserClient } from '@supabase/ssr'
import { IS_DEMO_MODE } from '@/lib/signalarm/config'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export function isSupabaseConfigured() {
  return Boolean(URL && ANON)
}

let browserClient = null

// Lanza un error claro si faltan variables: el login no debe "funcionar" sin backend.
export function createClient() {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase no está configurado (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY)')
  }
  if (!browserClient) browserClient = createBrowserClient(URL, ANON)
  return browserClient
}

// Realtime es una mejora opcional (siempre hay botón de actualizar):
// devuelve null en modo demo o sin configuración, y el llamador lo omite.
export function createRealtimeClient() {
  if (IS_DEMO_MODE || !isSupabaseConfigured()) return null
  return createClient()
}
