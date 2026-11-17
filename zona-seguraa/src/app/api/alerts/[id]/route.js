import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { IS_DEMO_MODE } from '@/lib/signalarm/config';
import { getRepository } from '@/lib/signalarm/repository';
import { requireCoordinator } from '@/lib/signalarm/actor';
import { canCoordinate, DomainError } from '@/lib/signalarm/domain';

// Vista pública de una alerta (usada por /alert/[id] y validación comunitaria).
// Nunca expone created_by, client_report_id ni hashes.
const PUBLIC_COLUMNS =
  'id, zone_id, node_id, type, level, status, description, language, created_by_nick, created_at, updated_at, resolved_at, node:nodes(id, name, type, lat, lng)';
const PUBLIC_KEYS = ['id', 'zone_id', 'node_id', 'type', 'level', 'status', 'description', 'language', 'created_by_nick', 'created_at', 'updated_at', 'resolved_at', 'node'];
const toPublic = (a) => Object.fromEntries(PUBLIC_KEYS.map((k) => [k, a[k] ?? null]));
// Votos públicos: sin voter_user_id.
const VOTE_COLUMNS = 'id, alert_id, nickname, role, weight, comment, created_at';
const toPublicVote = ({ id, alert_id, nickname, role, weight, comment, created_at }) => ({ id, alert_id, nickname, role, weight, comment, created_at });

export async function GET(request, { params }) {
  const { id } = await params;

  if (IS_DEMO_MODE) {
    const repo = getRepository();
    const alert = await repo.getAlert(id);
    if (!alert) return NextResponse.json({ error: 'alert not found' }, { status: 404 });
    const votes = (await repo.listVotes(id)).map(toPublicVote);
    return NextResponse.json({ ...toPublic(alert), votes, votes_total_weight: votes.reduce((s, v) => s + v.weight, 0) });
  }

  const supabase = createServerClient();

  const { data: alert, error } = await supabase
    .from('alerts')
    .select(PUBLIC_COLUMNS)
    .eq('id', id)
    .single();

  if (error || !alert) {
    return NextResponse.json({ error: 'alert not found' }, { status: 404 });
  }

  const { data: votes } = await supabase
    .from('alert_votes')
    .select(VOTE_COLUMNS)
    .eq('alert_id', id)
    .order('created_at', { ascending: false });

  const totalWeight = (votes || []).reduce((sum, v) => sum + v.weight, 0);

  return NextResponse.json({
    ...alert,
    votes: votes || [],
    votes_total_weight: totalWeight
  });
}

// PATCH legado. Antes cambiaba estado sin autenticación (hallazgo H2).
// Ahora: solo coordinación de la zona del recurso; los cambios de estado deben
// usar POST /api/coordinator/alerts/:id/transitions para que quede historial.
// Solo se conserva el ajuste manual de nivel 1–3 por un coordinador.
export async function PATCH(request, { params }) {
  let actor;
  try {
    actor = await requireCoordinator(request);
  } catch (err) {
    if (err instanceof DomainError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }

  const { id } = await params;
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }
  const { status, level } = body || {};

  if (status !== undefined) {
    return NextResponse.json(
      { error: 'use-transitions', message: 'Usa POST /api/coordinator/alerts/:id/transitions para cambiar el estado' },
      { status: 409 }
    );
  }
  if (![1, 2, 3].includes(level)) {
    return NextResponse.json({ error: 'invalid level' }, { status: 400 });
  }
  if (IS_DEMO_MODE) {
    return NextResponse.json({ error: 'no disponible en modo demo' }, { status: 404 });
  }

  const supabase = createServerClient();
  const { data: existing, error: fetchError } = await supabase
    .from('alerts')
    .select('id, zone_id')
    .eq('id', id)
    .maybeSingle();

  // Otra zona o inexistente → 404 (no se revela la existencia).
  if (fetchError || !existing || !canCoordinate(actor, existing.zone_id)) {
    return NextResponse.json({ error: 'alert not found' }, { status: 404 });
  }

  const { data, error } = await supabase
    .from('alerts')
    .update({ level, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(PUBLIC_COLUMNS)
    .single();

  if (error) {
    console.error('[alerts.PATCH]', { code: error.code });
    return NextResponse.json({ error: 'No se pudo actualizar' }, { status: 503 });
  }

  return NextResponse.json(data);
}
