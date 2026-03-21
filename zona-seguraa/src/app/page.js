'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';

const ZONE_ID = 'a1000000-0000-0000-0000-000000000001';

const typeLabels = {
  medical: 'Emergencia Médica',
  security: 'Seguridad',
  fire: 'Incendio',
  evacuation: 'Evacuación',
};
const typeIcons = {
  medical: '🏥',
  security: '🚨',
  fire: '🔥',
  evacuation: '🚪',
};
const levelColors = {
  1: 'bg-yellow-400',
  2: 'bg-orange-400',
  3: 'bg-red-500',
};
const levelLabels = { 1: 'Bajo', 2: 'Medio', 3: 'Alto' };

export default function HomePage() {
  const [alerts, setAlerts] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [aRes, nRes] = await Promise.all([
        fetch(`/api/alerts?zone_id=${ZONE_ID}`),
        fetch(`/api/nodes?zone_id=${ZONE_ID}`),
      ]);
      if (aRes.ok) setAlerts(await aRes.json());
      if (nRes.ok) setNodes(await nRes.json());
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const supabase = createClient();
    const channel = supabase
      .channel('home-alerts')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'alerts', filter: `zone_id=eq.${ZONE_ID}` },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const activeAlerts = alerts.filter((a) => a.status === 'active' || a.status === 'in_progress');
  const onlineNodes = nodes.filter((n) => n.status === 'online');

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-md mx-auto px-4 py-4">
          <h1 className="text-xl font-bold text-gray-900">Zona SeguRAA</h1>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">FanFest — Plaza de la Liberación</h2>
          <p className="text-gray-600">Mantente informado y ayuda a mantener tu comunidad segura</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                <span className="text-red-600 text-sm font-bold">!</span>
              </div>
              <span className="text-2xl font-bold text-red-600">{activeAlerts.length}</span>
            </div>
            <p className="text-sm font-medium text-gray-900">Alertas Activas</p>
            <p className="text-xs text-gray-500">Necesitan atención</p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 text-sm font-bold">✓</span>
              </div>
              <span className="text-2xl font-bold text-green-600">{onlineNodes.length}</span>
            </div>
            <p className="text-sm font-medium text-gray-900">Nodos Activos</p>
            <p className="text-xs text-gray-500">Sistema operativo</p>
          </div>
        </div>

        <div className="space-y-3 mb-8">
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

        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Actividad Reciente</h3>
          <div className="space-y-3">
            {activeAlerts.slice(0, 5).map((alert) => (
              <div
                key={alert.id}
                className="bg-white rounded-lg border border-gray-200 p-4"
              >
                <div className="flex items-start">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
                    <span className="text-lg">{typeIcons[alert.type] || '⚠️'}</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{typeLabels[alert.type] || alert.type}</p>
                    {alert.description && (
                      <p className="text-sm text-gray-600 mt-1">{alert.description.substring(0, 80)}</p>
                    )}
                    <div className="flex items-center mt-2">
                      <div className={`w-2 h-2 rounded-full mr-1 ${levelColors[alert.level] || 'bg-gray-400'}`} />
                      <span className="text-xs text-gray-500">
                        Nivel {levelLabels[alert.level] || alert.level}
                      </span>
                      {alert.node && (
                        <span className="text-xs text-gray-400 ml-2">• {alert.node.name}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {activeAlerts.length === 0 && (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-green-600 font-bold">✓</span>
                </div>
                <p className="text-gray-900 font-medium">No hay alertas activas</p>
                <p className="text-gray-500 text-sm">Todo está normal en tu zona</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <Link
            href="/zone"
            className="block w-full py-3 px-4 bg-gray-100 text-gray-700 rounded-lg font-medium text-center hover:bg-gray-200 transition-colors"
          >
            Ver Mapa de Zona
          </Link>
          <Link
            href="/coordinator"
            className="block w-full py-3 px-4 bg-gray-100 text-gray-700 rounded-lg font-medium text-center hover:bg-gray-200 transition-colors"
          >
            Acceso Coordinador
          </Link>
        </div>
      </div>
    </div>
  );
}
