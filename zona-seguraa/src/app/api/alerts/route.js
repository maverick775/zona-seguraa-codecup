import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const zone_id = searchParams.get('zone_id');

  if (!zone_id) {
    return NextResponse.json({ error: 'zone_id is required' }, { status: 400 });
  }

  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('alerts')
    .select('*, node:nodes(name, type)')
    .eq('zone_id', zone_id)
    .neq('status', 'resolved')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request) {
  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 })
  }
  
  const { zone_id, node_id, type, description, created_by_nick } = body

  if (!zone_id) {
    return NextResponse.json({ error: 'zone_id is required' }, { status: 400 });
  }
  if (!node_id) {
    return NextResponse.json({ error: 'node_id is required' }, { status: 400 });
  }
  if (!type) {
    return NextResponse.json({ error: 'type is required' }, { status: 400 });
  }

  const validTypes = ['medical', 'security', 'fire', 'evacuation'];
  if (!validTypes.includes(type)) {
    return NextResponse.json({ error: 'invalid type' }, { status: 400 });
  }

  const supabase = createServerClient();

  const insertData = {
    zone_id,
    node_id,
    type,
    status: 'active',
    level: 1,
  };
  if (description) {
    insertData.description = description;
  }
  if (created_by_nick) {
    insertData.created_by_nick = created_by_nick;
  }

  const { data, error } = await supabase
    .from('alerts')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
