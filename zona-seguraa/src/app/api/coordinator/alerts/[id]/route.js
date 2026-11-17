import { requireCoordinator } from '@/lib/signalarm/actor'
import { canCoordinate, isUuid, toCoordinatorView } from '@/lib/signalarm/domain'
import { fail, handle, ok } from '@/lib/signalarm/http'
import { getRepository } from '@/lib/signalarm/repository'

// GET /api/coordinator/alerts/:id — detalle con historial. Otra zona → 404.
export const GET = handle('coordinator.alerts.id.GET', async (request, { params }, requestId) => {
  const actor = await requireCoordinator(request)
  const { id } = await params
  if (!isUuid(id)) return fail(404, 'not-found', 'Reporte no encontrado', { requestId })
  const repo = getRepository()
  const alert = await repo.getAlert(id)
  if (!alert || !canCoordinate(actor, alert.zone_id)) {
    return fail(404, 'not-found', 'Reporte no encontrado', { requestId })
  }
  const events = await repo.listEvents(id)
  return ok(
    {
      ...toCoordinatorView(alert),
      history: events.map(({ seq, action, from_status, to_status, actor_role, actor_label, data, created_at }) => ({
        seq, action, from_status, to_status, actor_role, actor_label, data, created_at,
      })),
    },
    { requestId }
  )
})
