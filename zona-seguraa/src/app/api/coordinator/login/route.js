import { NextResponse } from 'next/server';
import { createBrowserClient } from '@supabase/ssr';

export async function POST(request) {
  const body = await request.json();
  const { email, password } = body;

  if (!email) {
    return NextResponse.json({ error: 'email is required' }, { status: 400 });
  }
  if (!password) {
    return NextResponse.json({ error: 'password is required' }, { status: 400 });
  }

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const { session, user } = data;

  return NextResponse.json({
    session: {
      access_token: session.access_token,
      expires_at: session.expires_at,
    },
    user: {
      id: user.id,
      email: user.email,
    },
  });
}
