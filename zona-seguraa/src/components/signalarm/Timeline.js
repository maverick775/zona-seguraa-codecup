import { DISMISS_REASON_LABELS, EVENT_LABELS, STATUS_LABELS, formatDateTime } from '@/lib/signalarm/labels'

// Historial de solo lectura (alert_events). Lista ordenada; el más antiguo primero.
export default function Timeline({ events, headingId = 'historial', title = 'Historial' }) {
  return (
    <section aria-labelledby={headingId}>
      <h2 id={headingId} className="font-semibold text-gray-900 mb-3">
        {title} <span className="text-sm font-normal text-gray-700">({events.length})</span>
      </h2>
      {events.length === 0 ? (
        <p className="text-sm text-gray-700">Sin eventos registrados.</p>
      ) : (
        <ol className="relative border-l-2 border-gray-300 ml-2 space-y-4">
          {events.map((e) => (
            <li key={e.seq} className="pl-4 relative">
              <span aria-hidden="true" className={`absolute -left-[7px] top-1.5 w-3 h-3 rounded-full sg-status-dot-${e.to_status}`} />
              <p className="text-sm font-semibold text-gray-900">{EVENT_LABELS[e.action] || e.action}</p>
              <p className="text-xs text-gray-700">
                <time dateTime={e.created_at}>{formatDateTime(e.created_at)}</time>
                {' · '}{e.actor_label || e.actor_role}
                {e.from_status ? ` · ${STATUS_LABELS[e.from_status]} → ${STATUS_LABELS[e.to_status]}` : ` · ${STATUS_LABELS[e.to_status]}`}
              </p>
              {e.data?.resolution && <p className="text-sm text-gray-900 mt-1">Resolución: {e.data.resolution}</p>}
              {e.data?.dismiss_reason && <p className="text-sm text-gray-900 mt-1">Motivo: {DISMISS_REASON_LABELS[e.data.dismiss_reason]}</p>}
              {e.data?.note && <p className="text-sm text-gray-900 mt-1">Nota: {e.data.note}</p>}
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
