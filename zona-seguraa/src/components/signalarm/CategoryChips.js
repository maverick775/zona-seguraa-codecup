import { TYPE_ICONS, TYPE_LABELS } from '@/lib/signalarm/labels'
import { REPORT_TYPES } from '@/lib/signalarm/domain'

// Selección de tipo de reporte como grupo de radios con apariencia de chips (Figma pantalla 4).
// Accesible con teclado (flechas dentro del grupo, como un radio nativo).
export default function CategoryChips({ name = 'type', value, onChange, error, describedBy }) {
  return (
    <fieldset aria-describedby={describedBy}>
      <legend className="block text-sm font-semibold text-gray-900 mb-2">¿Qué está pasando?</legend>
      <div className="grid grid-cols-2 gap-2">
        {REPORT_TYPES.map((t) => {
          const checked = value === t
          return (
            <label
              key={t}
              className={`sg-type-${t} flex items-center gap-2 px-3 py-3 min-h-[48px] rounded-xl border-2 cursor-pointer has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-slate-900 ${
                checked ? 'border-[var(--sg-primary)] ring-2 ring-[var(--sg-primary)]/30' : 'border-transparent'
              }`}
            >
              <input type="radio" name={name} value={t} checked={checked} onChange={() => onChange(t)} className="sr-only" />
              <span aria-hidden="true" className="text-xl">{TYPE_ICONS[t]}</span>
              <span className="text-sm font-semibold text-gray-900">{TYPE_LABELS[t]}</span>
              {checked && <span aria-hidden="true" className="ml-auto text-[var(--sg-primary)] font-bold">✓</span>}
            </label>
          )
        })}
      </div>
      {error && <p className="text-sm text-red-800 mt-1">{error}</p>}
    </fieldset>
  )
}
