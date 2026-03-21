'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
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
const statusColors = {
  active: 'bg-red-100 text-red-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  resolved: 'bg-green-100 text-green-800',
  false_alarm: 'bg-gray-100 text-gray-800',
};
const statusLabels = {
  active: 'Activa',
  in_progress: 'En Progreso',
  resolved: 'Resuelta',
  false_alarm: 'Falsa Alarma',
};
const levelColors = { 1: 'bg-yellow-400', 2: 'bg-orange-400', 3: 'bg-red-500' };
const levelLabels = { 1: 'Bajo', 2: 'Medio', 3: 'Alto' };

export default function CoordinatorDashboard() {
  const router = useRouter();
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [filter, setFilter] = useState('all');
  const iconFixRef = useRef(false);

  useEffect(() => {
    const t = localStorage.getItem('coordinator_token');
    const u = localStorage.getItem('coordinator_user');
    if (!t) {
      router.push('/coordinator/login');
      return;
    }
    setToken(t);
    if (u) {
      try { setUser(JSON.parse(u)); } catch { /* ignore */ }
    }
  }, [router]);

  useEffect(() => {
    if (!document.querySelector('link[href*="leaflet"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
    if (!iconFixRef.current) {
      iconFixRef.current = true;
      import('leaflet').then((L) => {
        delete L.default.Icon.Default.prototype._getIconUrl;
        L.default.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
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
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    fetchData();
    const supabase = createClient();
    const channel = supabase
      .channel('coordinator-alerts')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'alerts', filter: `zone_id=eq.${ZONE_ID}` },
        () => fetchData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'nodes', filter: `zone_id=eq.${ZONE_ID}` },
        () => fetchData()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [token]);

  const handleAction = async (alertId, newStatus) => {
    if (!token) return;
    setActionLoading(alertId);
    try {
      const res = await fetch(`/api/alerts/${alertId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.status === 401) {
        localStorage.removeItem('coordinator_token');
        localStorage.removeItem('coordinator_user');
        router.push('/coordinator/login');
        return;
      }

      if (res.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error('Error updating alert:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('coordinator_token');
    localStorage.removeItem('coordinator_user');
    router.push('/');
  };

  const filteredAlerts = filter === 'all' ? alerts : alerts.filter((a) => a.status === filter);

  if (!token) return null;

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Dashboard Coordinador</h1>
              {user && <p className="text-sm text-gray-500">{user.email}</p>}
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{alerts.filter((a) => a.status === 'active').length}</div>
            <div className="text-xs text-gray-600">Activas</div>
          </div>
          <div className="bg-white rounded-lg border p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{alerts.filter((a) => a.status === 'in_progress').length}</div>
            <div className="text-xs text-gray-600">En Progreso</div>
          </div>
          <div className="bg-white rounded-lg border p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{nodes.filter((n) => n.status === 'online').length}</div>
            <div className="text-xs text-gray-600">Nodos Online</div>
          </div>
          <div className="bg-white rounded-lg border p-4 text-center">
            <div className="text-2xl font-bold text-gray-600">{nodes.length}</div>
            <div className="text-xs text-gray-600">Total Nodos</div>
          </div>
        </div>

        <div className="bg-white rounded-lg border overflow-hidden mb-6" style={{ height: 320 }}>
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
                    <strong>{node.name}</strong><br />
                    {node.type} — {node.status === 'online' ? '🟢' : '⚫'} {node.status}
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          )}
        </div>

        <div className="flex space-x-2 mb-4">
          {['all', 'active', 'in_progress'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-teal-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {f === 'all' ? 'Todas' : statusLabels[f]}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {filteredAlerts.length === 0 && (
            <div className="text-center py-8 text-gray-500">No hay alertas para mostrar</div>
          )}
          {filteredAlerts.map((alert) => (
            <div key={alert.id} className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start flex-1">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mr-3">
                    <span className="text-lg">{typeIcons[alert.type] || '⚠️'}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-gray-900">{typeLabels[alert.type] || alert.type}</p>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[alert.status]}`}>
                        {statusLabels[alert.status]}
                      </span>
                    </div>
                    {alert.description && <p className="text-sm text-gray-600">{alert.description}</p>}
                    <div className="flex items-center mt-1 gap-3">
                      <div className="flex items-center">
                        <div className={`w-2 h-2 rounded-full mr-1 ${levelColors[alert.level] || 'bg-gray-400'}`} />
                        <span className="text-xs text-gray-500">Nivel {levelLabels[alert.level]}</span>
                      </div>
                      {alert.node && (
                        <span className="text-xs text-gray-400">📍 {alert.node.name}</span>
                      )}
                      <span className="text-xs text-gray-400">
                        {new Date(alert.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 ml-4">
                  {alert.status === 'active' && (
                    <button
                      onClick={() => handleAction(alert.id, 'in_progress')}
                      disabled={actionLoading === alert.id}
                      className="px-3 py-1.5 bg-yellow-500 text-white text-sm rounded-lg hover:bg-yellow-600 disabled:bg-gray-300 whitespace-nowrap"
                    >
                      {actionLoading === alert.id ? '...' : 'Atender'}
                    </button>
                  )}
                  {alert.status === 'in_progress' && (
                    <button
                      onClick={() => handleAction(alert.id, 'resolved')}
                      disabled={actionLoading === alert.id}
                      className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:bg-gray-300 whitespace-nowrap"
                    >
                      {actionLoading === alert.id ? '...' : 'Resolver'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
