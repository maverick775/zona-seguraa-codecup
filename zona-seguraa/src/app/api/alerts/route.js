import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { IS_DEMO_MODE } from '@/lib/signalarm/config';
import { getRepository } from '@/lib/signalarm/repository';

// Columnas públicas: nunca exponer created_by, client_report_id ni hashes.
const PUBLIC_COLUMNS =
  'id, zone_id, node_id, type, level, status, description, language, created_by_nick, created_at, updated_at, resolved_at, node:nodes(name, type, lat, lng)';
const SORTABLE = ['created_at', 'updated_at', 'level', 'status'];
const PUBLIC_KEYS = ['id', 'zone_id', 'node_id', 'type', 'level', 'status', 'description', 'language', 'created_by_nick', 'created_at', 'updated_at', 'resolved_at', 'node'];
const toPublic = (a) => Object.fromEntries(PUBLIC_KEYS.map((k) => [k, a[k] ?? null]));

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const zone_id = searchParams.get('zone_id');
  const status = searchParams.get('status');
  const sort = searchParams.get('sort');

  if (IS_DEMO_MODE) {
    // Modo demo explícito: datos en memoria, nunca como respaldo de un fallo.
    let rows = await getRepository().listPublicAlerts(zone_id);
    if (status) {
      const statuses = status.split(',').map((s) => s.trim());
      rows = rows.filter((a) => statuses.includes(a.status));
    }
    return NextResponse.json(rows.map(toPublic));
  }

  const supabase = createServerClient();

  let query = supabase
    .from('alerts')
    .select(PUBLIC_COLUMNS);

  // Filter by zone_id if provided
  if (zone_id) {
    query = query.eq('zone_id', zone_id);
  }

  // Filter by status if provided (can be comma-separated)
  if (status) {
    const statuses = status.split(',').map(s => s.trim());
    if (statuses.length === 1) {
      query = query.eq('status', statuses[0]);
    } else {
      query = query.in('status', statuses);
    }
  }

  // Apply sorting
  if (sort) {
    const [field, order] = sort.split(':');
    if (!SORTABLE.includes(field)) {
      return NextResponse.json({ error: 'invalid sort field' }, { status: 400 });
    }
    query = query.order(field, { ascending: order === 'asc' });
  } else {
    query = query.order('created_at', { ascending: false });
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// POST legado deshabilitado explícitamente (S1).
// Creaba alertas nivel 1 sin sesión ni identidad y exigía node_id. Su único
// consumidor (/alerts/create) ya usa POST /api/reports (N0 con sesión).
export async function POST() {
  return NextResponse.json(
    {
      data: null,
      error: {
        code: 'gone',
        message: 'Este endpoint se retiró. Usa POST /api/reports (requiere sesión).',
      },
    },
    { status: 410 }
  );
}
