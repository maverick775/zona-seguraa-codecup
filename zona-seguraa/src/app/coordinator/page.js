'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase'

const ZONE_ID = 'a1000000-0000-0000-0000-000000000001'
const CENTER = [20.6770, -103.3458]
const ZOOM = 17

const MapContainer = dynamic(() => import('react-leaflet').then((m) => m.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then((m) => m.TileLayer), { ssr: false })
const Circle = dynamic(() => import('react-leaflet').then((m) => m.Circle), { ssr: false })
const CircleMarker = dynamic(() => import('react-leaflet').then((m) => m.CircleMarker), { ssr: false })
const Popup = dynamic(() => import('react-leaflet').then((m) => m.Popup), { ssr: false })

const TYPE_LABELS = { medical: 'Emergencia Médica', security: 'Seguridad', fire: 'Incendio', evacuation: 'Evacuación' }
const TYPE_ICONS = { medical: '🏥', security: '🚨', fire: '🔥', evacuation: '🚪' }
const TYPE_COLORS = { medical: '#e63946', security: '#3a86ff', fire: '#f59e0b', evacuation: '#a020f0' }
const STATUS_LABELS = { active: 'Activa', in_progress: 'Ayuda en Camino', resolved: 'Resuelta', false_alarm: 'Falsa Alarma' }
const STATUS_DOT = { active: 'bg-red-500', in_progress: 'bg-blue-500', resolved: 'bg-green-500', false_alarm: 'bg-gray-400' }
const STATUS_BADGE = {
  active: 'bg-red-100 text-red-700 border-red-200',
  in_progress: 'bg-blue-100 text-blue-700 border-blue-200',
  resolved: 'bg-green-100 text-green-700 border-green-200',
  false_alarm: 'bg-gray-100 text-gray-600 border-gray-200',
}
const LEVEL_LABELS = { 1: 'Baja', 2: 'Media', 3: 'Alta' }
const LEVEL_BADGE = { 1: 'bg-yellow-100 text-yellow-800 border-yellow-200', 2: 'bg-orange-100 text-orange-800 border-orange-200', 3: 'bg-red-100 text-red-800 border-red-200' }
const NODE_TYPE_LABELS = { avp_physical: 'AVP Físico', avp_simulated: 'AVP Simulado', medical_point: 'Punto Médico', mobile_unit: 'Unidad Móvil', exit: 'Salida' }
const NODE_TYPE_COLORS = { avp_physical: '#ef4444', avp_simulated: '#3b82f6', medical_point: '#10b981', mobile_unit: '#f59e0b', exit: '#f59e0b' }
const NODE_STATUS_COLORS = { online: '#10b981', offline: '#6b7280', alert: '#ef4444' }

function getTimeAgo(timestamp) {
  const s = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000)
  if (s < 60) return `hace ${s}s`
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`
  if (s < 86400) return `hace ${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`
  return `hace ${Math.floor(s / 86400)}d`
}

function getAvgResponseTime(alerts) {
  const attended = alerts.filter((a) => a.status === 'in_progress' || a.status === 'resolved')
  if (attended.length === 0) return '—'
  const total = attended.reduce((sum, a) => {
    const created = new Date(a.created_at).getTime()
    const updated = new Date(a.updated_at).getTime()
    return sum + (updated - created)
  }, 0)
  const avgMs = total / attended.length
  const mins = Math.floor(avgMs / 60000)
  return mins < 1 ? '<1m' : `${mins}m`
}

export default function CoordinatorPage() {
  const router = useRouter()
  const [session, setSession] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [nodes, setNodes] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('panel')
  const [alertFilter, setAlertFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedAlert, setSelectedAlert] = useState(null)
  const [actionLoading, setActionLoading] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [mapReady, setMapReady] = useState(false)
  const iconFixRef = useRef(false)
  const [resolveHolding, setResolveHolding] = useState(null)
  const holdTimerRef = useRef(null)

  useEffect(() => {
    const init = async () => {
      try {
        const supabase = createClient()
        const { data: { session: s } } = await supabase.auth.getSession()
        if (s) setSession(s)
      } catch (e) {
        console.warn('[coordinator] auth check skipped:', e.message)
      }
    }
    init()
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    import('leaflet/dist/leaflet.css')
    if (!iconFixRef.current) {
      iconFixRef.current = true
      import('leaflet').then((L) => {
        delete L.default.Icon.Default.prototype._getIconUrl
        L.default.Icon.Default.mergeOptions({
          iconRetinaUrl: '/leaflet/marker-icon-2x.png',
          iconUrl: '/leaflet/marker-icon.png',
          shadowUrl: '/leaflet/marker-shadow.png',
        })
        setMapReady(true)
      })
    }
  }, [])

  const fetchData = async () => {
    try {
      const [aRes, nRes] = await Promise.all([
        fetch(`/api/alerts?zone_id=${ZONE_ID}`),
        fetch(`/api/nodes?zone_id=${ZONE_ID}`),
      ])
      if (aRes.ok) { const d = await aRes.json(); setAlerts(Array.isArray(d) ? d : []) }
      if (nRes.ok) { const d = await nRes.json(); setNodes(Array.isArray(d) ? d : []) }
    } catch (err) {
      console.error('[coordinator] fetch error:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData()
    try {
      const supabase = createClient()
      const channel = supabase
        .channel('coord-dash')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts', filter: `zone_id=eq.${ZONE_ID}` }, () => fetchData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'nodes', filter: `zone_id=eq.${ZONE_ID}` }, () => fetchData())
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alert_votes' }, () => fetchData())
        .subscribe()
      return () => { supabase.removeChannel(channel) }
    } catch (e) {
      console.warn('[coordinator] realtime skipped:', e.message)
    }
  }, [])

  const handleAction = useCallback(async (alertId, newStatus) => {
    setActionLoading(alertId)
    try {
      const headers = { 'Content-Type': 'application/json' }
      if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`
      const res = await fetch(`/api/alerts/${alertId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        setSelectedAlert((prev) => prev && prev.id === alertId ? { ...prev, status: newStatus, ...(newStatus === 'resolved' ? { resolved_at: new Date().toISOString() } : {}) } : prev)
        await fetchData()
      }
    } catch (err) {
      console.error('[coordinator] action error:', err)
    } finally {
      setActionLoading(null)
    }
  }, [session])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/coordinator/login')
  }

  const handleRefresh = () => { setRefreshing(true); fetchData() }

  const handleActionRef = useRef(handleAction)
  useEffect(() => { handleActionRef.current = handleAction }, [handleAction])
  useEffect(() => {
    return () => {
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current)
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)
    }
  }, [])

  const [resolveProgress, setResolveProgress] = useState(0)
  const progressIntervalRef = useRef(null)

  const startResolveHold = (alertId, e) => {
    if (e) e.preventDefault()
    if (resolveHolding) return
    setResolveHolding(alertId)
    setResolveProgress(0)
    const startTime = Date.now()
    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime
      setResolveProgress(Math.min(100, (elapsed / 3000) * 100))
    }, 50)
    holdTimerRef.current = setTimeout(async () => {
      clearInterval(progressIntervalRef.current)
      setResolveProgress(100)
      await handleActionRef.current(alertId, 'resolved')
      setResolveHolding(null)
      setResolveProgress(0)
    }, 3000)
  }
  const cancelResolveHold = (e) => {
    if (e) e.preventDefault()
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current)
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)
    setResolveHolding(null)
    setResolveProgress(0)
  }

  const activeAlerts = useMemo(() => alerts.filter((a) => a.status === 'active'), [alerts])
  const inProgressAlerts = useMemo(() => alerts.filter((a) => a.status === 'in_progress'), [alerts])
  const resolvedToday = useMemo(() => {
    const today = new Date().toDateString()
    return alerts.filter((a) => a.status === 'resolved' && new Date(a.resolved_at || a.updated_at).toDateString() === today)
  }, [alerts])

  const filteredAlerts = useMemo(() => {
    let list = alerts
    if (alertFilter !== 'all') list = list.filter((a) => a.status === alertFilter)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter((a) =>
        (TYPE_LABELS[a.type] || a.type).toLowerCase().includes(q) ||
        (a.description || '').toLowerCase().includes(q) ||
        (a.node?.name || '').toLowerCase().includes(q) ||
        a.id.toLowerCase().includes(q)
      )
    }
    return list
  }, [alerts, alertFilter, searchQuery])

  const filterCounts = useMemo(() => ({
    all: alerts.length,
    active: activeAlerts.length,
    in_progress: inProgressAlerts.length,
    resolved: alerts.filter((a) => a.status === 'resolved').length,
    false_alarm: alerts.filter((a) => a.status === 'false_alarm').length,
  }), [alerts, activeAlerts, inProgressAlerts])

  const isAuthenticated = !!session

  const alertBorderColor = (a) => {
    if (a.status === 'active') return 'border-l-red-500'
    if (a.status === 'in_progress') return 'border-l-blue-500'
    if (a.status === 'resolved') return 'border-l-green-500'
    return 'border-l-gray-300'
  }

  // ─── DETAIL VIEW ──────────────────────────────────────────
  if (selectedAlert) {
    const a = selectedAlert
    const votes = a.votes || []
    const totalWeight = a.votes_total_weight || votes.reduce((s, v) => s + v.weight, 0)
    return (
      <div className="min-h-screen bg-gray-50 pb-24">
        <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-4">
          <div className="flex items-center justify-between">
            <button onClick={() => setSelectedAlert(null)} className="flex items-center gap-2 text-white/90 hover:text-white">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div className="text-center flex-1">
              <p className="text-xs text-white/80 uppercase tracking-wider">{a.id.slice(0, 8).toUpperCase()}</p>
              <p className="font-semibold">Detalle de Alerta</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${a.level === 3 ? 'bg-red-700' : a.level === 2 ? 'bg-orange-600' : 'bg-yellow-500 text-yellow-900'}`}>
              Urgencia {LEVEL_LABELS[a.level]}
            </span>
          </div>
        </div>

        <div className="max-w-md mx-auto px-4 py-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl" style={{ backgroundColor: TYPE_COLORS[a.type] + '20' }}>
              {TYPE_ICONS[a.type] || '⚠️'}
            </div>
            <div className="flex-1">
              <p className="text-xs uppercase font-semibold" style={{ color: TYPE_COLORS[a.type] }}>{TYPE_LABELS[a.type]}</p>
              <p className="font-bold text-gray-900 text-lg">{a.description || TYPE_LABELS[a.type]}</p>
            </div>
            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${STATUS_BADGE[a.status]}`}>
              <span className={`inline-block w-2 h-2 rounded-full mr-1 ${STATUS_DOT[a.status]}`} />
              {STATUS_LABELS[a.status]}
            </span>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            <p className="text-xs uppercase font-semibold text-gray-600 tracking-wider">Información de la Alerta</p>
            <div className="space-y-2 text-sm">
              {a.node && (
                <div className="flex items-start gap-2">
                  <span className="text-gray-400">📍</span>
                  <div><p className="text-xs text-gray-500">Ubicación</p><p className="text-gray-900 font-medium">{a.node.name}</p></div>
                </div>
              )}
              <div className="flex items-start gap-2">
                <span className="text-gray-400">🕐</span>
                <div><p className="text-xs text-gray-500">Hora de reporte</p><p className="text-gray-900 font-medium">{getTimeAgo(a.created_at)} ({new Date(a.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })})</p></div>
              </div>
              {(a.node?.lat && a.node?.lng) && (
                <div className="flex items-start gap-2">
                  <span className="text-gray-400">🌐</span>
                  <div><p className="text-xs text-gray-500">Coordenadas</p><p className="text-gray-900 font-medium">{a.node.lat.toFixed(4)}° N, {Math.abs(a.node.lng).toFixed(4)}° O</p></div>
                </div>
              )}
              <div className="flex items-start gap-2">
                <span className="text-gray-400">👤</span>
                <div><p className="text-xs text-gray-500">Reportado por</p><p className="text-gray-900 font-medium">{a.created_by_nick || 'Ciudadano Anónimo'}</p></div>
              </div>
            </div>
            {a.description && (
              <div className="bg-gray-50 rounded-lg p-3 mt-2">
                <p className="text-sm text-gray-700">{a.description}</p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center">
                <span className="text-teal-700 font-bold text-lg">{totalWeight}</span>
              </div>
              <div>
                <p className="font-semibold text-gray-900">Verificaciones Ciudadanas</p>
                <p className="text-sm text-gray-500">{votes.length} ciudadanos confirmaron esta alerta en la zona</p>
              </div>
            </div>
            {votes.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-3">
                {votes.slice(0, 10).map((v, i) => (
                  <div key={v.id || i} className="w-8 h-8 rounded-full bg-teal-500 text-white flex items-center justify-center text-xs font-bold" title={v.nickname || '?'}>
                    {(v.nickname || '?')[0].toUpperCase()}
                  </div>
                ))}
                {votes.length > 10 && <div className="w-8 h-8 rounded-full bg-gray-300 text-gray-600 flex items-center justify-center text-xs font-bold">+{votes.length - 10}</div>}
              </div>
            )}
            {votes.filter(v => v.comment).length > 0 && (
              <div className="mt-3 space-y-2">
                <p className="text-xs uppercase font-semibold text-gray-600 tracking-wider">Comentarios</p>
                {votes.filter(v => v.comment).slice(0, 5).map((v, i) => (
                  <div key={v.id || i} className="border-l-2 border-teal-300 pl-3 py-1">
                    <p className="text-sm text-gray-700">{v.comment}</p>
                    <p className="text-xs text-gray-500">{v.nickname}{v.role === 'coordinator' ? ' (Coord.)' : ''} · {getTimeAgo(v.created_at)}</p>
                  </div>
                ))}
              </div>
            )}
            <Link href={`/alert/${a.id}`} target="_blank" rel="noopener noreferrer" className="mt-3 flex items-center justify-center gap-2 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors">
              👁️ Ver vista pública y validaciones
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
            </Link>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            <p className="text-xs uppercase font-semibold text-gray-600 tracking-wider flex items-center gap-1">⚙️ Acciones del Coordinador</p>
            {a.status === 'active' && (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => { handleAction(a.id, 'in_progress'); setSelectedAlert({ ...a, status: 'in_progress' }) }}
                  disabled={actionLoading === a.id}
                  className="py-3 px-4 bg-green-50 border-2 border-green-500 text-green-700 rounded-xl font-medium hover:bg-green-100 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <span>✓</span> Verificar
                </button>
                <button
                  onClick={() => { handleAction(a.id, 'false_alarm'); setSelectedAlert({ ...a, status: 'false_alarm' }) }}
                  disabled={actionLoading === a.id}
                  className="py-3 px-4 bg-red-50 border-2 border-red-400 text-red-600 rounded-xl font-medium hover:bg-red-100 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <span>✕</span> Falsa Alarma
                </button>
              </div>
            )}
            {a.status === 'active' && (
              <button
                onClick={() => { handleAction(a.id, 'in_progress'); setSelectedAlert({ ...a, status: 'in_progress' }) }}
                disabled={actionLoading === a.id}
                className="w-full py-4 bg-teal-600 text-white rounded-xl font-bold text-lg hover:bg-teal-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                🚑 Ayuda en Camino
              </button>
            )}
            {a.status === 'in_progress' && (
              <div className="space-y-2">
                <button
                  onMouseDown={(e) => startResolveHold(a.id, e)}
                  onMouseUp={cancelResolveHold}
                  onMouseLeave={cancelResolveHold}
                  onTouchStart={(e) => startResolveHold(a.id, e)}
                  onTouchEnd={cancelResolveHold}
                  onContextMenu={(e) => e.preventDefault()}
                  disabled={actionLoading === a.id}
                  className={`relative w-full py-4 rounded-xl font-bold text-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 overflow-hidden select-none ${resolveHolding === a.id ? 'bg-green-700 text-white scale-[0.98]' : 'bg-green-500 text-white hover:bg-green-600'}`}
                >
                  {resolveHolding === a.id && (
                    <div className="absolute inset-0 bg-green-900/30 transition-all" style={{ width: `${resolveProgress}%` }} />
                  )}
                  <span className="relative z-10 flex items-center gap-2">
                    🏁 {resolveHolding === a.id ? `${Math.ceil((100 - resolveProgress) / 100 * 3)}s...` : 'Alerta Resuelta'}
                  </span>
                </button>
                <p className="text-xs text-center text-gray-400">Mantén presionado 3 segundos para confirmar.</p>
              </div>
            )}
            {(a.status === 'resolved' || a.status === 'false_alarm') && (
              <p className="text-sm text-center text-gray-500 py-2">Esta alerta ya fue {a.status === 'resolved' ? 'resuelta' : 'cancelada'}.</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ─── MAIN LAYOUT ──────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-700 to-teal-600 text-white">
        <div className="max-w-md mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center"><span className="text-lg">🛡️</span></div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-lg">ZonaSeguRAA</span>
                  <span className="px-2 py-0.5 bg-yellow-500 text-yellow-900 text-[10px] font-bold rounded-full uppercase">Coord.</span>
                </div>
                <p className="text-xs text-teal-100">Plaza de la Liberación</p>
              </div>
            </div>
            <button onClick={handleRefresh} className="relative p-2">
              <span className={`text-xl ${refreshing ? 'animate-spin' : ''}`}>🔔</span>
              {activeAlerts.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center">{activeAlerts.length}</span>
              )}
            </button>
          </div>
        </div>
        {activeAlerts.length > 0 && (
          <div className="bg-red-600 text-center py-1.5 text-sm font-medium">
            <span className="inline-block w-2 h-2 bg-white rounded-full mr-2 animate-pulse" />
            {activeAlerts.length} ALERTA{activeAlerts.length > 1 ? 'S' : ''} ACTIVA{activeAlerts.length > 1 ? 'S' : ''} EN ZONA
          </div>
        )}
        {activeAlerts.length === 0 && (
          <div className="bg-green-600 text-center py-1.5 text-sm font-medium">
            <span className="inline-block w-2 h-2 bg-white rounded-full mr-2" />
            ZONA DESPEJADA
          </div>
        )}
      </div>

      {/* Tab Content */}
      <div className="max-w-md mx-auto">
        {/* ─── PANEL TAB ───────────────────────────────── */}
        {activeTab === 'panel' && (
          <div className="px-4 py-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-900">Resumen de Turno</h2>
              <button onClick={handleRefresh} className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                <span className={refreshing ? 'animate-spin' : ''}>↻</span> Act. {refreshing ? '...' : 'Justo ahora'}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-semibold text-gray-600 uppercase">Alertas Activas</p>
                  <span className="text-red-500">⚠️</span>
                </div>
                <p className="text-3xl font-bold text-gray-900">{activeAlerts.length}</p>
                <p className="text-xs text-gray-500">{inProgressAlerts.length} con ayuda en camino</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-semibold text-gray-600 uppercase">Resueltas Hoy</p>
                  <span className="text-green-500">✅</span>
                </div>
                <p className="text-3xl font-bold text-gray-900">{resolvedToday.length}</p>
                <p className="text-xs text-gray-500">En este turno</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-semibold text-gray-600 uppercase">Tiempo Prom.</p>
                  <span className="text-blue-500">🕐</span>
                </div>
                <p className="text-3xl font-bold text-gray-900">{getAvgResponseTime(alerts)}</p>
                <p className="text-xs text-gray-500">Respuesta promedio</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-semibold text-gray-600 uppercase">Personal Zona</p>
                  <span className="text-orange-500">👥</span>
                </div>
                <p className="text-3xl font-bold text-gray-900">{nodes.filter((n) => n.status === 'online').length}</p>
                <p className="text-xs text-gray-500">Nodos online</p>
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto py-1">
              {['security', 'medical', 'fire', 'evacuation'].map((t) => {
                const count = alerts.filter((a) => a.type === t && (a.status === 'active' || a.status === 'in_progress')).length
                return (
                  <div key={t} className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm whitespace-nowrap ${count > 0 ? 'bg-red-50 border-red-200 text-red-700 font-medium' : 'bg-white border-gray-200 text-gray-500'}`}>
                    <span>{TYPE_ICONS[t]}</span>
                    <span>{count}</span>
                  </div>
                )
              })}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <h3 className="font-bold text-gray-900">Actividad en Tiempo Real</h3>
              </div>
              <span className="text-sm text-gray-400">{alerts.length} alertas</span>
            </div>

            <div className="space-y-3">
              {loading ? (
                [1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-xl border p-4 animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-3" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                ))
              ) : alerts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-4xl mb-2">✅</p>
                  <p className="font-medium">No hay alertas registradas</p>
                </div>
              ) : (
                alerts.slice(0, 8).map((a) => (
                  <button
                    key={a.id}
                    onClick={async () => {
                      const res = await fetch(`/api/alerts/${a.id}`)
                      if (res.ok) setSelectedAlert(await res.json())
                      else setSelectedAlert(a)
                    }}
                    className={`w-full text-left bg-white rounded-xl border-l-4 border border-gray-200 ${alertBorderColor(a)} p-4 hover:shadow-md transition-shadow`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <span className="text-xl mt-0.5">{TYPE_ICONS[a.type] || '⚠️'}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-gray-900 truncate">{a.description || TYPE_LABELS[a.type]}</p>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">📍 {a.node?.name || 'Sin ubicación'}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-gray-500">🕐 {getTimeAgo(a.created_at)}</span>
                            <span className="text-xs text-gray-500">👥 {a.votes_total_weight || 0} verificaciones</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 ml-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${STATUS_BADGE[a.status]}`}>
                          <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${STATUS_DOT[a.status]}`} />{STATUS_LABELS[a.status]}
                        </span>
                      </div>
                      <svg className="w-4 h-4 text-gray-300 ml-1 mt-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* ─── ALERTAS TAB ─────────────────────────────── */}
        {activeTab === 'alertas' && (
          <div className="px-4 py-4 space-y-4">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por tipo, ubicación o ID..."
                className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {[
                { key: 'all', label: 'Todas' },
                { key: 'active', label: 'Activas' },
                { key: 'in_progress', label: 'Ayuda Enviada' },
                { key: 'resolved', label: 'Resueltas' },
                { key: 'false_alarm', label: 'Canceladas' },
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => setAlertFilter(f.key)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    alertFilter === f.key
                      ? 'bg-teal-600 text-white'
                      : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {f.label}
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${alertFilter === f.key ? 'bg-white/20' : 'bg-gray-100'}`}>
                    {filterCounts[f.key]}
                  </span>
                </button>
              ))}
            </div>

            <div className="space-y-3">
              {filteredAlerts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No hay alertas para mostrar</div>
              ) : (
                filteredAlerts.map((a) => (
                  <button
                    key={a.id}
                    onClick={async () => {
                      const res = await fetch(`/api/alerts/${a.id}`)
                      if (res.ok) setSelectedAlert(await res.json())
                      else setSelectedAlert(a)
                    }}
                    className={`w-full text-left bg-white rounded-xl border-l-4 border border-gray-200 ${alertBorderColor(a)} p-4 hover:shadow-md transition-shadow`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-gray-500 uppercase tracking-wider">{a.id.slice(0, 13).toUpperCase()}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${STATUS_BADGE[a.status]}`}>
                        <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${STATUS_DOT[a.status]}`} />{STATUS_LABELS[a.status]}
                      </span>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-xl mt-0.5">{TYPE_ICONS[a.type] || '⚠️'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900">{a.description || TYPE_LABELS[a.type]}</p>
                        <p className="text-xs text-gray-500">{TYPE_LABELS[a.type]}</p>
                        <p className="text-xs text-gray-500 mt-1">📍 {a.node?.name || 'Sin ubicación'}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-gray-500">🕐 {getTimeAgo(a.created_at)}</span>
                          <span className="text-xs text-gray-500">👥 {a.votes_total_weight || 0} ciudadanos verificaron</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${LEVEL_BADGE[a.level]}`}>{LEVEL_LABELS[a.level]}</span>
                        <svg className="w-4 h-4 text-gray-300 mt-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* ─── ZONA TAB ────────────────────────────────── */}
        {activeTab === 'zona' && (
          <div className="px-4 py-4 space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden" style={{ height: 280 }}>
              {loading || !mapReady ? (
                <div className="flex items-center justify-center h-full bg-gray-100"><span className="text-gray-500">Cargando mapa...</span></div>
              ) : (
                <MapContainer center={CENTER} zoom={ZOOM} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true}>
                  <TileLayer attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  {nodes.filter((n) => n.lat && n.lng).map((node) => {
                    const c = NODE_TYPE_COLORS[node.type] || '#6b7280'
                    return (
                      <Circle key={node.id} center={[node.lat, node.lng]} radius={150} pathOptions={{ color: c, fillColor: c, fillOpacity: 0.25, weight: 2 }}>
                        <Popup><strong>{node.name}</strong><br />{NODE_TYPE_LABELS[node.type] || node.type}<br />Estado: {node.status === 'online' ? '🟢 Online' : '⚫ Offline'}</Popup>
                      </Circle>
                    )
                  })}
                  {alerts.filter((a) => a.node?.lat && a.node?.lng && a.status !== 'resolved' && a.status !== 'false_alarm').map((a) => (
                    <CircleMarker key={`alert-${a.id}`} center={[a.node.lat, a.node.lng]} radius={14} pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.4, weight: 2 }}>
                      <Popup><strong>{TYPE_LABELS[a.type]}</strong><br />{a.description || ''}<br />Nivel: {LEVEL_LABELS[a.level]}</Popup>
                    </CircleMarker>
                  ))}
                </MapContainer>
              )}
            </div>

            <p className="text-xs uppercase font-semibold text-gray-600 tracking-wider">Sectores de Cobertura</p>
            {nodes.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No hay nodos registrados</p>
            ) : (
              <div className="space-y-3">
                {nodes.map((node) => {
                  const nodeAlerts = alerts.filter((a) => a.node_id === node.id && (a.status === 'active' || a.status === 'in_progress'))
                  const borderColor = nodeAlerts.some((a) => a.status === 'active') ? 'border-red-400 bg-red-50'
                    : nodeAlerts.some((a) => a.status === 'in_progress') ? 'border-blue-400 bg-blue-50'
                    : 'border-green-400 bg-green-50'
                  const statusLabel = nodeAlerts.some((a) => a.status === 'active') ? 'Con Alertas'
                    : nodeAlerts.some((a) => a.status === 'in_progress') ? 'Ayuda en camino'
                    : 'Despejado'
                  const statusBadge = nodeAlerts.some((a) => a.status === 'active') ? 'bg-red-100 text-red-700 border-red-300'
                    : nodeAlerts.some((a) => a.status === 'in_progress') ? 'bg-blue-100 text-blue-700 border-blue-300'
                    : 'bg-green-100 text-green-700 border-green-300'
                  return (
                    <div key={node.id} className={`rounded-xl border-2 p-4 ${borderColor}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-gray-900">{node.name.split('—')[0].trim()}</p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                            <span>📡 {NODE_TYPE_LABELS[node.type]}</span>
                            <span>{node.status === 'online' ? '🟢' : '⚫'} {node.status}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${statusBadge}`}>{statusLabel}</span>
                          {nodeAlerts.length > 0 && <p className="text-xs text-red-600 font-medium mt-1">{nodeAlerts.length} alerta{nodeAlerts.length > 1 ? 's' : ''}</p>}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <p className="text-xs uppercase font-semibold text-gray-600 tracking-wider mt-6">Contactos de Respuesta Rápida</p>
            <div className="space-y-2">
              {[
                { name: 'Guardia Principal', sub: 'Puesto Central', phone: '311', online: true },
                { name: 'Bomberos', sub: 'Apoyo externo', phone: '119', online: false },
                { name: 'Emergencias', sub: 'Línea directa', phone: '911', online: true },
              ].map((c, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center"><span className="text-lg">🛡️</span></div>
                    <div>
                      <p className="font-medium text-gray-900">{c.name}</p>
                      <p className="text-xs text-gray-500">{c.sub}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`w-2.5 h-2.5 rounded-full ${c.online ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <a href={`tel:${c.phone}`} className="px-4 py-2 bg-teal-700 text-white rounded-full text-sm font-medium flex items-center gap-1 hover:bg-teal-800">
                      📞 {c.phone}
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── PERFIL TAB ──────────────────────────────── */}
        {activeTab === 'perfil' && (
          <div className="px-4 py-6 space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
              <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">🛡️</span>
              </div>
              <h2 className="text-xl font-bold text-gray-900">Coordinador</h2>
              <p className="text-sm text-gray-500 mt-1">{session?.user?.email || 'Sesión de demo'}</p>
              <span className="inline-block mt-2 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                Rol: Coordinador de Seguridad
              </span>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
              <p className="text-xs uppercase font-semibold text-gray-600 tracking-wider">Estadísticas de sesión</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-900">{alerts.length}</p>
                  <p className="text-xs text-gray-500">Total alertas</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-900">{resolvedToday.length}</p>
                  <p className="text-xs text-gray-500">Resueltas hoy</p>
                </div>
              </div>
            </div>

            <Link href="/" className="block w-full py-3 px-4 bg-gray-100 text-gray-700 rounded-xl font-medium text-center hover:bg-gray-200 transition-colors">
              ← Volver al inicio
            </Link>
            {isAuthenticated ? (
              <button onClick={handleLogout} className="w-full py-3 px-4 bg-red-50 border border-red-200 text-red-700 rounded-xl font-medium hover:bg-red-100 transition-colors">
                Cerrar Sesión
              </button>
            ) : (
              <Link href="/coordinator/login" className="block w-full py-3 px-4 bg-teal-600 text-white rounded-xl font-medium text-center hover:bg-teal-700 transition-colors">
                Iniciar Sesión como Coordinador
              </Link>
            )}
          </div>
        )}
      </div>

      {/* ─── BOTTOM NAV ──────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <div className="max-w-md mx-auto flex">
          {[
            { key: 'panel', icon: '⊞', label: 'Panel' },
            { key: 'alertas', icon: '🔔', label: 'Alertas' },
            { key: 'zona', icon: '🗺️', label: 'Zona' },
            { key: 'perfil', icon: '👤', label: 'Perfil' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex flex-col items-center py-3 text-xs font-medium transition-colors ${
                activeTab === tab.key ? 'text-teal-600 border-t-2 border-teal-600' : 'text-gray-400'
              }`}
            >
              <span className="text-lg mb-0.5">{tab.icon}</span>
              {tab.label}
              {tab.key === 'alertas' && activeAlerts.length > 0 && (
                <span className="absolute -top-1 ml-6 w-4 h-4 bg-red-500 rounded-full text-[9px] text-white flex items-center justify-center font-bold">{activeAlerts.length}</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
