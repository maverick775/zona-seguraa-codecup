import { notFound } from 'next/navigation'
import { IS_DEMO_MODE } from '@/lib/signalarm/config'
import { sampleViews } from '@/lib/signalarm/scenarios'
import StatusBadge from '@/components/StatusBadge'
import ReportCard from '@/components/signalarm/ReportCard'
import Timeline from '@/components/signalarm/Timeline'
import StatusSteps from '@/components/signalarm/StatusSteps'
import ZoneStatus from '@/components/signalarm/ZoneStatus'
import ScreenHeader from '@/components/signalarm/ScreenHeader'
import GalleryInteractive from './GalleryInteractive'

export const metadata = { title: 'Componentes (demo) · Signalarm' }

// U1: galería de componentes con datos FICTICIOS del banco de escenarios (U5).
// Solo existe en modo demo; fuera de demo responde 404.
export default function ComponentGalleryPage() {
  if (!IS_DEMO_MODE) notFound()
  const views = sampleViews()
  const closed = views.find((v) => v.status === 'resolved')
  return (
    <div className="bg-[var(--sg-canvas)] min-h-screen pb-10">
      <ScreenHeader title="Componentes Signalarm" subtitle="Galería con datos de demostración (no son incidentes reales)" />
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-8">
        <section aria-labelledby="g-estados" className="space-y-2">
          <h2 id="g-estados" className="text-lg font-bold text-gray-900">Estado del reporte</h2>
          <div className="flex flex-wrap gap-2">
            {['active', 'in_progress', 'resolved', 'false_alarm'].map((s) => <StatusBadge key={s} status={s} />)}
          </div>
        </section>

        <section aria-labelledby="g-zona" className="space-y-3">
          <h2 id="g-zona" className="text-lg font-bold text-gray-900">Estado de la zona (4 casos)</h2>
          <ZoneStatus zoneName="Plaza de la Liberación" state="loading" />
          <ZoneStatus zoneName="Plaza de la Liberación" state="unavailable" />
          <ZoneStatus zoneName="Plaza de la Liberación" state="open" openCount={2} updatedAt="2026-11-03T18:30:00Z" />
          <ZoneStatus zoneName="Plaza de la Liberación" state="none" updatedAt="2026-11-03T18:30:00Z" />
        </section>

        <section aria-labelledby="g-tarjetas" className="space-y-3">
          <h2 id="g-tarjetas" className="text-lg font-bold text-gray-900">Tarjetas (vista de coordinación)</h2>
          <ul className="space-y-3">
            {views.map((v) => <li key={v.key}><ReportCard report={v} href="#g-tarjetas" variant="coordinator" /></li>)}
          </ul>
        </section>

        <section aria-labelledby="g-seguimiento" className="space-y-4">
          <h2 id="g-seguimiento" className="text-lg font-bold text-gray-900">Seguimiento para quien reportó</h2>
          {views.slice(0, 4).map((v) => (
            <div key={v.key} className="bg-white border border-gray-300 rounded-2xl p-4">
              <p className="text-xs font-mono text-gray-700 mb-2">{v.key}</p>
              <StatusSteps status={v.status} />
            </div>
          ))}
        </section>

        <section className="bg-white border border-gray-300 rounded-2xl p-4">
          <Timeline events={closed.history} headingId="g-historial" title="Historial (reporte cerrado)" />
        </section>

        <GalleryInteractive />
      </div>
    </div>
  )
}
