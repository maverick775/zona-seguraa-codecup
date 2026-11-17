'use client'

import { useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { DISMISS_REASONS, RESOLUTION_MAX, NOTE_MAX } from '@/lib/signalarm/domain'
import {
  DISMISS_REASON_LABELS, LEVEL_LABELS, STATUS_LABELS, TYPE_LABELS, formatDateTime, shortId,
} from '@/lib/signalarm/labels'
import { apiFetch, useApiResource } from '@/components/api'
import StatusBadge from '@/components/StatusBadge'
import Timeline from '@/components/signalarm/Timeline'
import { BASE_POLICY, getAvailableActions } from '@/lib/signalarm/policy'
import { useMe } from '@/hooks/useMe'
import { ErrorNotice, LoadingNotice } from '@/components/Notice'

export default function CoordinatorReportPage() {
  const { id } = useParams()
  const resource = useApiResource(`/api/coordinator/alerts/${id}`)
  const state = { ...resource, alert: resource.data }
  const load = resource.reload
  const [mode, setMode] = useState(null) // null | 'close' | 'dismiss'
  const [resolution, setResolution] = useState('')
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState(null)
  const [flash, setFlash] = useState('')
  const statusRef = useRef(null)
  const { me } = useMe()

  const act = async (action) => {
    if (busy || !state.alert) return
    setBusy(true)
    setActionError(null)
    const body = { action, expected_version: state.alert.version }
    if (action === 'close') body.resolution = resolution
    if (action === 'dismiss') {
      body.dismiss_reason = reason
      if (note.trim()) body.note = note
    }
    const r = await apiFetch(`/api/coordinator/alerts/${id}/transitions`, { method: 'POST', body: JSON.stringify(body) })
    setBusy(false)
    if (!r.ok) {
      if (r.error.code === 'version-conflict') {
        setActionError({ message: 'Otra persona actualizó este reporte. Cargamos su estado actual; revisa antes de actuar.' })
        await load()
      } else {
        setActionError({ message: `No se aplicó la acción. ${r.error.message}`, details: r.error.details })
      }
      return
    }
    setMode(null)
    setResolution('')
    setReason('')
    setNote('')
    setFlash(`Listo: el reporte quedó como “${STATUS_LABELS[r.data.status]}”.`)
    await load()
    statusRef.current?.focus()
  }

  if (state.loading && !state.alert) return <LoadingNotice />
  if (state.error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <ErrorNotice onRetry={state.status >= 500 || state.status === 0 ? load : undefined}>
          {state.status === 404 ? 'Reporte no encontrado o fuera de tus zonas.' : state.status === 403 ? 'Solo coordinación puede ver esto.' : state.error}
        </ErrorNotice>
        <Link href="/coordinator/reports" className="inline-block mt-4 underline">← Bandeja</Link>
      </div>
    )
  }

  const a = state.alert
  // Orientación estable (BASE_POLICY = reglas vigentes; paridad con el servidor probada en
  // scripts/tests/policy-parity.test.mjs). El servidor decide; esto solo explica la UI.
  const actor = me ? { role: me.role, zoneIds: me.zone_ids || [] } : { role: 'coordinator', zoneIds: [a.zone_id] }
  const guide = getAvailableActions({ policy: BASE_POLICY, actor, alert: a, knownVersion: a.version })
  const real = Object.fromEntries(guide.actions.filter((x) => x.kind === 'real').map((x) => [x.action, x]))
  const canTake = real.take.available
  const canClose = real.close.available
  const canDismiss = real.dismiss.available
  const detail = actionError?.details || {}

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <p className="mb-4 text-sm"><Link href="/coordinator/reports" className="underline text-slate-900">← Bandeja</Link></p>

      <article className="bg-white border border-gray-300 rounded-xl p-5 mb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-bold text-gray-900">Folio {shortId(a.id)} · {TYPE_LABELS[a.type]}</h1>
          <StatusBadge status={a.status} />
        </div>
        <p ref={statusRef} tabIndex={-1} role="status" aria-live="polite" className="text-sm text-green-900 mt-2 focus:outline-none">{flash}</p>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm mt-3">
          <dt className="text-gray-700">Nivel</dt><dd className="text-gray-900">{LEVEL_LABELS[a.level]}</dd>
          <dt className="text-gray-700">Referencia</dt><dd className="text-gray-900">{a.node?.name || 'Sin punto de referencia'}</dd>
          <dt className="text-gray-700">Reportó</dt><dd className="text-gray-900">{a.reporter.display_name}</dd>
          <dt className="text-gray-700">Creado</dt><dd className="text-gray-900">{formatDateTime(a.created_at)}</dd>
          {a.resolution && (<><dt className="text-gray-700">Resolución</dt><dd className="text-gray-900">{a.resolution}</dd></>)}
          {a.dismiss_reason && (<><dt className="text-gray-700">Motivo</dt><dd className="text-gray-900">{DISMISS_REASON_LABELS[a.dismiss_reason]}</dd></>)}
          <dt className="text-gray-700">Versión</dt><dd className="text-gray-900">{a.version}</dd>
        </dl>
        {a.description && <p className="mt-4 text-sm text-gray-900 bg-gray-50 rounded-lg p-3">{a.description}</p>}
      </article>

      <section aria-labelledby="acciones" className="bg-white border border-gray-300 rounded-xl p-5 mb-4">
        <h2 id="acciones" className="font-semibold text-gray-900 mb-1">Acciones</h2>
        <p className="text-xs text-gray-700 mb-3">Solo cambian el estado en Signalarm. No envían notificaciones, SMS ni activan dispositivos.</p>
        {actionError && <div className="mb-3"><ErrorNotice>{actionError.message}</ErrorNotice></div>}
        {!canDismiss && <p className="text-sm text-gray-800">Este reporte ya está {STATUS_LABELS[a.status].toLowerCase()}; no hay acciones pendientes.</p>}
        {canDismiss && (!canTake || !canClose) && (
          <ul className="text-xs text-gray-700 mb-3" aria-label="Acciones no disponibles">
            {['take', 'close'].filter((k) => !real[k].available).map((k) => (
              <li key={k}>{k === 'take' ? 'Tomar' : 'Cerrar'}: {real[k].explanation}</li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap gap-2">
          {canTake && (
            <button onClick={() => act('take')} disabled={busy}
              className="px-4 py-3 min-h-[44px] bg-blue-800 text-white rounded-lg font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-900 disabled:bg-gray-400">
              {busy ? 'Aplicando…' : 'Tomar reporte'}
            </button>
          )}
          {canClose && (
            <button onClick={() => setMode(mode === 'close' ? null : 'close')} aria-expanded={mode === 'close'} disabled={busy}
              className="px-4 py-3 min-h-[44px] bg-green-800 text-white rounded-lg font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-900 disabled:bg-gray-400">
              Cerrar con resolución
            </button>
          )}
          {canDismiss && (
            <button onClick={() => setMode(mode === 'dismiss' ? null : 'dismiss')} aria-expanded={mode === 'dismiss'} disabled={busy}
              className="px-4 py-3 min-h-[44px] border-2 border-gray-700 text-gray-900 rounded-lg font-semibold focus-visible:outline-2 focus-visible:outline-slate-900 disabled:opacity-50">
              Descartar
            </button>
          )}
        </div>

        {mode === 'close' && canClose && (
          <form className="mt-4" onSubmit={(e) => { e.preventDefault(); act('close') }}>
            <label htmlFor="resolution" className="block text-sm font-semibold text-gray-900 mb-1">¿Cómo se resolvió?</label>
            <textarea id="resolution" required rows={3} maxLength={RESOLUTION_MAX} value={resolution} onChange={(e) => setResolution(e.target.value)}
              aria-invalid={!!detail.resolution} className="w-full px-3 py-2 border border-gray-400 rounded-lg bg-white text-gray-900" />
            {detail.resolution && <p className="text-sm text-red-800">{detail.resolution}</p>}
            <button type="submit" disabled={busy || !resolution.trim()} className="mt-2 px-4 py-3 min-h-[44px] bg-green-800 text-white rounded-lg font-semibold disabled:bg-gray-400">
              {busy ? 'Cerrando…' : 'Confirmar cierre'}
            </button>
          </form>
        )}

        {mode === 'dismiss' && canDismiss && (
          <form className="mt-4" onSubmit={(e) => { e.preventDefault(); act('dismiss') }}>
            <label htmlFor="reason" className="block text-sm font-semibold text-gray-900 mb-1">Motivo</label>
            <select id="reason" required value={reason} onChange={(e) => setReason(e.target.value)} aria-invalid={!!detail.dismiss_reason}
              className="w-full px-3 py-2 min-h-[44px] border border-gray-400 rounded-lg bg-white text-gray-900">
              <option value="">Selecciona…</option>
              {DISMISS_REASONS.map((r) => <option key={r} value={r}>{DISMISS_REASON_LABELS[r]}</option>)}
            </select>
            <label htmlFor="note" className="block text-sm font-semibold text-gray-900 mt-3 mb-1">
              Nota {reason === 'other' ? '(obligatoria)' : '(opcional)'}
            </label>
            <textarea id="note" rows={2} maxLength={NOTE_MAX} value={note} onChange={(e) => setNote(e.target.value)} aria-invalid={!!detail.note}
              className="w-full px-3 py-2 border border-gray-400 rounded-lg bg-white text-gray-900" />
            {detail.note && <p className="text-sm text-red-800">{detail.note}</p>}
            <button type="submit" disabled={busy || !reason || (reason === 'other' && !note.trim())}
              className="mt-2 px-4 py-3 min-h-[44px] bg-gray-800 text-white rounded-lg font-semibold disabled:bg-gray-400">
              {busy ? 'Descartando…' : 'Confirmar descarte'}
            </button>
          </form>
        )}
      </section>

      <div className="bg-white border border-gray-300 rounded-xl p-5">
        <Timeline events={a.history} />
      </div>
    </div>
  )
}
