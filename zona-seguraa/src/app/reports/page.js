'use client'

import Link from 'next/link'
import { useApiResource } from '@/components/api'
import ReportCard from '@/components/signalarm/ReportCard'
import { EmptyNotice, ErrorNotice, LoadingNotice } from '@/components/Notice'

export default function MyReportsPage() {
  const res = useApiResource('/api/reports')
  const state = { ...res, rows: res.data || [] }
  const load = res.reload

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Mis reportes</h1>
        <button onClick={load} className="px-3 py-2 min-h-[44px] border border-gray-400 rounded-lg text-sm text-gray-900 focus-visible:outline-2 focus-visible:outline-slate-900">
          Actualizar
        </button>
      </div>
      {state.loading && <LoadingNotice />}
      {state.error && <ErrorNotice onRetry={load}>{state.error}</ErrorNotice>}
      {!state.loading && !state.error && state.rows.length === 0 && (
        <EmptyNotice title="Aún no tienes reportes">
          <Link href="/alerts/create" className="underline">Hacer un reporte</Link>
        </EmptyNotice>
      )}
      <ul className="space-y-3">
        {state.rows.map((r) => (
          <li key={r.id}>
            <ReportCard report={r} href={`/reports/${r.id}`} />
          </li>
        ))}
      </ul>
    </div>
  )
}
