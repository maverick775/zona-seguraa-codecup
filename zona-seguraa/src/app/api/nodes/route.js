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
    .from('nodes')
    .select('*')
    .eq('zone_id', zone_id)
    .order('name');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
