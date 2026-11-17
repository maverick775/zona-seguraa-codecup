'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { DEMO_SCENARIO } from '@/lib/signalarm/config'
import { DESCRIPTION_MAX } from '@/lib/signalarm/domain'
import { LEVEL_LABELS, STATUS_LABELS, TYPE_LABELS, shortId } from '@/lib/signalarm/labels'
import { IS_DEMO_MODE } from '@/lib/signalarm/config'
import { apiFetch } from '@/components/api'
import { ErrorNotice, LoadingNotice } from '@/components/Notice'
import { useMe } from '@/hooks/useMe'
import CategoryChips from '@/components/signalarm/CategoryChips'
import ReportGuidance from '@/components/signalarm/ReportGuidance'

// Reporte ciudadano N0: sin dispositivo obligatorio, sin validación comunitaria.
// El client_report_id se genera una vez por reporte y se reutiliza en cada
// reintento, así un doble clic o una red inestable no crean duplicados.
export default function CreateReportPage() {
  const { status: sessionStatus, me } = useMe()
  const [zones, setZones] = useState(null)
  const [nodes, setNodes] = useState([])
  const [loadError, setLoadError] = useState('')
  const [zoneId, setZoneId] = useState(DEMO_SCENARIO.defaultZoneId)
  const [type, setType] = useState('')
  const [nodeId, setNodeId] = useState('')
  const [description, setDescription] = useState('')
  // Clave de idempotencia: se crea al primer envío y se conserva en reintentos.
  const clientReportIdRef = useRef(null)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})
  const [created, setCreated] = useState(null)
  const confirmRef = useRef(null)
  const errorRef = useRef(null)

  useEffect(() => {
    apiFetch('/api/zones').then((r) => {
      if (!r.ok) return setLoadError(r.error.message)
      setZones(r.data)
    })
  }, [])

  useEffect(() => {
    if (!zoneId) return
    fetch(`/api/nodes?zone_id=${encodeURIComponent(zoneId)}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setNodes(Array.isArray(d) ? d : []))
      .catch(() => setNodes([]))
  }, [zoneId])

  useEffect(() => {
    if (created) confirmRef.current?.focus()
  }, [created])
  useEffect(() => {
    if (error) errorRef.current?.focus()
  }, [error])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (sending) return
    const localErrors = {}
    if (!type) localErrors.type = 'Selecciona el tipo de situación'
    if (!zoneId) localErrors.zone_id = 'Selecciona una zona'
    setFieldErrors(localErrors)
    if (Object.keys(localErrors).length) return

    if (!clientReportIdRef.current) clientReportIdRef.current = crypto.randomUUID()
    setSending(true)
    setError(null)
    const r = await apiFetch('/api/reports', {
      method: 'POST',
      body: JSON.stringify({
        client_report_id: clientReportIdRef.current,
        zone_id: zoneId,
        node_id: nodeId || null,
        type,
        description: description.trim() || undefined,
      }),
    })
    setSending(false)
    if (!r.ok) {
      if (r.error.details) setFieldErrors(r.error.details)
      if (r.status === 401) {
        setError({ message: 'Tu sesión expiró. Inicia sesión de nuevo; el reporte NO se envió.', login: true })
      } else if (r.error.code === 'idempotency-mismatch') {
        setError({ message: 'Ya registramos un envío anterior de este reporte con otros datos. Revisa “Mis reportes” antes de volver a enviar.' })
      } else {
        // Sin red o servicio caído (0 / 5xx): orientación específica; el reintento usa la misma clave.
        setError({ message: `No se envió el reporte. ${r.error.message}`, unavailable: r.status === 0 || r.status >= 500 })
      }
      return
    }
    setCreated(r.data)
  }

  const startAnother = () => {
    setCreated(null)
    setType('')
    setNodeId('')
    setDescription('')
    setFieldErrors({})
    clientReportIdRef.current = null
  }

  if (created) {
    return (
      <div className="max-w-md mx-auto px-4 py-8">
        <div className="bg-white border border-green-300 rounded-xl p-6">
          <h1 ref={confirmRef} tabIndex={-1} className="text-2xl font-bold text-gray-900 mb-2 focus:outline-none">
            Reporte registrado
          </h1>
          <p className="text-gray-800 mb-4">
            Guardamos tu reporte{created.replayed ? ' (ya estaba registrado; no se duplicó)' : ''}.
          </p>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm mb-4">
            <dt className="text-gray-700">Folio</dt>
            <dd className="font-mono font-bold text-gray-900">{shortId(created.id)}</dd>
            <dt className="text-gray-700">Tipo</dt>
            <dd className="text-gray-900">{TYPE_LABELS[created.type]}</dd>
            <dt className="text-gray-700">Nivel</dt>
            <dd className="text-gray-900">{LEVEL_LABELS[created.level]}</dd>
            <dt className="text-gray-700">Estado</dt>
            <dd className="text-gray-900">{STATUS_LABELS[created.status]}</dd>
          </dl>
          <p className="text-xs text-gray-700 mb-4 break-all">Identificador completo: {created.id}</p>
          <div className="mb-4"><ReportGuidance phase="submitted" isDemo={IS_DEMO_MODE} /></div>
          <div className="flex flex-col gap-2">
            <Link href={`/reports/${created.id}`} className="block text-center py-3 min-h-[44px] bg-slate-900 text-white rounded-lg font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900">
              Ver seguimiento
            </Link>
            <button onClick={startAnother} className="py-3 min-h-[44px] border border-gray-400 rounded-lg text-gray-900 focus-visible:outline-2 focus-visible:outline-slate-900">
              Hacer otro reporte
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (sessionStatus === 'loading') return <LoadingNotice>Verificando sesión…</LoadingNotice>
  if (sessionStatus === 'signed-out') {
    return (
      <div className="max-w-md mx-auto px-4 py-8">
        <ErrorNotice>Necesitas iniciar sesión para reportar.</ErrorNotice>
        <Link href="/login?next=/alerts/create" className="mt-4 inline-block underline text-slate-900">Iniciar sesión</Link>
      </div>
    )
  }

  const zoneName = zones?.find((z) => z.id === zoneId)?.name

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900">Reportar una situación</h1>
      <p className="text-gray-800 mt-1 mb-4">
        Se registra como <strong>N0 · reporte ciudadano</strong>: lo revisa coordinación; no activa sirenas ni avisa a servicios de emergencia.
      </p>
      <div className="mb-6 p-3 rounded-lg bg-red-50 border border-red-300 text-red-900 text-sm">
        Si hay riesgo para la vida, <strong>llama al 911</strong>.
      </div>

      {loadError && <div className="mb-4"><ErrorNotice>No se pudieron cargar las zonas: {loadError}</ErrorNotice></div>}

      <form onSubmit={handleSubmit} noValidate aria-describedby={error ? 'form-error' : undefined}>
        <div className="mb-6">
          <label htmlFor="zone" className="block text-sm font-semibold text-gray-900 mb-1">Zona</label>
          <select id="zone" value={zoneId} onChange={(e) => { setZoneId(e.target.value); setNodeId('') }} disabled={!zones}
            aria-invalid={!!fieldErrors.zone_id} aria-describedby={fieldErrors.zone_id ? 'zone-err' : undefined}
            className="w-full px-4 py-3 border border-gray-400 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-slate-700">
            {!zones && <option>Cargando zonas…</option>}
            {zones?.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
          </select>
          {fieldErrors.zone_id && <p id="zone-err" className="text-sm text-red-800 mt-1">{fieldErrors.zone_id}</p>}
        </div>

        <div className="mb-6">
          <CategoryChips value={type} onChange={(t) => { setType(t); setFieldErrors((f) => ({ ...f, type: undefined })) }}
            error={fieldErrors.type} />
        </div>

        <div className="mb-6">
          <label htmlFor="node" className="block text-sm font-semibold text-gray-900 mb-1">
            Punto de referencia <span className="font-normal text-gray-700">(opcional)</span>
          </label>
          <select id="node" value={nodeId} onChange={(e) => setNodeId(e.target.value)}
            className="w-full px-4 py-3 border border-gray-400 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-slate-700">
            <option value="">No sé / ninguno cercano</option>
            {nodes.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
          </select>
          {fieldErrors.node_id && <p className="text-sm text-red-800 mt-1">{fieldErrors.node_id}</p>}
        </div>

        <div className="mb-6">
          <label htmlFor="description" className="block text-sm font-semibold text-gray-900 mb-1">
            Descripción <span className="font-normal text-gray-700">(opcional)</span>
          </label>
          <textarea id="description" rows={4} maxLength={DESCRIPTION_MAX} value={description}
            onChange={(e) => setDescription(e.target.value)} aria-describedby="desc-help"
            className="w-full px-4 py-3 border border-gray-400 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-slate-700 resize-none" />
          <p id="desc-help" className="text-xs text-gray-700 mt-1">
            {description.length}/{DESCRIPTION_MAX}. Evita nombres, teléfonos o datos personales de otras personas.
          </p>
          {fieldErrors.description && <p className="text-sm text-red-800 mt-1">{fieldErrors.description}</p>}
        </div>

        {error && (
          <div id="form-error" ref={errorRef} tabIndex={-1} className="mb-4 focus:outline-none">
            <ErrorNotice>{error.message}</ErrorNotice>
            {error.login && <Link href="/login?next=/alerts/create" className="inline-block mt-2 underline">Iniciar sesión</Link>}
            {error.unavailable && <div className="mt-3"><ReportGuidance phase="send-failed" isDemo={IS_DEMO_MODE} title="Qué hacer ahora" /></div>}
          </div>
        )}

        <button type="submit" disabled={sending || !zones}
          className="w-full py-4 min-h-[44px] bg-red-700 text-white rounded-xl font-semibold hover:bg-red-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-900 disabled:bg-gray-400">
          {sending ? 'Enviando…' : 'Enviar reporte'}
        </button>
        <p className="text-xs text-gray-700 mt-2" aria-live="polite">
          {sending ? 'Esperando confirmación del servidor…' : `Reportas como ${me?.display_name || 'usuario'}${zoneName ? ` en ${zoneName}` : ''}.`}
        </p>
      </form>
    </div>
  )
}
