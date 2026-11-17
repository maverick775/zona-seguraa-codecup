import { IS_DEMO_MODE } from '@/lib/signalarm/config'

// Aviso permanente cuando la app corre con datos en memoria.
export default function DemoBanner() {
  if (!IS_DEMO_MODE) return null
  return (
    <div role="status" className="bg-amber-100 border-b border-amber-300 text-amber-950 text-sm px-4 py-2 text-center">
      <strong>Modo demostración:</strong> datos simulados en memoria, se borran al reiniciar. No envía alertas reales ni contacta servicios de emergencia.
    </div>
  )
}
