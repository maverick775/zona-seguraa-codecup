// lib/supabase.js
// Cliente Supabase para el NAVEGADOR (componentes 'use client' y hooks)
// Usa NEXT_PUBLIC_ keys — es seguro exponerlas en el frontend
// NO usar para operaciones que requieran permisos elevados

import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

// Helper de uso rápido para queries simples de solo lectura
// Ejemplo: const { data } = await supabase.from('zones').select('*')
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
)

