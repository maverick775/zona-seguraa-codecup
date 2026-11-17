// lib/signalarm/contracts/fake-bus.js — U8: adaptador FALSO de bus de eventos (en memoria).
// Sustituto de MQTT/ThingsBoard para pruebas y demo. No abre conexiones ni envía nada.
// Valida cada evento contra el contrato y deduplica por id (entrega al menos una vez).
import { validateEvent } from './events-v1.js'

export function createFakeEventBus({ allowDraft = false } = {}) {
  const log = []
  const seen = new Set()
  const subscribers = []
  const rejected = []
  return {
    kind: 'fake',
    publish(event) {
      const { valid, errors } = validateEvent(event, { allowDraft })
      if (!valid) { rejected.push({ event, errors }); return { accepted: false, errors } }
      if (seen.has(event.id)) return { accepted: true, duplicate: true }
      seen.add(event.id)
      const frozen = Object.freeze(structuredClone(event))
      log.push(frozen)
      for (const s of subscribers) if (s.filter(frozen)) s.handler(frozen)
      return { accepted: true, duplicate: false }
    },
    subscribe(filter, handler) {
      subscribers.push({ filter: typeof filter === 'function' ? filter : (e) => e.type.startsWith(filter), handler })
    },
    log: () => log.slice(),
    rejected: () => rejected.slice(),
  }
}

// Consumidor de demostración: verifica la continuidad del historial por reporte
// (sin huecos, sin desorden, transiciones encadenadas). No notifica ni escribe.
export function createSequenceAuditConsumer() {
  const bySubject = new Map()
  const findings = []
  return {
    handle(event) {
      if (!event.type.startsWith('report.')) return
      const st = bySubject.get(event.subject.id) || { lastSeq: 0, status: null }
      if (event.sequence !== st.lastSeq + 1) {
        findings.push({ subject: event.subject.id, code: event.sequence <= st.lastSeq ? 'out-of-order' : 'gap', expected: st.lastSeq + 1, got: event.sequence })
      }
      if (st.status !== null && event.data.status_from !== st.status) {
        findings.push({ subject: event.subject.id, code: 'broken-chain', expected: st.status, got: event.data.status_from })
      }
      bySubject.set(event.subject.id, { lastSeq: Math.max(st.lastSeq, event.sequence), status: event.data.status_to })
    },
    findings: () => findings.slice(),
    state: () => Object.fromEntries([...bySubject].map(([k, v]) => [k, { ...v }])),
  }
}
