'use client'

import { useId, useState } from 'react'
import { DISMISS_REASONS } from '@/lib/signalarm/domain'
import { DISMISS_REASON_LABELS, EVENT_LABELS, STATUS_LABELS, TYPE_LABELS, shortId } from '@/lib/signalarm/labels'
import { getAvailableActions, getRequiredFields, previewTransition, waitingAdvisory } from '@/lib/signalarm/policy'
import StatusBadge from '@/components/StatusBadge'
import Timeline from '@/components/signalarm/Timeline'
import ExperimentalTag from './ExperimentalTag'

const ACTION_LABELS = { take: 'Tomar', close: 'Cerrar', dismiss: 'Descartar', merge: 'Fusionar', escalate: 'Escalar', notify: 'Notificar', auto_close: 'Cierre automático' }

// U6-B: asistente de coordinación del LABORATORIO. Todo es vista previa local:
// no llama a la API, no cambia estado, prioridad ni nivel. La bandeja real sigue
// usando POST /api/coordinator/alerts/:id/transitions.
export default function ResponseGuide({ policy, actor, alert, knownVersion, now, onReload }) {
  const id = useId()
  const [selected, setSelected] = useState(null)
  const [input, setInput] = useState({ resolution: '', dismiss_reason: '', note: '' })
  const [checklist, setChecklist] = useState({})
  const [preview, setPreview] = useState(null)
  const [labLog, setLabLog] = useState([])

  const avail = getAvailableActions({ policy, actor, alert, knownVersion })
  const stale = Number.isInteger(knownVersion) && alert && knownVersion !== alert.version
  const waiting = waitingAdvisory({ policy, alert, now })
  const required = selected && ['close', 'dismiss'].includes(selected) ? getRequiredFields({ policy, context: selected, input }) : null
  const allowedReasons = DISMISS_REASONS.filter((r) => policy.coordination.dismissReasons.includes(r))

  const info = alert ? [
    ['Tipo', TYPE_LABELS[alert.type]],
    ['Descripción', alert.description],
    ['Punto de referencia', alert.node?.name],
    ['Quién reportó', alert.reporter?.display_name],
    ['Urgencia reportada', null, 'Aún no existe en el esquema (migración 003 pendiente).'],
  ] : []

  const runPreview = () => {
    const r = previewTransition({ policy, actor, alert, action: selected, input: { ...input, expected_version: knownVersion }, checklist, at: new Date(now).toISOString() })
    setPreview(r)
    if (r.ok && r.labOnly) setLabLog((l) => [...l, { ...r.event, seq: l.length + 1 }])
  }

  if (!alert) {
    return <p role="status" className="text-sm text-gray-700">Sin datos: elige un escenario.</p>
  }

  return (
    <section aria-labelledby={`${id}-h`} className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id={`${id}-h`} className="text-base font-bold text-gray-900">Asistente de coordinación · Folio {shortId(alert.id)}</h3>
        <StatusBadge status={alert.status} />
      </div>

      {stale && (
        <div role="alert" className="rounded-lg border border-amber-400 bg-amber-50 p-3 text-sm text-amber-950">
          <p className="font-semibold">Conflicto de versión</p>
          <p>Abriste la versión {knownVersion}; la actual es {alert.version}. Las acciones se bloquean hasta recargar. <span className="font-mono text-xs">[version-stale]</span></p>
          {onReload && <button type="button" onClick={onReload} className="mt-1 underline font-semibold min-h-[44px]">Recargar (laboratorio)</button>}
        </div>
      )}
      {waiting && (
        <p className="rounded-lg border border-purple-300 bg-purple-50 p-3 text-sm text-purple-950">
          <ExperimentalTag /> Sin tomar desde hace {waiting.waitedMinutes} min (umbral propuesto: {waiting.thresholdMinutes}). {waiting.explanation}
        </p>
      )}

      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-1">Información disponible y faltante</h4>
        <ul className="text-sm space-y-1">
          {info.map(([label, value, why]) => (
            <li key={label} className="flex gap-2">
              <span aria-hidden="true">{value ? '✓' : '○'}</span>
              <span><span className="text-gray-700">{label}:</span> {value ? <span className="text-gray-900">{value}</span> : <span className="text-gray-900 italic">falta{why ? ` — ${why}` : ''}</span>}</span>
            </li>
          ))}
        </ul>
      </div>

      <fieldset>
        <legend className="text-sm font-semibold text-gray-900 mb-1">Acciones</legend>
        <ul className="space-y-1.5">
          {avail.actions.map((a) => (
            <li key={a.action} className="flex flex-wrap items-center gap-2 text-sm">
              <button type="button" disabled={!a.available} aria-pressed={selected === a.action}
                onClick={() => { setSelected(a.action); setPreview(null) }}
                className={`px-3 py-2 min-h-[44px] rounded-lg border text-sm focus-visible:outline-2 focus-visible:outline-slate-900 ${
                  selected === a.action ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-gray-900 border-gray-400'} disabled:bg-gray-100 disabled:text-gray-600 disabled:border-gray-300`}>
                {ACTION_LABELS[a.action] || a.label || a.action}
              </button>
              {a.kind === 'lab' && <ExperimentalTag>Solo laboratorio</ExperimentalTag>}
              {a.kind === 'not-implemented' && <ExperimentalTag show>No implementado</ExperimentalTag>}
              <span className="text-gray-800">{a.explanation} <span className="font-mono text-xs text-gray-700">[{a.code}]</span></span>
            </li>
          ))}
        </ul>
      </fieldset>

      {selected && (
        <div className="rounded-xl border border-gray-300 p-3 space-y-3">
          <p className="text-sm font-semibold text-gray-900">Vista previa: {ACTION_LABELS[selected] || selected}</p>
          {required && (
            <ul className="text-xs text-gray-800 space-y-0.5" aria-label="Campos requeridos">
              {required.fields.map((f) => (
                <li key={f.field}>• <span className="font-mono">{f.field}</span>: {f.explanation} {f.experimental && <ExperimentalTag />}</li>
              ))}
            </ul>
          )}
          {selected === 'close' && (
            <>
              <label className="block text-sm font-semibold text-gray-900" htmlFor={`${id}-res`}>Resolución</label>
              <textarea id={`${id}-res`} rows={2} value={input.resolution} onChange={(e) => setInput({ ...input, resolution: e.target.value })}
                className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm text-gray-900" />
              {policy.coordination.closeChecklist.length > 0 && (
                <fieldset>
                  <legend className="text-sm font-semibold text-gray-900">Checklist propuesta <ExperimentalTag /></legend>
                  {policy.coordination.closeChecklist.map((it) => (
                    <label key={it.id} className="flex items-center gap-2 text-sm text-gray-900 min-h-[44px]">
                      <input type="checkbox" checked={!!checklist[it.id]} onChange={(e) => setChecklist({ ...checklist, [it.id]: e.target.checked })} className="w-5 h-5" />
                      {it.label}
                    </label>
                  ))}
                </fieldset>
              )}
            </>
          )}
          {selected === 'dismiss' && (
            <>
              <label className="block text-sm font-semibold text-gray-900" htmlFor={`${id}-rs`}>Motivo</label>
              <select id={`${id}-rs`} value={input.dismiss_reason} onChange={(e) => setInput({ ...input, dismiss_reason: e.target.value })}
                className="w-full px-3 py-2 min-h-[44px] border border-gray-400 rounded-lg bg-white text-gray-900">
                <option value="">Selecciona…</option>
                {allowedReasons.map((r) => <option key={r} value={r}>{DISMISS_REASON_LABELS[r]}</option>)}
              </select>
              <label className="block text-sm font-semibold text-gray-900" htmlFor={`${id}-nt`}>Nota</label>
              <textarea id={`${id}-nt`} rows={2} value={input.note} onChange={(e) => setInput({ ...input, note: e.target.value })}
                className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm text-gray-900" />
            </>
          )}
          <button type="button" onClick={runPreview}
            className="px-4 py-2 min-h-[44px] bg-[var(--sg-primary)] text-white rounded-lg font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900">
            Ver resultado (sin guardar)
          </button>
          <div role="status" aria-live="polite">
            {preview && (
              <div className={`rounded-lg border p-3 text-sm ${preview.ok ? 'border-green-400 bg-green-50 text-green-950' : 'border-red-400 bg-red-50 text-red-950'}`}>
                <p className="font-semibold">{preview.ok ? '✓ ' : '✕ '}{preview.explanation} <span className="font-mono text-xs">[{preview.code}]</span></p>
                {preview.missing && <p>Falta: {preview.missing.map((f) => f.field).join(', ')}</p>}
                {preview.ok && !preview.labOnly && (
                  <p>Se registraría “{EVENT_LABELS[preview.event.action]}”: {STATUS_LABELS[preview.event.from_status]} → {STATUS_LABELS[preview.event.to_status]}. En la bandeja real esto lo decide el servidor.</p>
                )}
                {preview.ok && preview.labOnly && <p>Anotado solo en el registro local del laboratorio. No cambia el estado.</p>}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-gray-300 p-3">
        <Timeline events={alert.history || []} headingId={`${id}-hist`} title="Historial guardado (escenario)" />
        {labLog.length > 0 && (
          <div className="mt-3">
            <p className="text-sm font-semibold text-gray-900">Registro local del laboratorio <ExperimentalTag>No se guarda</ExperimentalTag></p>
            <ol className="text-sm list-decimal ml-5">
              {labLog.map((e) => <li key={e.seq}>{e.label} · estado sin cambio ({STATUS_LABELS[e.to_status]})</li>)}
            </ol>
          </div>
        )}
      </div>
    </section>
  )
}
