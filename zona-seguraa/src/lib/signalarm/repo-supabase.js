// lib/signalarm/repo-supabase.js
// Repositorio sobre Supabase. Las escrituras pasan por las funciones SQL de
// CreatingAgentAssets/db/migrations/001_n0_reports.sql (una transacción cada una).
// Usa la service role SOLO después de que la API verificó identidad y rol.
// Requiere que la migración 001 esté aplicada; si no, las RPC fallan con 503.
import { createServerClient } from '@/lib/supabase-server'
import { DomainError, assertVotable, voteRoleFor } from './domain.js'

const ALERT_COLUMNS =
  'id, zone_id, node_id, type, level, status, description, language, created_by, created_by_nick, ' +
  'resolution, dismiss_reason, attended_by, version, created_at, updated_at, resolved_at, ' +
  'node:nodes(id, name, type, lat, lng)'

function storageError(op, error) {
  // Sin cuerpo ni datos personales en el log: solo operación y código.
  console.error('[signalarm.repo]', { op, code: error?.code, message: error?.message })
  return new DomainError(503, 'storage-unavailable', 'No se pudo contactar la base de datos. Intenta de nuevo.')
}

function mapRpcError(op, error) {
  const msg = error?.message || ''
  if (error?.code === 'P0409' && msg.startsWith('version-conflict')) {
    const current = Number(msg.split(':')[1])
    return new DomainError(409, 'version-conflict', 'El reporte cambió; recarga para ver su estado actual', {
      current_version: Number.isFinite(current) ? current : undefined,
    })
  }
  if (error?.code === 'P0409') return new DomainError(409, 'idempotency-mismatch', 'Ese envío ya existe con otros datos')
  if (error?.code === 'P0422') return new DomainError(422, 'invalid-transition', 'La acción no aplica al estado actual')
  if (error?.code === 'P0002' && msg.startsWith('zone')) return new DomainError(404, 'zone-not-found', 'La zona no existe')
  if (error?.code === 'P0002' && msg.startsWith('node')) return new DomainError(400, 'node-not-in-zone', 'El punto de referencia no pertenece a la zona')
  if (error?.code === 'P0002') return new DomainError(404, 'not-found', 'Reporte no encontrado')
  if (error?.code === '22023' || error?.code === '23514') return new DomainError(400, 'validation-error', 'Datos inválidos')
  return storageError(op, error)
}

export function createSupabaseRepository() {
  const db = () => createServerClient()

  async function getAlert(id) {
    const { data, error } = await db().from('alerts').select(ALERT_COLUMNS).eq('id', id).maybeSingle()
    if (error) throw storageError('getAlert', error)
    return data
  }

  return {
    mode: 'supabase',

    async getZone(id) {
      const { data, error } = await db().from('zones').select('id, slug, name, active').eq('id', id).maybeSingle()
      if (error) throw storageError('getZone', error)
      return data
    },

    async listZones() {
      const { data, error } = await db().from('zones').select('id, slug, name, active').eq('active', true).order('name')
      if (error) throw storageError('listZones', error)
      return data
    },

    async listNodes(zoneId) {
      const { data, error } = await db().from('nodes').select('id, zone_id, name, type, status, lat, lng').eq('zone_id', zoneId).order('name')
      if (error) throw storageError('listNodes', error)
      return data
    },

    async createReport({ actor, value, payloadHash }) {
      const { data, error } = await db().rpc('create_n0_report', {
        p_user_id: actor.userId,
        p_actor_label: actor.displayName,
        p_zone_id: value.zone_id,
        p_node_id: value.node_id,
        p_type: value.type,
        p_description: value.description,
        p_language: 'es',
        p_client_report_id: value.client_report_id,
        p_payload_hash: payloadHash,
      })
      if (error) throw mapRpcError('createReport', error)
      const row = Array.isArray(data) ? data[0] : data
      if (!row?.alert?.id) throw storageError('createReport', { message: 'respuesta vacía' })
      // Releer para devolver lo que quedó persistido (con el nodo).
      const persisted = await getAlert(row.alert.id)
      if (!persisted) throw storageError('createReport', { message: 'no se pudo releer' })
      return { alert: persisted, replayed: !!row.replayed }
    },

    async listReportsByUser(userId) {
      const { data, error } = await db().from('alerts').select(ALERT_COLUMNS).eq('created_by', userId).order('created_at', { ascending: false }).limit(100)
      if (error) throw storageError('listReportsByUser', error)
      return data
    },

    getAlert,

    async listAlertsForZones(zoneIds, { status, level } = {}) {
      if (!zoneIds.length) return []
      let q = db().from('alerts').select(ALERT_COLUMNS).in('zone_id', zoneIds)
      if (status) q = q.in('status', status)
      if (level !== undefined) q = q.eq('level', level)
      const { data, error } = await q.order('created_at', { ascending: false }).limit(200)
      if (error) throw storageError('listAlertsForZones', error)
      return data
    },

    async listEvents(alertId) {
      const { data, error } = await db()
        .from('alert_events')
        .select('id, alert_id, seq, action, from_status, to_status, actor_role, actor_label, data, created_at')
        .eq('alert_id', alertId)
        .order('seq')
      if (error) throw storageError('listEvents', error)
      return data
    },

    // Requiere 002_votes_identity.sql (columna voter_user_id + único por alerta).
    async addVote({ actor, value }) {
      const { data: alert, error: aErr } = await db().from('alerts').select('id, zone_id, status').eq('id', value.alert_id).maybeSingle()
      if (aErr) throw storageError('addVote.alert', aErr)
      if (!alert) throw new DomainError(404, 'not-found', 'Alerta no encontrada')
      assertVotable(alert)
      const { role, weight } = voteRoleFor(actor, alert)
      const { data, error } = await db()
        .from('alert_votes')
        .insert({ alert_id: alert.id, voter_user_id: actor.userId, nickname: actor.displayName, role, weight, comment: value.comment })
        .select('id, alert_id, nickname, role, weight, comment, created_at')
        .single()
      if (error?.code === '23505') throw new DomainError(409, 'already-voted', 'Ya validaste esta alerta')
      if (error) throw storageError('addVote', error)
      return data
    },

    async listVotes(alertId) {
      const { data, error } = await db().from('alert_votes').select('id, alert_id, nickname, role, weight, comment, created_at').eq('alert_id', alertId)
      if (error) throw storageError('listVotes', error)
      return data
    },

    async transition({ alertId, actor, value }) {
      const { error } = await db().rpc('transition_alert', {
        p_alert_id: alertId,
        p_action: value.action,
        p_expected_version: value.expected_version,
        p_actor_user_id: actor.userId,
        p_actor_coord_id: actor.coordId || null,
        p_actor_label: actor.displayName,
        p_resolution: value.resolution,
        p_dismiss_reason: value.dismiss_reason,
        p_note: value.note,
      })
      if (error) throw mapRpcError('transition', error)
      return getAlert(alertId)
    },
  }
}
