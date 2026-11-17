import { STATUS_LABELS } from '@/lib/signalarm/labels'

// Seguimiento para quien reportó: Abierto → En atención → Cerrado, o Descartado.
// No promete ayuda: describe en qué punto está el reporte dentro de coordinación.
const PATH = ['active', 'in_progress', 'resolved']
const HELP = {
  active: 'Coordinación de la zona puede verlo. Aún nadie lo ha tomado.',
  in_progress: 'Una persona de coordinación lo está atendiendo.',
  resolved: 'Coordinación lo cerró.',
  false_alarm: 'Coordinación lo descartó (por ejemplo, duplicado o sin acción necesaria).',
}

export default function StatusSteps({ status }) {
  const dismissed = status === 'false_alarm'
  const idx = PATH.indexOf(status)
  return (
    <div>
      <ol className="flex items-center gap-1" aria-label="Avance del reporte">
        {PATH.map((s, i) => {
          const done = !dismissed && i <= idx
          const current = !dismissed && i === idx
          return (
            <li key={s} className="flex-1 flex flex-col items-center text-center" aria-current={current ? 'step' : undefined}>
              <span aria-hidden="true" className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                done ? 'bg-[var(--sg-primary)] border-[var(--sg-primary)] text-white' : 'bg-white border-gray-400 text-gray-700'}`}>
                {done ? '✓' : i + 1}
              </span>
              <span className={`text-xs mt-1 ${current ? 'font-bold text-gray-900' : 'text-gray-700'}`}>
                {STATUS_LABELS[s]}
                {done && !current && <span className="sr-only"> (completado)</span>}
                {current && <span className="sr-only"> (estado actual)</span>}
              </span>
            </li>
          )
        })}
      </ol>
      {dismissed && (
        <p className="mt-2 text-sm font-semibold text-gray-900"><span aria-hidden="true">✕ </span>{STATUS_LABELS.false_alarm}</p>
      )}
      <p className="mt-2 text-sm text-gray-800">{HELP[status] || ''}</p>
    </div>
  )
}
