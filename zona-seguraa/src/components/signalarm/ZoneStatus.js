// Estado de la zona (Figma pantalla 1: "Estado de Zona"). Cuatro casos distintos:
//   loading · unavailable (la consulta falló: NO se muestra cero) · open (>0) · none (0 registrados).
// "Sin reportes registrados" no significa que no haya incidentes; se dice explícitamente.
export default function ZoneStatus({ zoneName, state, openCount = 0, onRetry, updatedAt }) {
  const base = 'rounded-2xl p-4 border'
  let body
  if (state === 'loading') {
    body = (
      <div role="status" aria-live="polite" className={`${base} bg-white border-gray-300`}>
        <p className="text-sm text-gray-700">Consultando reportes de la zona…</p>
      </div>
    )
  } else if (state === 'unavailable') {
    body = (
      <div role="alert" className={`${base} bg-amber-50 border-amber-400`}>
        <p className="font-bold text-amber-950"><span aria-hidden="true">⚠ </span>Sin datos de la zona</p>
        <p className="text-sm text-amber-950 mt-1">No pudimos consultar los reportes. Esto no indica que la zona esté tranquila.</p>
        {onRetry && (
          <button type="button" onClick={onRetry} className="mt-2 underline font-medium min-h-[44px] text-amber-950 focus-visible:outline-2 focus-visible:outline-amber-950">
            Reintentar
          </button>
        )}
      </div>
    )
  } else if (state === 'open') {
    body = (
      <div role="status" className={`${base} bg-red-50 border-red-300`}>
        <p className="font-bold text-red-900">
          <span aria-hidden="true">● </span>
          {openCount === 1 ? '1 reporte abierto' : `${openCount} reportes abiertos`}
        </p>
        <p className="text-sm text-red-900 mt-1">Reportes ciudadanos pendientes o en atención por coordinación.</p>
      </div>
    )
  } else {
    body = (
      <div role="status" className={`${base} bg-white border-gray-300`}>
        <p className="font-bold text-gray-900"><span aria-hidden="true">○ </span>Sin reportes abiertos registrados</p>
        <p className="text-sm text-gray-700 mt-1">Que no haya reportes no significa que no haya incidentes. Ante una emergencia, llama al 911.</p>
      </div>
    )
  }
  return (
    <section aria-label={`Estado de la zona ${zoneName || ''}`.trim()}>
      <h2 className="text-sm font-semibold text-gray-700 mb-1">Estado de la zona{zoneName ? ` · ${zoneName}` : ''}</h2>
      {body}
      {updatedAt && state !== 'loading' && state !== 'unavailable' && (
        <p className="text-xs text-gray-700 mt-1">Consultado: <time dateTime={updatedAt}>{new Date(updatedAt).toLocaleTimeString('es-MX', { timeStyle: 'short' })}</time></p>
      )}
    </section>
  )
}
