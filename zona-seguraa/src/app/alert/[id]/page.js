'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function AlertDetailPage() {
  const router = useRouter()
  const params = useParams()
  const alertId = params.id

  const [alert, setAlert] = useState(null)
  const [votes, setVotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [user, setUser] = useState(null)
  const [showAliasForm, setShowAliasForm] = useState(false)
  const [tempNickname, setTempNickname] = useState('')
  const [tempLanguage, setTempLanguage] = useState('es')
  const [aliasError, setAliasError] = useState('')

  const [voteComment, setVoteComment] = useState('')
  const [voting, setVoting] = useState(false)
  const [voteError, setVoteError] = useState('')

  useEffect(() => {
    loadAlertData()
    loadUserFromStorage()
  }, [alertId])

  const loadUserFromStorage = () => {
    try {
      const stored = localStorage.getItem('zs_user')
      if (stored) {
        const parsed = JSON.parse(stored)
        setUser(parsed)
      }
    } catch (err) {
      console.error('Error loading user from storage:', err)
    }
  }

  const loadAlertData = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/alerts/${alertId}`)

      if (!response.ok) {
        if (response.status === 404) {
          setError('Alerta no encontrada')
        } else {
          setError('Error al cargar la alerta')
        }
        setLoading(false)
        return
      }

      const data = await response.json()
      setAlert(data)
      setVotes(data.votes || [])
    } catch (err) {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAlias = async () => {
    if (!tempNickname.trim()) {
      setAliasError('El nombre es requerido')
      return
    }

    setAliasError('')

    try {
      // Registrar en users_temp en la base de datos
      const response = await fetch('/api/users/temp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nickname: tempNickname.trim(),
          language: tempLanguage
        })
      })

      if (!response.ok) {
        const data = await response.json()
        setAliasError(data.error || 'Error al crear alias')
        return
      }

      // Guardar en localStorage
      const newUser = {
        nickname: tempNickname.trim(),
        language: tempLanguage,
        created_at: new Date().toISOString()
      }

      localStorage.setItem('zs_user', JSON.stringify(newUser))
      setUser(newUser)
      setShowAliasForm(false)
      setTempNickname('')
      setAliasError('')
    } catch (err) {
      setAliasError('Error de conexión. Intenta de nuevo.')
    }
  }

  const handleSubmitVote = async () => {
    if (!user) {
      setVoteError('Debes crear un alias primero')
      return
    }

    setVoting(true)
    setVoteError('')

    try {
      const response = await fetch('/api/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alert_id: alertId,
          nickname: user.nickname,
          role: 'visitor',
          comment: voteComment.trim() || null
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setVoteError(data.error || 'Error al enviar validación')
        setVoting(false)
        return
      }

      // Actualizar UI sin recargar página
      setVoteComment('')
      await loadAlertData()

    } catch (err) {
      setVoteError('Error de conexión. Intenta de nuevo.')
    } finally {
      setVoting(false)
    }
  }

  const getAlertIcon = (type) => {
    const icons = {
      medical: '🏥',
      security: '🛡️',
      evacuation: '🚨',
      fire: '🔥',
      other: '⚠️'
    }
    return icons[type] || icons.other
  }

  const getAlertTypeLabel = (type) => {
    const labels = {
      medical: 'Emergencia Médica',
      security: 'Seguridad',
      evacuation: 'Evacuación',
      fire: 'Incendio',
      other: 'Otro'
    }
    return labels[type] || type
  }

  const getLevelBadgeClass = (level) => {
    if (level === 1) return 'bg-yellow-100 text-yellow-800'
    if (level === 2) return 'bg-orange-100 text-orange-800'
    if (level === 3) return 'bg-red-100 text-red-800'
    return 'bg-gray-100 text-gray-800'
  }

  const getStatusBadgeClass = (status) => {
    const classes = {
      active: 'bg-green-100 text-green-800',
      in_progress: 'bg-blue-100 text-blue-800',
      resolved: 'bg-gray-100 text-gray-800',
      false_alarm: 'bg-red-100 text-red-800'
    }
    return classes[status] || 'bg-gray-100 text-gray-800'
  }

  const getStatusLabel = (status) => {
    const labels = {
      active: 'Activa',
      in_progress: 'En Atención',
      resolved: 'Resuelta',
      false_alarm: 'Falsa Alarma'
    }
    return labels[status] || status
  }

  const getTimeAgo = (timestamp) => {
    const seconds = Math.floor((new Date() - new Date(timestamp)) / 1000)

    if (seconds < 60) return `${seconds} segundos`
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutos`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} horas`
    return `${Math.floor(seconds / 86400)} días`
  }

  useEffect(() => {
    if (!alertId) return

    const supabase = createClient()

    const channel = supabase
      .channel(`alert-${alertId}`)
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'alert_votes',
          filter: `alert_id=eq.${alertId}`
        },
        () => {
          loadAlertData()
        }
      )
      .on('postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'alerts',
          filter: `id=eq.${alertId}`
        },
        () => {
          loadAlertData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [alertId])

  if (loading) {
    return (
      <div className="max-w-md mx-auto px-4 py-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-48 bg-gray-200 rounded mb-4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto px-4 py-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-800 text-lg mb-4">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    )
  }

  if (!alert) {
    return (
      <div className="max-w-md mx-auto px-4 py-6">
        <p className="text-gray-600 text-center">Alerta no encontrada</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto px-4 py-6">
        {/* Botón Volver */}
        <button
          onClick={() => router.back()}
          className="mb-6 text-gray-600 hover:text-gray-900 flex items-center gap-2"
        >
          <span>←</span>
          <span>Volver</span>
        </button>

        {/* Sección 1: Encabezado de la alerta */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          {/* Badges superiores */}
          <div className="flex flex-wrap gap-2 mb-4">
            {/* Badge de tipo */}
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
              {getAlertIcon(alert.type)} {getAlertTypeLabel(alert.type)}
            </span>

            {/* Badge de nivel */}
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getLevelBadgeClass(alert.level)}`}>
              Nivel {alert.level}
            </span>

            {/* Badge de estado */}
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeClass(alert.status)}`}>
              {getStatusLabel(alert.status)}
            </span>
          </div>

          {/* Descripción */}
          <p className="text-gray-800 text-lg mb-4">{alert.description || 'Sin descripción'}</p>

          {/* Metadata */}
          <div className="text-sm text-gray-600">
            <p>Reportado por <strong>{alert.created_by_nick || 'Anónimo'}</strong> hace {getTimeAgo(alert.created_at)}</p>
            {alert.node && (
              <p>Ubicación: <strong>{alert.node.name}</strong> ({alert.node.type})</p>
            )}
          </div>
        </div>

        {/* Sección 2: Validaciones de la comunidad */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Validaciones de la comunidad</h2>

          {/* Contador de validaciones */}
          <div className="mb-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-lg">
              <strong>{votes.length}</strong> {votes.length === 1 ? 'persona ha' : 'personas han'} validado este reporte
            </p>

            {/* Indicador de escalado */}
            {alert.level === 2 && (
              <p className="text-green-700 mt-2 flex items-center gap-2">
                <span>✅</span>
                <span>Alerta escalada a Nivel 2 por validación comunitaria</span>
              </p>
            )}

            {alert.level === 3 && (
              <p className="text-red-700 mt-2 flex items-center gap-2">
                <span>🚨</span>
                <span>Alerta escalada a Nivel 3 - Prioridad crítica</span>
              </p>
            )}
          </div>

          {/* Lista de comentarios */}
          {votes.filter(v => v.comment).length > 0 && (
            <div>
              <h3 className="font-semibold mb-3">Comentarios:</h3>
              <div className="space-y-3">
                {votes.filter(v => v.comment).map(vote => (
                  <div key={vote.id} className="border-l-4 border-blue-500 pl-4 py-2">
                    <p className="text-gray-800">{vote.comment}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {vote.nickname} • hace {getTimeAgo(vote.created_at)}
                      {vote.role === 'coordinator' && (
                        <span className="ml-2 text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
                          Coordinador
                        </span>
                      )}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {votes.filter(v => v.comment).length === 0 && (
            <p className="text-gray-500 italic">Aún no hay comentarios</p>
          )}
        </div>

        {/* Sección 3: Formulario de validación */}
        {(alert.status === 'active' || alert.status === 'in_progress') && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4">Validar este reporte</h2>

            {/* Si hay usuario en localStorage */}
            {user && !showAliasForm && (
              <div>
                <p className="text-sm text-gray-600 mb-4">
                  Validando como <strong>{user.nickname}</strong>
                </p>

                {/* Verificar si ya votó */}
                {votes.some(v => v.nickname === user.nickname) ? (
                  <p className="text-green-700 bg-green-50 p-4 rounded-lg">
                    Ya has validado este reporte. ¡Gracias por tu participación!
                  </p>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ¿Puedes confirmar este reporte? Agrega un comentario (opcional)
                    </label>
                    <textarea
                      value={voteComment}
                      onChange={(e) => setVoteComment(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg p-3 mb-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 placeholder:text-gray-400"
                      rows={3}
                      placeholder="Describe lo que observas o cualquier información adicional..."
                    />

                    {voteError && (
                      <p className="text-red-600 text-sm mb-3">{voteError}</p>
                    )}

                    <button
                      onClick={handleSubmitVote}
                      disabled={voting}
                      className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {voting ? 'Enviando...' : '✅ Confirmar que es real'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Si NO hay usuario en localStorage */}
            {!user && !showAliasForm && (
              <div>
                <p className="text-gray-700 mb-4">
                  Para validar este reporte, necesitamos que te identifiques con un alias.
                </p>
                <button
                  onClick={() => setShowAliasForm(true)}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700"
                >
                  Crear alias y validar
                </button>
              </div>
            )}

            {/* Formulario inline para crear alias */}
            {showAliasForm && (
              <div className="border-2 border-blue-500 rounded-lg p-4 bg-blue-50">
                <h3 className="font-semibold mb-3">Crea tu alias</h3>

                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tu nombre o alias
                </label>
                <input
                  type="text"
                  value={tempNickname}
                  onChange={(e) => setTempNickname(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2 mb-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 placeholder:text-gray-400"
                  placeholder="Ej: Juan, Vecino23, etc."
                  maxLength={50}
                />

                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Idioma / Language
                </label>
                <select
                  value={tempLanguage}
                  onChange={(e) => setTempLanguage(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2 mb-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                >
                  <option value="es" className="text-gray-900">Español</option>
                  <option value="en" className="text-gray-900">English</option>
                </select>

                {aliasError && (
                  <p className="text-red-600 text-sm mb-3">{aliasError}</p>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={handleCreateAlias}
                    disabled={!tempNickname.trim()}
                    className="flex-1 bg-green-600 text-white py-2 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    Confirmar
                  </button>
                  <button
                    onClick={() => {
                      setShowAliasForm(false)
                      setTempNickname('')
                      setAliasError('')
                    }}
                    className="px-4 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Estado cerrado */}
        {(alert.status === 'resolved' || alert.status === 'false_alarm') && (
          <div className="bg-gray-50 rounded-lg p-6 text-center">
            <p className="text-gray-600 text-lg">
              {alert.status === 'resolved' ? (
                <>✅ Esta alerta ha sido resuelta</>
              ) : (
                <>⚠️ Esta alerta fue marcada como falsa alarma</>
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
