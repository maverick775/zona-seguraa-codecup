'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

const ZONE_ID = 'a1000000-0000-0000-0000-000000000001'

const typeLabels = {
  medical: 'Emergencia Médica',
  security: 'Seguridad',
  fire: 'Incendio',
  evacuation: 'Evacuación',
}
const typeIcons = { medical: '🏥', security: '🚨', fire: '🔥', evacuation: '🚪' }
const levelColors = { 1: 'bg-yellow-400', 2: 'bg-orange-400', 3: 'bg-red-500' }
const levelLabels = { 1: 'Bajo', 2: 'Medio', 3: 'Alto' }

export default function AlertValidationPage() {
  const router = useRouter()
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchAlerts = async () => {
    try {
      const res = await fetch(`/api/alerts?zone_id=${ZONE_ID}`)
      if (res.ok) {
        const data = await res.json()
        setAlerts(data)
      }
    } catch (err) {
      console.error('Error loading alerts:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAlerts()
    const supabase = createClient()
    const channel = supabase
      .channel('validation-alerts')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'alerts', filter: `zone_id=eq.${ZONE_ID}` },
        () => fetchAlerts()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'alert_votes' },
        () => fetchAlerts()
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Cargando alertas...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-lg font-semibold text-gray-900">Validar Alertas</h1>
            <div className="w-6" />
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6">
        <p className="text-gray-600 mb-6">
          Ayuda a confirmar alertas activas en tu zona. Tu voto ayuda a escalar emergencias reales.
        </p>

        <div className="space-y-4">
          {alerts.filter((a) => a.status === 'active').map((alert) => (
            <div key={alert.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className={`p-4 ${alert.level >= 3 ? 'bg-red-50 border-b border-red-200' : 'bg-yellow-50 border-b border-yellow-200'}`}>
                <div className="flex items-start">
                  <div className={`w-12 h-12 ${alert.level >= 3 ? 'bg-red-100' : 'bg-yellow-100'} rounded-full flex items-center justify-center mr-3`}>
                    <span className="text-2xl">{typeIcons[alert.type] || '⚠️'}</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900">{typeLabels[alert.type] || alert.type}</h3>
                    <div className="flex items-center mt-1">
                      <div className={`w-3 h-3 rounded-full ${levelColors[alert.level] || 'bg-gray-400'} mr-2`} />
                      <span className="text-sm font-medium text-gray-700">Nivel {levelLabels[alert.level] || alert.level}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4">
                {alert.description && <p className="text-gray-900 mb-3">{alert.description}</p>}
                {alert.node && (
                  <div className="flex items-center text-sm text-gray-600 mb-4">
                    <span className="mr-1">📍</span>
                    {alert.node.name}
                  </div>
                )}

                <Link
                  href={`/alert/${alert.id}`}
                  className="w-full py-3 px-4 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors flex items-center justify-center"
                >
                  <span className="mr-2">👁️</span>
                  Ver detalle y validar
                </Link>
              </div>
            </div>
          ))}

          {alerts.filter((a) => a.status === 'active').length === 0 && (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-green-600 font-bold">✓</span>
              </div>
              <p className="text-gray-900 font-medium">No hay alertas por validar</p>
              <p className="text-gray-500 text-sm">Todo está tranquilo en tu zona</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
