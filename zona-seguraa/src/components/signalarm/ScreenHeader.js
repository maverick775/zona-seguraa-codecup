// Encabezado de pantalla con tono por contexto (Figma: neutro / reporte / coordinación).
const TONES = {
  neutral: 'bg-white text-gray-900 border-b border-gray-200',
  report: 'bg-[var(--sg-primary)] text-white',
  coordination: 'bg-slate-900 text-white',
}
export default function ScreenHeader({ title, subtitle, tone = 'neutral', children }) {
  return (
    <header className={`${TONES[tone] || TONES.neutral}`}>
      <div className="max-w-2xl mx-auto px-4 py-4">
        <h1 className="text-xl font-bold">{title}</h1>
        {subtitle && <p className="text-sm opacity-90 mt-0.5">{subtitle}</p>}
        {children}
      </div>
    </header>
  )
}
