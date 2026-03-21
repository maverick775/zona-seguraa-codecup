import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }

  const { alert_id, nickname, role, comment } = body;

  if (!alert_id) {
    return NextResponse.json({ error: 'alert_id is required' }, { status: 400 });
  }
  if (!role) {
    return NextResponse.json({ error: 'role is required' }, { status: 400 });
  }

  const validRoles = ['visitor', 'coordinator'];
  if (!validRoles.includes(role)) {
    return NextResponse.json({ error: 'invalid role' }, { status: 400 });
  }

  const weight = role === 'coordinator' ? 2 : 1;
  const supabase = createServerClient();

  const { data: alert, error: alertError } = await supabase
    .from('alerts')
    .select('*')
    .eq('id', alert_id)
    .single();

  if (alertError || !alert) {
    return NextResponse.json({ error: 'alert not found' }, { status: 404 });
  }

  const insertData = { alert_id, role, weight };
  if (nickname) insertData.nickname = nickname;
  if (comment) insertData.comment = comment;

  const { data: vote, error: voteError } = await supabase
    .from('alert_votes')
    .insert(insertData)
    .select()
    .single();

  if (voteError) {
    return NextResponse.json({ error: voteError.message }, { status: 500 });
  }

  const { data: voteAgg, error: aggError } = await supabase
    .from('alert_votes')
    .select('weight')
    .eq('alert_id', alert_id);

  if (aggError) {
    return NextResponse.json({ error: aggError.message }, { status: 500 });
  }

  const total = (voteAgg || []).reduce((sum, v) => sum + v.weight, 0);
  let updatedAlert = alert;

  if (total >= 7 && alert.level < 3) {
    const { data, error } = await supabase
      .from('alerts')
      .update({ level: 3, updated_at: new Date().toISOString() })
      .eq('id', alert_id)
      .select()
      .single();
    if (!error && data) updatedAlert = data;
  } else if (total >= 3 && alert.level === 1) {
    const { data, error } = await supabase
      .from('alerts')
      .update({ level: 2, updated_at: new Date().toISOString() })
      .eq('id', alert_id)
      .select()
      .single();
    if (!error && data) updatedAlert = data;
  }

  return NextResponse.json({ vote, alert: updatedAlert });
}
