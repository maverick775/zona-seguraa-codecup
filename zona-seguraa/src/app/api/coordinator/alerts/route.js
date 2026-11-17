import { requireCoordinator } from '@/lib/signalarm/actor'
import { isUuid, toCoordinatorView } from '@/lib/signalarm/domain'
import { fail, handle, ok } from '@/lib/signalarm/http'
import { getRepository } from '@/lib/signalarm/repository'

const STATUSES = ['active', 'in_progress', 'resolved', 'false_alarm']

// GET /api/coordinator/alerts?status=active,in_progress&zone_id=&level=0
// Solo zonas asignadas al coordinador.
export const GET = handle('coordinator.alerts.GET', async (request, _ctx, requestId) => {
  const actor = await requireCoordinator(request)
  const { searchParams } = new URL(request.url)

  let zoneIds = actor.zoneIds
  const zoneParam = searchParams.get('zone_id')
  if (zoneParam) {
    if (!isUuid(zoneParam) || !actor.zoneIds.includes(zoneParam)) {
      return fail(404, 'not-found', 'Zona no encontrada', { requestId })
    }
    zoneIds = [zoneParam]
  }

  let status
  const statusParam = searchParams.get('status')
  if (statusParam) {
    status = statusParam.split(',').map((s) => s.trim())
    if (status.some((s) => !STATUSES.includes(s))) {
      return fail(400, 'validation-error', 'Estado inválido', { requestId })
    }
  }

  let level
  const levelParam = searchParams.get('level')
  if (levelParam !== null && levelParam !== '') {
    level = Number(levelParam)
    if (![0, 1, 2, 3].includes(level)) return fail(400, 'validation-error', 'Nivel inválido', { requestId })
  }

  const rows = await getRepository().listAlertsForZones(zoneIds, { status, level })
  return ok(rows.map(toCoordinatorView), { requestId })
})
