'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { createClient } from '@/lib/supabase';

const ZONE_ID = 'a1000000-0000-0000-0000-000000000001';
const CENTER = [20.6736, -103.3478];
const ZOOM = 16;

const MapContainer = dynamic(() => import('react-leaflet').then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then((m) => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then((m) => m.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then((m) => m.Popup), { ssr: false });

const typeLabels = {
  medical: 'Emergencia Médica',
  security: 'Seguridad',
  fire: 'Incendio',
  evacuation: 'Evacuación',
};
const typeIcons = { medical: '🏥', security: '🚨', fire: '🔥', evacuation: '🚪' };
const levelColors = { 1: 'bg-yellow-400', 2: 'bg-orange-400', 3: 'bg-red-500' };
const levelLabels = { 1: 'Bajo', 2: 'Medio', 3: 'Alto' };
const nodeTypeLabels = {
  avp_physical: 'AVP Físico',
  avp_simulated: 'AVP Simulado',
  medical_point: 'Punto Médico',
  mobile_unit: 'Unidad Móvil',
};

export default function ZonePage() {
  const [alerts, setAlerts] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const iconFixRef = useRef(false);

  useEffect(() => {
    import('leaflet/dist/leaflet.css');
    if (!iconFixRef.current) {
      iconFixRef.current = true;
      import('leaflet').then((L) => {
        delete L.default.Icon.Default.prototype._getIconUrl;
        L.default.Icon.Default.mergeOptions({
          iconRetinaUrl: '/leaflet/marker-icon-2x.png',
          iconUrl: '/leaflet/marker-icon.png',
          shadowUrl: '/leaflet/marker-shadow.png',
        });
        setMapReady(true);
      });
    }
  }, []);

  const fetchData = async () => {
    try {
      const [aRes, nRes] = await Promise.all([
        fetch(`/api/alerts?zone_id=${ZONE_ID}`),
        fetch(`/api/nodes?zone_id=${ZONE_ID}`),
      ]);
      if (aRes.ok) setAlerts(await aRes.json());
      if (nRes.ok) setNodes(await nRes.json());
    } catch (err) {
      console.error('Error fetching zone data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const supabase = createClient();
    const channel = supabase
      .channel('zone-alerts')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'alerts', filter: `zone_id=eq.${ZONE_ID}` },
        () => fetchData()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const activeAlerts = alerts.filter((a) => a.status !== 'resolved');

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
            <h1 className="text-lg font-semibold text-gray-900">Mapa de Zona</h1>
            <div className="w-6" />
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">Plaza de la Liberación</h2>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${activeAlerts.length > 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
              {activeAlerts.length > 0 ? `${activeAlerts.length} Activas` : 'Normal'}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-red-600">{alerts.filter((a) => a.status === 'active').length}</div>
              <div className="text-xs text-gray-600">Activas</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-600">{alerts.filter((a) => a.status === 'in_progress').length}</div>
              <div className="text-xs text-gray-600">En Progreso</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{nodes.filter((n) => n.status === 'online').length}</div>
              <div className="text-xs text-gray-600">Nodos Online</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-4" style={{ height: 384 }}>
          {loading || !mapReady ? (
            <div className="flex items-center justify-center h-full bg-gray-100">
              <span className="text-gray-500">Cargando mapa...</span>
            </div>
          ) : (
            <MapContainer center={CENTER} zoom={ZOOM} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true}>
              <TileLayer
                attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {nodes.filter((n) => n.lat && n.lng).map((node) => (
                <Marker key={node.id} position={[node.lat, node.lng]}>
                  <Popup>
                    <strong>{node.name}</strong>
                    <br />
                    {nodeTypeLabels[node.type] || node.type}
                    <br />
                    Estado: {node.status === 'online' ? '🟢 Online' : node.status === 'alert' ? '🔴 Alerta' : '⚫ Offline'}
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          )}
        </div>

        <div className="space-y-3 mb-20">
          <h3 className="text-lg font-semibold text-gray-900">Alertas Activas</h3>
          {activeAlerts.map((alert) => (
            <div key={alert.id} className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-start">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
                  <span className="text-lg">{typeIcons[alert.type] || '⚠️'}</span>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{typeLabels[alert.type] || alert.type}</p>
                  {alert.description && <p className="text-sm text-gray-600">{alert.description}</p>}
                  <div className="flex items-center mt-1">
                    <div className={`w-2 h-2 rounded-full mr-1 ${levelColors[alert.level] || 'bg-gray-400'}`} />
                    <span className="text-xs text-gray-500">Nivel {levelLabels[alert.level] || alert.level}</span>
                    <span className="text-xs text-gray-600 ml-2">• {alert.status === 'in_progress' ? 'En Progreso' : 'Activa'}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {activeAlerts.length === 0 && (
            <div className="text-center py-6 text-gray-500">No hay alertas activas</div>
          )}
        </div>

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
