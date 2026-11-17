import Link from 'next/link'
import { LEVEL_LABELS, TYPE_ICONS, TYPE_LABELS, formatDateTime, shortId } from '@/lib/signalarm/labels'
import StatusBadge from '@/components/StatusBadge'

// Tarjeta de reporte para listas. variant: 'reporter' (Mis reportes) | 'coordinator' (bandeja).
// Solo muestra campos de la vista que recibe; no pide datos extra.
export default function ReportCard({ report: r, href, variant = 'reporter' }) {
  const coord = variant === 'coordinator'
  return (
    <Link
      href={href}
      className="block bg-white border border-gray-300 rounded-2xl p-4 shadow-sm hover:border-[var(--sg-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
    >
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className={`sg-type-${r.type} shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg`}>
          {TYPE_ICONS[r.type] || '•'}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold text-gray-900 truncate">{TYPE_LABELS[r.type] || r.type}</p>
            <StatusBadge status={r.status} />
          </div>
          <p className="font-mono text-xs text-gray-700 mt-0.5">
            Folio {shortId(r.id)} · {LEVEL_LABELS[r.level] ?? `Nivel ${r.level}`}
          </p>
          {r.description && <p className="text-sm text-gray-800 mt-1 line-clamp-2">{r.description}</p>}
          <p className="text-xs text-gray-700 mt-1">
            {r.node?.name || 'Sin punto de referencia'}
            {coord && r.reporter ? ` · ${r.reporter.display_name}` : ''}
            {' · '}
            <time dateTime={r.created_at}>{formatDateTime(r.created_at)}</time>
          </p>
        </div>
      </div>
    </Link>
  )
}
