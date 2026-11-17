// Etiqueta visible para todo lo que es propuesta no aprobada.
export default function ExperimentalTag({ show = true, children = 'Propuesta' }) {
  if (!show) return null
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded border border-purple-400 bg-purple-50 text-purple-900 text-[11px] font-semibold uppercase tracking-wide">
      {children}
    </span>
  )
}
