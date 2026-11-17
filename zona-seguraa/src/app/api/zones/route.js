import { handle, ok } from '@/lib/signalarm/http'
import { getRepository } from '@/lib/signalarm/repository'

// GET /api/zones — zonas activas (dato público del escenario).
export const GET = handle('zones.GET', async (_request, _ctx, requestId) => {
  const zones = await getRepository().listZones()
  return ok(zones.map(({ id, slug, name }) => ({ id, slug, name })), { requestId })
})
