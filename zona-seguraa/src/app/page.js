'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { createRealtimeClient } from '@/lib/supabase';
import { DEMO_SCENARIO } from '@/lib/signalarm/config';
import { LEVEL_LABELS, TYPE_ICONS, TYPE_LABELS, formatDateTime } from '@/lib/signalarm/labels';
import ZoneStatus from '@/components/signalarm/ZoneStatus';

const ZONE_ID = DEMO_SCENARIO.defaultZoneId;
const OPEN = ['active', 'in_progress'];

// Inicio (Figma pantalla 1). Si la consulta falla, se muestra "Sin datos", nunca cero.
export default function HomePage() {
  const [state, setState] = useState({ phase: 'loading', alerts: [], nodes: null, at: null });

  const fetchData = useCallback(async () => {
    try {
      const [aRes, nRes] = await Promise.all([
        fetch(`/api/alerts?zone_id=${ZONE_ID}`, { cache: 'no-store' }),
        fetch(`/api/nodes?zone_id=${ZONE_ID}`, { cache: 'no-store' }),
      ]);
      if (!aRes.ok) throw new Error(`alerts ${aRes.status}`);
      const alerts = await aRes.json();
      if (!Array.isArray(alerts)) throw new Error('respuesta inesperada');
      const nodes = nRes.ok ? await nRes.json().catch(() => null) : null;
      setState({ phase: 'ready', alerts, nodes: Array.isArray(nodes) ? nodes : null, at: new Date().toISOString() });
    } catch {
      setState((s) => ({ ...s, phase: 'unavailable' }));
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => { if (!cancelled) fetchData(); });

    const supabase = createRealtimeClient();
    if (!supabase) return () => { cancelled = true; };
    const channel = supabase
      .channel('home-alerts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts', filter: `zone_id=eq.${ZONE_ID}` }, () => fetchData())
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  const open = state.alerts.filter((a) => OPEN.includes(a.status));
  const zoneState = state.phase === 'ready' ? (open.length ? 'open' : 'none') : state.phase;

  return (
    <div className="min-h-screen bg-[var(--sg-canvas)]">
      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">FanFest — Plaza de la Liberación</h1>
          <p className="text-xs text-gray-700 mt-1">{DEMO_SCENARIO.name}</p>
        </div>

        <ZoneStatus
          zoneName="Plaza de la Liberación"
          state={zoneState}
          openCount={open.length}
          updatedAt={state.at}
          onRetry={() => { setState((s) => ({ ...s, phase: 'loading' })); fetchData(); }}
        />

        <div className="space-y-3">
          <Link href="/alerts/create"
            className="block w-full py-4 px-6 bg-[var(--sg-primary)] text-white rounded-2xl font-semibold text-center text-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900">
            Reportar una situación
          </Link>
          <p className="text-xs text-gray-700 text-center">
            Reportar no envía ayuda automáticamente. Ante una emergencia, <a href="tel:911" className="underline font-semibold">llama al 911</a>.
          </p>
          <Link href="/reports"
            className="block w-full py-3 px-6 bg-white border border-gray-400 text-gray-900 rounded-2xl font-medium text-center focus-visible:outline-2 focus-visible:outline-slate-900">
            Mis reportes
          </Link>
        </div>

        {state.phase === 'ready' && open.length > 0 && (
          <section aria-labelledby="recientes">
            <h2 id="recientes" className="text-lg font-semibold text-gray-900 mb-3">Reportes abiertos en la zona</h2>
            <ul className="space-y-3">
              {open.slice(0, 5).map((a) => (
                <li key={a.id}>
                  <Link href={`/alert/${a.id}`} className="flex items-start gap-3 bg-white rounded-2xl border border-gray-300 p-4 focus-visible:outline-2 focus-visible:outline-slate-900">
                    <span aria-hidden="true" className={`sg-type-${a.type} shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg`}>{TYPE_ICONS[a.type] || '•'}</span>
                    <span className="min-w-0">
                      <span className="block font-semibold text-gray-900">{TYPE_LABELS[a.type] || a.type}</span>
                      {a.description && <span className="block text-sm text-gray-800 mt-0.5 line-clamp-2">{a.description}</span>}
                      <span className="block text-xs text-gray-700 mt-1">
                        {LEVEL_LABELS[a.level] ?? `Nivel ${a.level}`}{a.node ? ` · ${a.node.name}` : ''} · {formatDateTime(a.created_at)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Link href="/zone" className="block py-3 px-4 bg-white border border-gray-300 text-gray-900 rounded-xl font-medium text-center focus-visible:outline-2 focus-visible:outline-slate-900">
            Mapa de la zona
          </Link>
          <Link href="/alerts/validation" className="block py-3 px-4 bg-white border border-gray-300 text-gray-900 rounded-xl font-medium text-center focus-visible:outline-2 focus-visible:outline-slate-900">
            Validar reportes
          </Link>
        </div>
        <p className="text-xs text-gray-700">
          Puntos de referencia registrados: {state.nodes ? state.nodes.length : 'sin datos'}.
          {' '}<Link href="/coordinator/reports" className="underline">Bandeja de coordinación</Link>
        </p>
      </div>
    </div>
  );
}
