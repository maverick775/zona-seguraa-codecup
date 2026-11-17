'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { IS_DEMO_MODE } from '@/lib/signalarm/config'
import { createClient, isSupabaseConfigured } from '@/lib/supabase'
import { apiFetch } from '@/components/api'
import { ErrorNotice, LoadingNotice } from '@/components/Notice'

// Solo se aceptan rutas internas como destino (evita redirecciones abiertas).
function safeNext(next) {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/'
}

function DemoLogin({ next }) {
  const [personas, setPersonas] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(null)

  useEffect(() => {
    apiFetch('/api/demo/session').then((r) => {
      if (!r.ok) return setError(r.error.message)
      if (!r.data.secret_configured) return setError('Falta configurar SIGNALARM_DEMO_SECRET en el servidor (mínimo 32 caracteres).')
      setPersonas(r.data.personas)
    })
  }, [])

  const choose = async (key) => {
    setBusy(key)
    setError('')
    const r = await apiFetch('/api/demo/session', { method: 'POST', body: JSON.stringify({ persona: key }) })
    if (!r.ok) {
      setError(r.error.message)
      setBusy(null)
      return
    }
    window.location.assign(next) // recarga completa para que el encabezado lea la nueva sesión
  }

  if (error) return <ErrorNotice>{error}</ErrorNotice>
  if (!personas) return <LoadingNotice />
  return (
    <fieldset>
      <legend className="text-sm text-gray-800 mb-3">
        Elige una identidad de demostración. Son cuentas ficticias.
      </legend>
      <ul className="space-y-2">
        {personas.map((p) => (
          <li key={p.key}>
            <button
              onClick={() => choose(p.key)}
              disabled={!!busy}
              className="w-full text-left px-4 py-3 min-h-[44px] rounded-lg border border-gray-300 bg-white hover:border-slate-700 focus-visible:outline-2 focus-visible:outline-slate-900 disabled:opacity-60"
            >
              <span className="font-medium text-gray-900">{p.display_name}</span>
              <span className="block text-xs text-gray-700">{p.role === 'coordinator' ? 'Coordinación' : 'Residente'}</span>
              {busy === p.key && <span className="sr-only">Entrando…</span>}
            </button>
          </li>
        ))}
      </ul>
    </fieldset>
  )
}

function PasswordLogin({ next }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (!isSupabaseConfigured()) {
    return <ErrorNotice>La autenticación no está configurada en este entorno.</ErrorNotice>
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data, error: authError } = await createClient().auth.signInWithPassword({ email: email.trim(), password })
      if (authError || !data?.session) {
        setError('Credenciales incorrectas. Verifica tu correo y contraseña.')
        setLoading(false)
        return
      }
      window.location.assign(next)
    } catch {
      setError('No se pudo contactar el servicio de autenticación.')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="mb-4">
        <label htmlFor="email" className="block text-sm font-semibold text-gray-800 mb-1">Correo electrónico</label>
        <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-3 border border-gray-400 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-slate-700" />
      </div>
      <div className="mb-4">
        <label htmlFor="password" className="block text-sm font-semibold text-gray-800 mb-1">Contraseña</label>
        <input id="password" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-3 border border-gray-400 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-slate-700" />
      </div>
      {error && <div className="mb-4"><ErrorNotice>{error}</ErrorNotice></div>}
      <button type="submit" disabled={loading || !email || !password}
        className="w-full py-3 min-h-[44px] bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:bg-gray-400">
        {loading ? 'Ingresando…' : 'Ingresar'}
      </button>
    </form>
  )
}

function LoginContent() {
  const params = useSearchParams()
  const next = safeNext(params.get('next'))
  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Iniciar sesión</h1>
      <p className="text-gray-700 mb-6">Necesitas una sesión para reportar o coordinar.</p>
      {IS_DEMO_MODE ? <DemoLogin next={next} /> : <PasswordLogin next={next} />}
      <p className="mt-6 text-sm">
        <Link href="/" className="text-slate-800 underline">Volver al inicio</Link>
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingNotice />}>
      <LoginContent />
    </Suspense>
  )
}
