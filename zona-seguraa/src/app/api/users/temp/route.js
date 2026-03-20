import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function POST(request) {
  const body = await request.json();
  const { nickname, zone_id, language } = body;

  if (!nickname) {
    return NextResponse.json({ error: 'nickname is required' }, { status: 400 });
  }
  if (!zone_id) {
    return NextResponse.json({ error: 'zone_id is required' }, { status: 400 });
  }

  const sanitized = nickname.trim().replace(/[^a-zA-Z0-9_]/g, '').slice(0, 30);

  if (!sanitized) {
    return NextResponse.json({ error: 'invalid nickname' }, { status: 400 });
  }

  const supabase = createServerClient();

  const { data: existing } = await supabase
    .from('temp_users')
    .select('id')
    .eq('nickname', sanitized)
    .gt('expires_at', new Date().toISOString())
    .limit(1);

  if (existing && existing.length > 0) {
    return NextResponse.json({ error: 'nickname already taken' }, { status: 409 });
  }

  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('temp_users')
    .insert({
      nickname: sanitized,
      zone_id,
      language: language || 'es',
      expires_at: expiresAt,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
