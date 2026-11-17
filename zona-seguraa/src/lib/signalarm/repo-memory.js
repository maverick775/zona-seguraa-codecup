// lib/signalarm/repo-memory.js
// Repositorio EN MEMORIA para el modo demo. Imita la semántica de las funciones
// SQL de 001_n0_reports.sql (idempotencia, versión, historial solo-inserción).
// Los datos se pierden al reiniciar el proceso y no se comparten entre
// instancias: no sirve en serverless ni como persistencia real.
import { DomainError, N0_LEVEL, assertVotable, planTransition, voteRoleFor } from './domain.js'

const ZONES = [
  { id: 'a1000000-0000-0000-0000-000000000001', slug: 'fanfest-plaza-liberacion', name: 'FanFest — Zona Plaza de la Liberación', active: true },
  { id: 'a1000000-0000-0000-0000-000000000002', slug: 'fanfest-rotonda-jaliscienses', name: 'FanFest — Zona Rotonda de los Jaliscienses Ilustres', active: true },
  { id: 'a1000000-0000-0000-0000-000000000003', slug: 'fanfest-catedral', name: 'FanFest — Zona Catedral', active: true },
]
const N = (n, zone, name, type, lat, lng) => ({
  id: `b1000000-0000-0000-0000-00000000000${n}`,
  zone_id: `a1000000-0000-0000-0000-00000000000${zone}`,
  name, type, status: 'online', lat, lng,
})
const NODES = [
  N(1, 1, 'AVP3-Alfa-01 — Centro Plaza Liberación', 'avp_physical', 20.6736, -103.3478),
  N(2, 1, 'AVP3-Sim-01 — Acceso Norte Plaza Liberación', 'avp_simulated', 20.675, -103.3478),
  N(3, 1, 'AVP3-Sim-02 — Acceso Sur Plaza Liberación', 'avp_simulated', 20.6722, -103.3478),
  N(4, 1, 'Punto Médico — Plaza Liberación Oriente', 'medical_point', 20.6736, -103.345),
  N(5, 1, 'Salida de Emergencia — Av. Hidalgo', 'mobile_unit', 20.676, -103.349),
  N(6, 2, 'AVP3-Sim-03 — Rotonda Norte', 'avp_simulated', 20.678, -103.35),
  N(7, 2, 'Punto Médico — Rotonda Sur', 'medical_point', 20.676, -103.35),
  N(8, 3, 'AVP3-Sim-04 — Atrio Catedral', 'avp_simulated', 20.67, -103.352),
]

function freshStore() {
  return { alerts: new Map(), events: [], votes: [] }
}

export function createMemoryRepository(store = freshStore(), { now = () => new Date().toISOString() } = {}) {
  const clone = (o) => (o ? structuredClone(o) : o)
  const withNode = (a) => {
    const node = a.node_id ? NODES.find((n) => n.id === a.node_id) : null
    return { ...clone(a), node: node ? { id: node.id, name: node.name, type: node.type, lat: node.lat, lng: node.lng } : null }
  }

  return {
    mode: 'demo',

    async getZone(id) {
      return clone(ZONES.find((z) => z.id === id)) || null
    },

    async listZones() {
      return clone(ZONES)
    },

    async listNodes(zoneId) {
      return clone(NODES.filter((n) => n.zone_id === zoneId))
    },

    async createReport({ actor, value, payloadHash }) {
      const existing = [...store.alerts.values()].find(
        (a) => a.created_by === actor.userId && a.client_report_id === value.client_report_id
      )
      if (existing) {
        if (existing.client_payload_hash !== payloadHash) {
          throw new DomainError(409, 'idempotency-mismatch', 'Ese envío ya existe con otros datos')
        }
        return { alert: withNode(existing), replayed: true }
      }
      const zone = ZONES.find((z) => z.id === value.zone_id && z.active)
      if (!zone) throw new DomainError(404, 'zone-not-found', 'La zona no existe')
      if (value.node_id && !NODES.some((n) => n.id === value.node_id && n.zone_id === value.zone_id)) {
        throw new DomainError(400, 'node-not-in-zone', 'El punto de referencia no pertenece a la zona')
      }
      const ts = now()
      const alert = {
        id: crypto.randomUUID(),
        zone_id: value.zone_id,
        node_id: value.node_id,
        type: value.type,
        level: N0_LEVEL,
        status: 'active',
        description: value.description,
        language: 'es',
        created_by: actor.userId,
        created_by_nick: actor.displayName,
        client_report_id: value.client_report_id,
        client_payload_hash: payloadHash,
        resolution: null,
        dismiss_reason: null,
        attended_by: null,
        version: 1,
        created_at: ts,
        updated_at: ts,
        resolved_at: null,
      }
      store.alerts.set(alert.id, alert)
      store.events.push({
        id: crypto.randomUUID(), alert_id: alert.id, seq: 1, action: 'report.created',
        from_status: null, to_status: 'active', actor_user_id: actor.userId,
        actor_role: 'resident', actor_label: actor.displayName,
        data: { level: N0_LEVEL, node_id: value.node_id }, created_at: ts,
      })
      return { alert: withNode(alert), replayed: false }
    },

    async listReportsByUser(userId) {
      return [...store.alerts.values()]
        .filter((a) => a.created_by === userId)
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .map(withNode)
    },

    async getAlert(id) {
      const a = store.alerts.get(id)
      return a ? withNode(a) : null
    },

    async listAlertsForZones(zoneIds, { status, level } = {}) {
      return [...store.alerts.values()]
        .filter((a) => zoneIds.includes(a.zone_id))
        .filter((a) => !status || status.includes(a.status))
        .filter((a) => level === undefined || a.level === level)
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .map(withNode)
    },

    async listPublicAlerts(zoneId) {
      return [...store.alerts.values()]
        .filter((a) => !zoneId || a.zone_id === zoneId)
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .map(withNode)
    },

    async listEvents(alertId) {
      return clone(store.events.filter((e) => e.alert_id === alertId).sort((a, b) => a.seq - b.seq))
    },

    async addVote({ actor, value }) {
      const alert = store.alerts.get(value.alert_id)
      if (!alert) throw new DomainError(404, 'not-found', 'Alerta no encontrada')
      assertVotable(alert)
      if ((store.votes || []).some((v) => v.alert_id === alert.id && v.voter_user_id === actor.userId)) {
        throw new DomainError(409, 'already-voted', 'Ya validaste esta alerta')
      }
      store.votes = store.votes || []
      const { role, weight } = voteRoleFor(actor, alert)
      const vote = {
        id: crypto.randomUUID(), alert_id: alert.id, voter_user_id: actor.userId,
        nickname: actor.displayName, role, weight, comment: value.comment, created_at: now(),
      }
      store.votes.push(vote)
      return clone(vote)
    },

    async listVotes(alertId) {
      return clone((store.votes || []).filter((v) => v.alert_id === alertId))
    },

    async transition({ alertId, actor, value }) {
      const alert = store.alerts.get(alertId)
      if (!alert) throw new DomainError(404, 'not-found', 'Reporte no encontrado')
      const rule = planTransition(alert, value)
      const from = alert.status
      const ts = now()
      alert.status = rule.to
      alert.updated_at = ts
      alert.version += 1
      if (value.action === 'take') alert.attended_by = actor.coordId || null
      if (value.action === 'close') alert.resolution = value.resolution
      if (value.action === 'dismiss') alert.dismiss_reason = value.dismiss_reason
      if (value.action !== 'take') alert.resolved_at = ts
      const seq = store.events.filter((e) => e.alert_id === alertId).length + 1
      const data = {}
      if (value.resolution) data.resolution = value.resolution
      if (value.dismiss_reason) data.dismiss_reason = value.dismiss_reason
      if (value.note) data.note = value.note
      store.events.push({
        id: crypto.randomUUID(), alert_id: alertId, seq, action: rule.event,
        from_status: from, to_status: rule.to, actor_user_id: actor.userId,
        actor_role: 'coordinator', actor_label: actor.displayName, data, created_at: ts,
      })
      return withNode(alert)
    },
  }
}

// Instancia única por proceso (sobrevive recargas en `next dev`).
export function getDemoRepository() {
  if (!globalThis.__signalarmDemoStore) globalThis.__signalarmDemoStore = freshStore()
  return createMemoryRepository(globalThis.__signalarmDemoStore)
}
