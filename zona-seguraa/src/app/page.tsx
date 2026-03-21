'use client';

import Link from 'next/link';
import { mockAlerts, mockNodes } from '@/lib/mockData';

export default function HomePage() {
  const activeAlerts = mockAlerts.filter(a => a.status === 'active');
  const onlineNodes = mockNodes.filter(n => n.status === 'online');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900">Zona SeguRAA</h1>
            <button className="text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-md mx-auto px-4 py-6">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Bienvenido a Zona Centro</h2>
          <p className="text-gray-600">Mantente informado y ayuda a mantener tu comunidad segura</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-2xl font-bold text-red-600">{activeAlerts.length}</span>
            </div>
            <p className="text-sm font-medium text-gray-900">Alertas Activas</p>
            <p className="text-xs text-gray-500">Necesitan atención</p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-2xl font-bold text-green-600">{onlineNodes.length}</span>
            </div>
            <p className="text-sm font-medium text-gray-900">Nodos Activos</p>
            <p className="text-xs text-gray-500">Sistema operativo</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-4 mb-8">
          <Link
            href="/alerts/create"
            className="block w-full py-4 px-6 bg-teal-600 text-white rounded-xl font-medium text-center hover:bg-teal-700 transition-colors"
          >
            Crear Alerta Nueva
          </Link>
          
          <Link
            href="/alerts/validation"
            className="block w-full py-4 px-6 bg-white border border-gray-300 text-gray-700 rounded-xl font-medium text-center hover:bg-gray-50 transition-colors"
          >
            Validar Alertas Existentes
          </Link>
        </div>

        {/* Recent Activity */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Actividad Reciente</h3>
          <div className="space-y-3">
            {activeAlerts.slice(0, 3).map((alert) => (
              <Link
                key={alert.id}
                href={`/alerts/${alert.id}`}
                className="block bg-white rounded-lg border border-gray-200 p-4 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start">
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
                      <span className="text-lg">
                        {alert.type === 'medical' ? '🏥' :
                         alert.type === 'security' ? '🚨' :
                         alert.type === 'fire' ? '🔥' :
                         alert.type === 'evacuation' ? '🚪' : '⚠️'}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {alert.type === 'medical' ? 'Emergencia Médica' :
                         alert.type === 'security' ? 'Seguridad' :
                         alert.type === 'fire' ? 'Incendio' :
                         alert.type === 'evacuation' ? 'Evacuación' : 'Otra'}
                      </p>
                      <p className="text-sm text-gray-600">{alert.description.substring(0, 60)}...</p>
                      <div className="flex items-center mt-1">
                        <div className={`w-2 h-2 rounded-full mr-1 ${
                          alert.level === 1 ? 'bg-yellow-400' :
                          alert.level === 2 ? 'bg-orange-400' :
                          alert.level === 3 ? 'bg-red-400' : 'bg-red-600'
                        }`}></div>
                        <span className="text-xs text-gray-500">
                          Nivel {alert.level === 1 ? 'Bajo' :
                                 alert.level === 2 ? 'Medio' :
                                 alert.level === 3 ? 'Alto' : 'Crítico'}
                        </span>
                        <span className="text-xs text-gray-400 ml-2">• Hace 5 min</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500 mb-1">Validación</div>
                    <div className="text-sm font-bold text-teal-600">
                      {Math.round((alert.validation_ratio || 0) * 100)}%
                    </div>
                  </div>
                </div>
              </Link>
            ))}

            {activeAlerts.length === 0 && (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-gray-900 font-medium">No hay alertas activas</p>
                <p className="text-gray-500 text-sm">Todo está normal en tu zona</p>
              </div>
            )}
          </div>
        </div>

        {/* View Full Zone */}
        <div className="mt-8">
          <Link
            href="/zone"
            className="block w-full py-3 px-4 bg-gray-100 text-gray-700 rounded-lg font-medium text-center hover:bg-gray-200 transition-colors"
          >
            Ver Mapa de Zona Completo
          </Link>
        </div>
      </div>
    </div>
  );
}
