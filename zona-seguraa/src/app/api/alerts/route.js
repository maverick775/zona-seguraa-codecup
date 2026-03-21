import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const zone_id = searchParams.get('zone_id');
  const status = searchParams.get('status');
  const sort = searchParams.get('sort');

  const supabase = createServerClient();

  let query = supabase
    .from('alerts')
    .select('*, node:nodes(name, type, lat, lng)');

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
