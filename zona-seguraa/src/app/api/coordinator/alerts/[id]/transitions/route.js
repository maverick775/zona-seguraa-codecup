import { requireCoordinator } from '@/lib/signalarm/actor'
import { canCoordinate, isUuid, toCoordinatorView, validateTransition } from '@/lib/signalarm/domain'
import { fail, handle, ok, readJson } from '@/lib/signalarm/http'
import { getRepository } from '@/lib/signalarm/repository'

// POST /api/coordinator/alerts/:id/transitions
// { action: take|close|dismiss, expected_version, resolution?, dismiss_reason?, note? }
// 404 si es de otra zona, 409 si la versión cambió, 422 si la acción no aplica.
// No hay efectos externos (sin notificaciones, SMS ni dispositivos).
export const POST = handle('coordinator.transitions.POST', async (request, { params }, requestId) => {
  const actor = await requireCoordinator(request)
  const { id } = await params
  if (!isUuid(id)) return fail(404, 'not-found', 'Reporte no encontrado', { requestId })
  const body = await readJson(request)
  const { value, errors } = validateTransition(body)
  if (errors) return fail(400, 'validation-error', 'Revisa los datos de la acción', { requestId, details: errors })

  const repo = getRepository()
  const current = await repo.getAlert(id)
  if (!current || !canCoordinate(actor, current.zone_id)) {
    return fail(404, 'not-found', 'Reporte no encontrado', { requestId })
  }
  const updated = await repo.transition({ alertId: id, actor, value })
  console.info('[coordinator.transitions.POST] persisted', { requestId, alert_id: id, action: value.action, version: updated.version })
  return ok(toCoordinatorView(updated), { requestId })
})
