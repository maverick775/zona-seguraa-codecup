// Grupo de filtros tipo chip (botones con aria-pressed). Una opción activa a la vez.
// options: [{ key, label, count? }]
export default function FilterChips({ legend, options, value, onChange }) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-gray-900 mb-1">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const active = value === o.key
          return (
            <button
              key={o.key}
              type="button"
              onClick={() => onChange(o.key)}
              aria-pressed={active}
              className={`px-3 py-2 min-h-[44px] rounded-full text-sm border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 ${
                active ? 'bg-[var(--sg-primary)] text-white border-[var(--sg-primary)]' : 'bg-white text-gray-900 border-gray-400'
              }`}
            >
              {active && <span aria-hidden="true">✓ </span>}
              {o.label}
              {typeof o.count === 'number' && <span className="ml-1 opacity-80">({o.count})</span>}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
