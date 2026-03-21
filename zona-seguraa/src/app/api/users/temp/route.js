import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function POST(request) {
  const supabase = createServerClient()

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 })
  }

  const { nickname, language, zone_id } = body

  // Validaciones de campos requeridos
  if (!nickname) {
    return NextResponse.json(
      { error: 'El nickname es requerido' },
      { status: 400 }
    )
  }

  if (nickname.length < 2 || nickname.length > 50) {
    return NextResponse.json(
      { error: 'El nickname debe tener entre 2 y 50 caracteres' },
      { status: 400 }
    )
  }

  // Verificar que el nickname no esté ya registrado
  const { data: existing } = await supabase
    .from('users_temp')
    .select('id')
    .eq('nickname', nickname.trim())
    .single()

  if (existing) {
    return NextResponse.json(
      { error: 'Este nickname ya está en uso. Por favor elige otro.' },
      { status: 409 }
    )
  }

  // Calcular fecha de expiración (1 hora desde ahora)
  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + 1)

  // Insertar el usuario temporal
  const userData = {
    nickname: nickname.trim(),
    language: language || 'es',
    zone_id: zone_id || null,
    created_at: new Date().toISOString(),
    expires_at: expiresAt.toISOString()
  }

  const { data: user, error: insertError } = await supabase
    .from('users_temp')
    .insert(userData)
    .select()
    .single()

  if (insertError) {
    return NextResponse.json(
      { error: insertError.message },
      { status: 500 }
    )
  }

  return NextResponse.json(user, { status: 201 })
}
