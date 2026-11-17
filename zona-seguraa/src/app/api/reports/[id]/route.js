import { requireActor } from '@/lib/signalarm/actor'
import { canCoordinate, isUuid, toCoordinatorView, toReporterView } from '@/lib/signalarm/domain'
import { fail, handle, ok } from '@/lib/signalarm/http'
import { getRepository } from '@/lib/signalarm/repository'

// GET /api/reports/:id — el autor ve la vista reducida; coordinación de la zona, la completa.
// Cualquier otro recibe 404 (no se revela la existencia del reporte).
export const GET = handle('reports.id.GET', async (request, { params }, requestId) => {
  const actor = await requireActor(request)
  const { id } = await params
  if (!isUuid(id)) return fail(404, 'not-found', 'Reporte no encontrado', { requestId })
  const alert = await getRepository().getAlert(id)
  if (!alert) return fail(404, 'not-found', 'Reporte no encontrado', { requestId })
  if (canCoordinate(actor, alert.zone_id)) return ok(toCoordinatorView(alert), { requestId })
  if (alert.created_by === actor.userId) return ok(toReporterView(alert), { requestId })
  return fail(404, 'not-found', 'Reporte no encontrado', { requestId })
})
