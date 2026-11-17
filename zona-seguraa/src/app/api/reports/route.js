import { requireActor } from '@/lib/signalarm/actor'
import { reportPayloadHash, toReporterView, validateCreateReport } from '@/lib/signalarm/domain'
import { fail, handle, ok, readJson } from '@/lib/signalarm/http'
import { getRepository } from '@/lib/signalarm/repository'

// POST /api/reports — crea un reporte ciudadano N0.
// Identidad desde la sesión; nivel siempre 0; dispositivo opcional.
// Idempotente por (usuario, client_report_id): reintento idéntico → 200 con el original.
// Solo responde éxito después de que el repositorio confirmó la escritura.
export const POST = handle('reports.POST', async (request, _ctx, requestId) => {
  const actor = await requireActor(request)
  const body = await readJson(request)
  const { value, errors } = validateCreateReport(body)
  if (errors) return fail(400, 'validation-error', 'Revisa los datos del reporte', { requestId, details: errors })

  const payloadHash = await reportPayloadHash(value)
  const { alert, replayed } = await getRepository().createReport({ actor, value, payloadHash })
  console.info('[reports.POST] persisted', { requestId, alert_id: alert.id, replayed })
  return ok({ ...toReporterView(alert), replayed }, { status: replayed ? 200 : 201, requestId })
})

// GET /api/reports — mis reportes (vista reducida).
export const GET = handle('reports.GET', async (request, _ctx, requestId) => {
  const actor = await requireActor(request)
  const rows = await getRepository().listReportsByUser(actor.userId)
  return ok(rows.map(toReporterView), { requestId })
})
