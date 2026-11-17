import { notFound } from 'next/navigation'
import { IS_DEMO_MODE } from '@/lib/signalarm/config'
import ScreenHeader from '@/components/signalarm/ScreenHeader'
import LabClient from './LabClient'

export const metadata = { title: 'Laboratorio de políticas (demo) · Signalarm' }

// U6: laboratorio SOLO DEMO. Configuración → escenario → resultado explicado.
// Sin llamadas a la API ni a proveedores: todo ocurre en el navegador con datos ficticios.
export default function PolicyLabPage() {
  if (!IS_DEMO_MODE) notFound()
  return (
    <div className="bg-[var(--sg-canvas)] min-h-screen pb-10">
      <ScreenHeader title="Laboratorio de políticas" subtitle="Propuestas para evaluar. No son reglas aprobadas ni cambian datos." />
      <LabClient />
    </div>
  )
}
