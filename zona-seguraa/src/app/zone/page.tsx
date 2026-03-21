'use client';

import { useState } from 'react';
import Link from 'next/link';
import { mockAlerts, mockNodes } from '@/lib/mockData';

export default function ZonePage() {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [showAlerts, setShowAlerts] = useState(true);

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'medical': return '🏥';
      case 'security': return '🚨';
      case 'fire': return '🔥';
      case 'evacuation': return '🚪';
      default: return '⚠️';
    }
  };

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'medical_point': return '🏥';
      case 'emergency_exit': return '🚪';
      case 'meeting_point': return '📍';
      case 'avp_physical': return '📹';
      default: return '📍';
    }
  };

  const getNodeColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'offline': return 'bg-gray-400';
      case 'alert': return 'bg-red-500';
      case 'in_progress': return 'bg-yellow-500';
      default: return 'bg-gray-400';
    }
  };

  const getAlertCount = (nodeId: string) => {
    return mockAlerts.filter(alert => 
      alert.description.toLowerCase().includes(nodeId.toLowerCase()) ||
      alert.status === 'active'
    ).length;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-lg font-semibold text-gray-900">Zona Centro</h1>
            <button className="text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Status Overview */}
      <div className="max-w-md mx-auto px-4 py-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">Estado General</h2>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              mockAlerts.filter(a => a.status === 'active').length > 0 
                ? 'bg-red-100 text-red-800' 
                : 'bg-green-100 text-green-800'
            }`}>
              {mockAlerts.filter(a => a.status === 'active').length > 0 ? 'Alertas Activas' : 'Normal'}
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-red-600">{mockAlerts.filter(a => a.status === 'active').length}</div>
              <div className="text-xs text-gray-600">Activas</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-600">{mockAlerts.filter(a => a.status === 'validated').length}</div>
              <div className="text-xs text-gray-600">Validadas</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{mockNodes.filter(n => n.status === 'online').length}</div>
              <div className="text-xs text-gray-600">Nodos Online</div>
            </div>
          </div>
        </div>

        {/* Toggle Buttons */}
        <div className="flex space-x-2 mb-4">
          <button
            onClick={() => setShowAlerts(!showAlerts)}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
              showAlerts 
                ? 'bg-teal-600 text-white' 
                : 'bg-white border border-gray-300 text-gray-700'
            }`}
          >
            Alertas
          </button>
          <button
            onClick={() => setShowAlerts(!showAlerts)}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
              !showAlerts 
                ? 'bg-teal-600 text-white' 
                : 'bg-white border border-gray-300 text-gray-700'
            }`}
          >
            Nodos
          </button>
        </div>

        {/* Map Container */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-4">
          <div className="relative bg-gray-100 h-96">
            {/* Simple Map Representation */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-green-50">
              {/* Grid lines for map effect */}
              <div className="absolute inset-0 opacity-20">
                {[...Array(10)].map((_, i) => (
                  <div key={`h-${i}`} className="absolute w-full border-t border-gray-300" style={{ top: `${i * 10}%` }}></div>
                ))}
                {[...Array(10)].map((_, i) => (
                  <div key={`v-${i}`} className="absolute h-full border-l border-gray-300" style={{ left: `${i * 10}%` }}></div>
                ))}
              </div>

              {/* Nodes */}
              {mockNodes.map((node) => {
                const alertCount = getAlertCount(node.name);
                return (
                  <div
                    key={node.id}
                    className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer"
                    style={{ 
                      left: `${(node.pos_x / 400) * 100}%`, 
                      top: `${(node.pos_y / 300) * 100}%` 
                    }}
                    onClick={() => setSelectedNode(node.id)}
                  >
                    <div className="relative">
                      <div className={`w-8 h-8 ${getNodeColor(node.status)} rounded-full flex items-center justify-center text-white text-sm shadow-lg`}>
                        {getNodeIcon(node.type)}
                      </div>
                      {alertCount > 0 && (
                        <div className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                          {alertCount}
                        </div>
                      )}
                      <div className="absolute top-10 left-1/2 transform -translate-x-1/2 bg-white px-2 py-1 rounded shadow-md whitespace-nowrap text-xs">
                        {node.name}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Alert Indicators */}
              {showAlerts && mockAlerts.filter(a => a.status === 'active').map((alert, index) => (
                <div
                  key={alert.id}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 animate-pulse"
                  style={{ 
                    left: `${30 + index * 20}%`, 
                    top: `${20 + index * 15}%` 
                  }}
                >
                  <div className="w-12 h-12 bg-red-500 bg-opacity-30 rounded-full flex items-center justify-center text-2xl">
                    {getAlertIcon(alert.type)}
                  </div>
                </div>
              ))}
            </div>

            {/* Map Legend */}
            <div className="absolute bottom-4 left-4 bg-white bg-opacity-90 rounded-lg p-3 shadow-md">
              <div className="text-xs font-medium text-gray-700 mb-2">Leyenda</div>
              <div className="space-y-1">
                <div className="flex items-center text-xs">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                  <span>Online</span>
                </div>
                <div className="flex items-center text-xs">
                  <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                  <span>Alerta</span>
                </div>
                <div className="flex items-center text-xs">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                  <span>En Progreso</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Active Alerts List */}
        {showAlerts && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900">Alertas Activas</h3>
            {mockAlerts.filter(a => a.status === 'active').map((alert) => (
              <Link
                key={alert.id}
                href={`/alerts/${alert.id}`}
                className="block bg-white rounded-lg border border-gray-200 p-4 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start">
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
                      <span className="text-lg">{getAlertIcon(alert.type)}</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {alert.type === 'medical' ? 'Emergencia Médica' :
                         alert.type === 'security' ? 'Seguridad' :
                         alert.type === 'fire' ? 'Incendio' :
                         alert.type === 'evacuation' ? 'Evacuación' : 'Otra'}
                      </p>
                      <p className="text-sm text-gray-600">{alert.description}</p>
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
          </div>
        )}

        {/* Create Alert Button */}
        <div className="fixed bottom-6 right-6">
          <Link
            href="/alerts/create"
            className="w-14 h-14 bg-teal-600 rounded-full flex items-center justify-center shadow-lg hover:bg-teal-700 transition-colors"
          >
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
