// Mensajes de carga, vacío y error con roles ARIA.
export function LoadingNotice({ children = 'Cargando…' }) {
  return (
    <p role="status" aria-live="polite" className="text-gray-700 py-6 text-center">
      {children}
    </p>
  )
}

export function ErrorNotice({ children, onRetry }) {
  return (
    <div role="alert" className="p-4 rounded-lg border border-red-300 bg-red-50 text-red-900 text-sm">
      <p>{children}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-2 underline font-medium min-h-[44px] focus-visible:outline-2 focus-visible:outline-red-900">
          Reintentar
        </button>
      )}
    </div>
  )
}

export function EmptyNotice({ title, children }) {
  return (
    <div className="text-center py-10 text-gray-700">
      <p className="font-semibold text-gray-900">{title}</p>
      {children && <p className="text-sm mt-1">{children}</p>}
    </div>
  )
}
