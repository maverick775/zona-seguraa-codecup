import { getActor } from '@/lib/signalarm/actor'
import { DATA_MODE } from '@/lib/signalarm/config'
import { fail, handle, ok } from '@/lib/signalarm/http'

// GET /api/me — identidad resuelta desde la sesión.
export const GET = handle('me.GET', async (request, _ctx, requestId) => {
  const actor = await getActor(request)
  if (!actor) return fail(401, 'unauthorized', 'Sin sesión', { requestId })
  return ok(
    {
      user_id: actor.userId,
      display_name: actor.displayName,
      role: actor.role,
      zone_ids: actor.zoneIds,
      data_mode: DATA_MODE,
    },
    { requestId }
  )
})
