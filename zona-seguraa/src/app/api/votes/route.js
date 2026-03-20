import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function POST(request) {
  const body = await request.json();
  const { alert_id, user_type, user_id } = body;

  if (!alert_id) {
    return NextResponse.json({ error: 'alert_id is required' }, { status: 400 });
  }
  if (!user_type) {
    return NextResponse.json({ error: 'user_type is required' }, { status: 400 });
  }

  const validUserTypes = ['visitor', 'coordinator'];
  if (!validUserTypes.includes(user_type)) {
    return NextResponse.json({ error: 'invalid user_type' }, { status: 400 });
  }

  const weight = user_type === 'coordinator' ? 2 : 1;

  const supabase = createServerClient();

  const { data: alert, error: alertError } = await supabase
    .from('alerts')
    .select('*')
    .eq('id', alert_id)
    .single();

  if (alertError || !alert) {
    return NextResponse.json({ error: 'alert not found' }, { status: 404 });
  }

  const insertData = {
    alert_id,
    user_type,
    weight,
  };
  if (user_id) {
    insertData.user_id = user_id;
  }

  const { data: vote, error: voteError } = await supabase
    .from('votes')
    .insert(insertData)
    .select()
    .single();

  if (voteError) {
    return NextResponse.json({ error: voteError.message }, { status: 500 });
  }

  const { data: voteAgg, error: aggError } = await supabase
    .from('votes')
    .select('weight')
    .eq('alert_id', alert_id);

  if (aggError) {
    return NextResponse.json({ error: aggError.message }, { status: 500 });
  }

  const total = voteAgg.reduce((sum, v) => sum + v.weight, 0);

  let updatedAlert = alert;

  if (total >= 7 && alert.level < 3) {
    const { data, error } = await supabase
      .from('alerts')
      .update({ level: 3, updated_at: new Date().toISOString() })
      .eq('id', alert_id)
      .select()
      .single();
    if (!error) updatedAlert = data;
  } else if (total >= 3 && alert.level === 1) {
    const { data, error } = await supabase
      .from('alerts')
      .update({ level: 2, updated_at: new Date().toISOString() })
      .eq('id', alert_id)
      .select()
      .single();
    if (!error) updatedAlert = data;
  }

  return NextResponse.json({ vote, alert: updatedAlert });
}
