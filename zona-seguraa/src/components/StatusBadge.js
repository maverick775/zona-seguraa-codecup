import { STATUS_BADGE, STATUS_LABELS } from '@/lib/signalarm/labels'

// El estado no depende solo del color: cada uno lleva un símbolo distinto.
const MARK = { active: '●', in_progress: '◐', resolved: '✓', false_alarm: '✕' }

export default function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border whitespace-nowrap ${STATUS_BADGE[status] || 'bg-gray-100 text-gray-700 border-gray-300'}`}>
      <span aria-hidden="true">{MARK[status] || '•'}</span>
      {STATUS_LABELS[status] || status}
    </span>
  )
}
