'use client'

import { useCallback, useEffect, useState } from 'react'

// Carga un recurso al montar y cuando cambia `url`; expone reload().
// El setState ocurre solo en callbacks asíncronos (regla react-hooks/set-state-in-effect).
export function useApiResource(url) {
  const [state, setState] = useState({ loading: true, data: null, error: null, status: 0 })
  const toState = (r) => ({ loading: false, data: r.ok ? r.data : null, error: r.ok ? null : r.error.message, status: r.status })

  useEffect(() => {
    let cancelled = false
    apiFetch(url).then((r) => {
      if (!cancelled) setState(toState(r))
    })
    return () => {
      cancelled = true
    }
  }, [url])

  const reload = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }))
    const r = await apiFetch(url)
    setState(toState(r))
  }, [url])

  return { ...state, reload }
}

// Llamada a las API { data, error } de Signalarm. Nunca convierte un fallo en éxito:
// devuelve { ok:false, status, error } con un mensaje para mostrar.
export async function apiFetch(url, options = {}) {
  let res
  try {
    res = await fetch(url, {
      cache: 'no-store',
      ...options,
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    })
  } catch {
    return { ok: false, status: 0, error: { code: 'network', message: 'Sin conexión. Revisa tu red e intenta de nuevo.' } }
  }
  const body = await res.json().catch(() => null)
  if (!res.ok || !body || body.error) {
    return {
      ok: false,
      status: res.status,
      error: body?.error || { code: 'unexpected', message: `Error del servidor (${res.status})` },
    }
  }
  return { ok: true, status: res.status, data: body.data }
}
