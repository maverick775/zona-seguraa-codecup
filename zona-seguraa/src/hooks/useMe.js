'use client'

import { useCallback, useEffect, useState } from 'react'

async function fetchMe() {
  try {
    const res = await fetch('/api/me', { cache: 'no-store' })
    if (res.status === 401) return { status: 'signed-out', me: null, error: null }
    const body = await res.json().catch(() => null)
    if (!res.ok || !body?.data) {
      return { status: 'error', me: null, error: body?.error?.message || 'No se pudo verificar la sesión' }
    }
    return { status: 'signed-in', me: body.data, error: null }
  } catch {
    return { status: 'error', me: null, error: 'Sin conexión' }
  }
}

// Estado de sesión desde GET /api/me. status: loading | signed-in | signed-out | error
export function useMe() {
  const [state, setState] = useState({ status: 'loading', me: null, error: null })

  const load = useCallback(async () => setState(await fetchMe()), [])

  useEffect(() => {
    let cancelled = false
    fetchMe().then((s) => {
      if (!cancelled) setState(s)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return { ...state, reload: load }
}
