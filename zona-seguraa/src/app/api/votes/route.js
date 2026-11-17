import { requireActor } from '@/lib/signalarm/actor'
import { validateVote } from '@/lib/signalarm/domain'
import { fail, handle, ok, readJson } from '@/lib/signalarm/http'
import { getRepository } from '@/lib/signalarm/repository'

// POST /api/votes — validación comunitaria.
// Antes (hallazgo H3) aceptaba `nickname` y `role` del cuerpo: cualquiera votaba
// con peso 2 y tres llamadas subían una alerta a nivel 3.
// Ahora: requiere sesión; identidad, rol y peso salen del servidor
// (peso 2 solo para coordinación de la zona de la alerta); un voto por usuario;
// y los votos NO cambian el nivel (escalamiento automático desactivado, S3-6).
export const POST = handle('votes.POST', async (request, _ctx, requestId) => {
  const actor = await requireActor(request)
  const body = await readJson(request)
  const { value, errors } = validateVote(body)
  if (errors) return fail(400, 'validation-error', 'Revisa los datos de la validación', { requestId, details: errors })

  const repo = getRepository()
  const vote = await repo.addVote({ actor, value })
  const votes = await repo.listVotes(value.alert_id)
  const totalWeight = votes.reduce((s, v) => s + (v.weight || 0), 0)
  console.info('[votes.POST] persisted', { requestId, alert_id: value.alert_id, role: vote.role })
  return ok(
    { vote: { id: vote.id, role: vote.role, weight: vote.weight, created_at: vote.created_at }, total_weight: totalWeight, escalated: false },
    { status: 201, requestId }
  )
})
