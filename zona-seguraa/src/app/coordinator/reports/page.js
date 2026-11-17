'use client'

import { useState } from 'react'
import { LEVEL_LABELS, STATUS_LABELS } from '@/lib/signalarm/labels'
import { useApiResource } from '@/components/api'
import ReportCard from '@/components/signalarm/ReportCard'
import FilterChips from '@/components/signalarm/FilterChips'
import { EmptyNotice, ErrorNotice, LoadingNotice } from '@/components/Notice'

const STATUS_FILTERS = [
  { key: 'open', label: 'Pendientes', value: 'active,in_progress' },
  { key: 'active', label: STATUS_LABELS.active, value: 'active' },
  { key: 'in_progress', label: STATUS_LABELS.in_progress, value: 'in_progress' },
  { key: 'resolved', label: STATUS_LABELS.resolved, value: 'resolved' },
  { key: 'false_alarm', label: STATUS_LABELS.false_alarm, value: 'false_alarm' },
  { key: 'all', label: 'Todos', value: '' },
]

export default function CoordinatorInboxPage() {
  const [statusKey, setStatusKey] = useState('open')
  const [level, setLevel] = useState('')
  const params = new URLSearchParams()
  const st = STATUS_FILTERS.find((f) => f.key === statusKey)?.value
  if (st) params.set('status', st)
  if (level !== '') params.set('level', level)
  const res = useApiResource(`/api/coordinator/alerts?${params}`)
  const state = { ...res, rows: res.data || [] }
  const load = res.reload

  if (state.status === 403) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <ErrorNotice>Esta sección es solo para coordinación. Tu cuenta no tiene ese rol.</ErrorNotice>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Bandeja de coordinación</h1>
        <button onClick={load} className="px-3 py-2 min-h-[44px] border border-gray-400 rounded-lg text-sm text-gray-900 focus-visible:outline-2 focus-visible:outline-slate-900">
          Actualizar
        </button>
      </div>

      <div className="flex flex-wrap gap-4 mb-4 items-end">
        <FilterChips legend="Estado" options={STATUS_FILTERS} value={statusKey} onChange={setStatusKey} />
        <div>
          <label htmlFor="level" className="block text-sm font-semibold text-gray-900 mb-1">Nivel</label>
          <select id="level" value={level} onChange={(e) => setLevel(e.target.value)}
            className="px-3 py-2 min-h-[44px] border border-gray-400 rounded-lg bg-white text-gray-900">
            <option value="">Todos</option>
            {[0, 1, 2, 3].map((l) => <option key={l} value={l}>{LEVEL_LABELS[l]}</option>)}
          </select>
        </div>
      </div>

      {state.loading && <LoadingNotice />}
      {!state.loading && state.error && <ErrorNotice onRetry={load}>{state.error}</ErrorNotice>}
      {!state.loading && !state.error && state.rows.length === 0 && (
        <EmptyNotice title="Sin reportes con este filtro">Cambia el filtro o actualiza.</EmptyNotice>
      )}

      <ul className="space-y-3" aria-busy={state.loading}>
        {state.rows.map((a) => (
          <li key={a.id}>
            <ReportCard report={a} href={`/coordinator/reports/${a.id}`} variant="coordinator" />
          </li>
        ))}
      </ul>
    </div>
  )
}
