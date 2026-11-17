'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { LEVEL_LABELS, STATUS_LABELS, TYPE_LABELS, formatDateTime, shortId } from '@/lib/signalarm/labels'
import { useApiResource } from '@/components/api'
import StatusBadge from '@/components/StatusBadge'
import { ErrorNotice, LoadingNotice } from '@/components/Notice'
import StatusSteps from '@/components/signalarm/StatusSteps'
import ReportGuidance from '@/components/signalarm/ReportGuidance'
import { IS_DEMO_MODE } from '@/lib/signalarm/config'

// Seguimiento para quien reportó (vista reducida: sin datos internos de atención).
export default function ReportDetailPage() {
  const { id } = useParams()
  const state = useApiResource(`/api/reports/${id}`)
  const load = state.reload
  const r = state.data
  return (
    <div className="max-w-md mx-auto px-4 py-6">
      <p className="mb-4 text-sm"><Link href="/reports" className="underline text-slate-900">← Mis reportes</Link></p>
      {state.loading && <LoadingNotice />}
      {!state.loading && state.error && (
        <ErrorNotice onRetry={state.status >= 500 || state.status === 0 ? load : undefined}>
          {state.status === 404 ? 'No encontramos este reporte en tu cuenta.' : state.error}
        </ErrorNotice>
      )}
      {!state.loading && state.error && state.status !== 404 && (
        <div className="mt-4"><ReportGuidance phase="unknown" isDemo={IS_DEMO_MODE} /></div>
      )}
      {r && (
        <article className="bg-white border border-gray-300 rounded-xl p-5">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-xl font-bold text-gray-900">Folio {shortId(r.id)}</h1>
            <StatusBadge status={r.status} />
          </div>
          <div className="mt-4"><StatusSteps status={r.status} /></div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm mt-4">
            <dt className="text-gray-700">Tipo</dt><dd className="text-gray-900">{TYPE_LABELS[r.type]}</dd>
            <dt className="text-gray-700">Nivel</dt><dd className="text-gray-900">{LEVEL_LABELS[r.level]}</dd>
            <dt className="text-gray-700">Estado</dt><dd className="text-gray-900">{STATUS_LABELS[r.status]}</dd>
            <dt className="text-gray-700">Referencia</dt><dd className="text-gray-900">{r.node?.name || 'Sin punto de referencia'}</dd>
            <dt className="text-gray-700">Creado</dt><dd className="text-gray-900">{formatDateTime(r.created_at)}</dd>
            <dt className="text-gray-700">Actualizado</dt><dd className="text-gray-900">{formatDateTime(r.updated_at)}</dd>
          </dl>
          {r.description && <p className="mt-4 text-sm text-gray-900 bg-gray-50 rounded-lg p-3">{r.description}</p>}
          <div className="mt-4"><ReportGuidance phase="follow-up" status={r.status} isDemo={IS_DEMO_MODE} /></div>
          <button onClick={load} className="mt-4 px-3 py-2 min-h-[44px] border border-gray-400 rounded-lg text-sm text-gray-900 focus-visible:outline-2 focus-visible:outline-slate-900">
            Actualizar estado
          </button>
        </article>
      )}
    </div>
  )
}
