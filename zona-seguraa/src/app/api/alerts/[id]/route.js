import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function GET(request, { params }) {
  const { id } = await params;
  const supabase = createServerClient();

  const { data: alert, error } = await supabase
    .from('alerts')
    .select('*, node:nodes(id, name, type, lat, lng)')
    .eq('id', id)
    .single();

  if (error || !alert) {
    return NextResponse.json({ error: 'alert not found' }, { status: 404 });
  }

  const { data: votes } = await supabase
    .from('alert_votes')
    .select('*')
    .eq('alert_id', id)
    .order('created_at', { ascending: false });

  const totalWeight = (votes || []).reduce((sum, v) => sum + v.weight, 0);

  return NextResponse.json({
    ...alert,
    votes: votes || [],
    votes_total_weight: totalWeight
  });
}

export async function PATCH(request, { params }) {
  const { id } = await params;
  const body = await request.json();
  const { status, level } = body;

  if (!status && level === undefined) {
    return NextResponse.json({ error: 'status or level is required' }, { status: 400 });
  }

  if (status) {
    const validStatuses = ['active', 'in_progress', 'resolved', 'false_alarm'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'invalid status' }, { status: 400 });
    }
  }

  if (level !== undefined) {
    const validLevels = [1, 2, 3];
    if (!validLevels.includes(level)) {
      return NextResponse.json({ error: 'invalid level' }, { status: 400 });
    }
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const token = authHeader.replace('Bearer ', '');
  const supabase = createServerClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { data: existing, error: fetchError } = await supabase
    .from('alerts')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: 'alert not found' }, { status: 404 });
  }

  const updateData = {
    updated_at: new Date().toISOString(),
  };

  if (status) {
    updateData.status = status;
    if (status === 'in_progress') {
      updateData.attended_by = user.id;
    }
    if (status === 'resolved') {
      updateData.resolved_at = new Date().toISOString();
      updateData.attended_by = user.id;
    }
  }

  if (level !== undefined) {
    updateData.level = level;
  }

  const { data, error } = await supabase
    .from('alerts')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
