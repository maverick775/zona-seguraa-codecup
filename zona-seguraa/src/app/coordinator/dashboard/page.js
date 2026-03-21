'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function CoordinatorDashboard() {
  const router = useRouter()
  const [session, setSession] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    const checkSession = async () => {
      const supabase = createClient()
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (!session || sessionError) {
        router.replace('/coordinator/login')
        return
      }

      setSession(session)
      await loadAlerts()
    }

    checkSession()
  }, [router])

  const loadAlerts = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/alerts?status=active,in_progress&sort=created_at:desc')

      if (!response.ok) {
        throw new Error('Error al cargar alertas')
      }

      const data = await response.json()
      setAlerts(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.message)
      setAlerts([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadAlerts()
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/coordinator/login')
  }

  const handleUpdateStatus = async (alertId, newStatus) => {
    if (!session) return

    try {
      const response = await fetch(`/api/alerts/${alertId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ status: newStatus })
      })

      if (!response.ok) {
        throw new Error('Error al actualizar alerta')
      }

      await loadAlerts()
    } catch (err) {
      alert(`Error: ${err.message}`)
    }
  }

  const getTimeAgo = (timestamp) => {
    const seconds = Math.floor((new Date() - new Date(timestamp)) / 1000)

    if (seconds < 60) return `${seconds}s`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
    return `${Math.floor(seconds / 86400)}d`
  }

  useEffect(() => {
    if (!session) return

    const supabase = createClient()
    const channel = supabase
      .channel('coordinator-alerts')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'alerts' },
        () => {
          loadAlerts()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [session])

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Panel de Coordinador</h1>
              {session?.user?.email && (
                <p className="text-sm text-gray-500 mt-1">{session.user.email}</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <span className={refreshing ? 'animate-spin' : ''}>↻</span>
                Actualizar
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-red-700 bg-white border border-red-300 rounded-lg hover:bg-red-50"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Loading State */}
        {loading && !refreshing && (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800 font-medium">{error}</p>
            <button
              onClick={loadAlerts}
              className="mt-3 text-sm text-red-700 underline hover:text-red-800"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Alerts List */}
        {!loading && !error && (
          <>
            {alerts.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <p className="text-gray-500 text-lg">No hay alertas activas en este momento</p>
                <p className="text-gray-400 text-sm mt-2">Las alertas aparecerán aquí cuando sean reportadas</p>
              </div>
            ) : (
              <div className="space-y-4">
                {alerts.map(alert => (
                  <div key={alert.id} className="bg-white rounded-lg shadow-lg p-6">
                    {/* Alert Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {/* Type Badge */}
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                            {alert.type === 'medical' && '🏥 Emergencia Médica'}
                            {alert.type === 'security' && '🛡️ Seguridad'}
                            {alert.type === 'evacuation' && '🚨 Evacuación'}
                            {alert.type === 'fire' && '🔥 Incendio'}
                            {!['medical', 'security', 'evacuation', 'fire'].includes(alert.type) && `⚠️ ${alert.type}`}
                          </span>

                          {/* Level Badge */}
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                            alert.level === 1 ? 'bg-yellow-100 text-yellow-800' :
                            alert.level === 2 ? 'bg-orange-100 text-orange-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            Nivel {alert.level}
                          </span>

                          {/* Status Badge */}
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                            alert.status === 'active' ? 'bg-green-100 text-green-800' :
                            alert.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {alert.status === 'active' && 'Activa'}
                            {alert.status === 'in_progress' && 'En Atención'}
                            {alert.status === 'resolved' && 'Resuelta'}
                            {alert.status === 'false_alarm' && 'Falsa Alarma'}
                          </span>
                        </div>

                        {/* Description */}
                        <p className="text-gray-800 text-base mb-3">
                          {alert.description && alert.description.length > 200
                            ? `${alert.description.substring(0, 200)}...`
                            : alert.description || 'Sin descripción'}
                        </p>

                        {/* Metadata */}
                        <div className="text-sm text-gray-600">
                          <span>Por <strong>{alert.created_by_nick || 'Anónimo'}</strong></span>
                          <span className="mx-2">•</span>
                          <span>hace {getTimeAgo(alert.created_at)}</span>
                          {alert.node && (
                            <>
                              <span className="mx-2">•</span>
                              <span>{alert.node.name}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                      {alert.status === 'active' && (
                        <button
                          onClick={() => handleUpdateStatus(alert.id, 'in_progress')}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 active:bg-blue-800 transition-colors"
                        >
                          Atender
                        </button>
                      )}

                      {(alert.status === 'active' || alert.status === 'in_progress') && (
                        <button
                          onClick={() => handleUpdateStatus(alert.id, 'resolved')}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 active:bg-green-800 transition-colors"
                        >
                          Resolver
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
