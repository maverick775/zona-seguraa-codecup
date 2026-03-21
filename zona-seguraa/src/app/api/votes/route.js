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

  const { alert_id, nickname, role, comment } = body

  // Validaciones de campos requeridos
  if (!alert_id || !nickname || !role) {
    return NextResponse.json(
      { error: 'Campos requeridos: alert_id, nickname, role' },
      { status: 400 }
    )
  }

  if (!['visitor', 'coordinator'].includes(role)) {
    return NextResponse.json(
      { error: 'Role debe ser visitor o coordinator' },
      { status: 400 }
    )
  }

  // Verificar que la alerta existe y está activa
  const { data: alert, error: alertCheckError } = await supabase
    .from('alerts')
    .select('id, level, status')
    .eq('id', alert_id)
    .single()

  if (alertCheckError || !alert) {
    return NextResponse.json({ error: 'Alerta no encontrada' }, { status: 404 })
  }

  if (alert.status === 'resolved' || alert.status === 'false_alarm') {
    return NextResponse.json(
      { error: 'No se puede votar en una alerta cerrada' },
      { status: 400 }
    )
  }

  // Verificar que el nickname existe en users_temp (solo para visitors)
  if (role === 'visitor') {
    const { data: userTemp, error: userCheckError } = await supabase
      .from('users_temp')
      .select('id, nickname')
      .eq('nickname', nickname)
      .single()

    if (userCheckError || !userTemp) {
      return NextResponse.json(
        { error: 'Usuario no registrado. Debes crear un alias primero.' },
        { status: 403 }
      )
    }
  }

  // Verificar si el usuario ya votó
  const { data: existingVote } = await supabase
    .from('alert_votes')
    .select('id')
    .eq('alert_id', alert_id)
    .eq('nickname', nickname)
    .single()

  if (existingVote) {
    return NextResponse.json(
      { error: 'Ya has votado en esta alerta' },
      { status: 409 }
    )
  }

  // Calcular peso según el rol
  const weight = role === 'coordinator' ? 2 : 1

  // Insertar el voto
  const voteData = {
    alert_id,
    nickname,
    role,
    weight,
    comment: comment || null,
    created_at: new Date().toISOString()
  }

  const { data: insertedVote, error: insertError } = await supabase
    .from('alert_votes')
    .insert(voteData)
    .select()
    .single()

  if (insertError) {
    return NextResponse.json(
      { error: insertError.message },
      { status: 500 }
    )
  }

  // Recalcular peso total
  const { data: allVotes, error: votesError } = await supabase
    .from('alert_votes')
    .select('weight')
    .eq('alert_id', alert_id)

  if (votesError) {
    return NextResponse.json(
      { error: 'Error al calcular peso total' },
      { status: 500 }
    )
  }

  const totalWeight = allVotes.reduce((sum, v) => sum + (v.weight || 0), 0)

  // Aplicar lógica de escalado
  let newLevel = alert.level

  if (totalWeight >= 6 && alert.level < 3) {
    newLevel = 3
  } else if (totalWeight >= 3 && alert.level < 2) {
    newLevel = 2
  }

  // Actualizar nivel si cambió
  if (newLevel !== alert.level) {
    const { error: updateError } = await supabase
      .from('alerts')
      .update({
        level: newLevel,
        updated_at: new Date().toISOString()
      })
      .eq('id', alert_id)

    if (updateError) {
      console.error('Error al actualizar nivel de alerta:', updateError)
    }
  }

  // Obtener el nivel actualizado para confirmar
  const { data: updatedAlert } = await supabase
    .from('alerts')
    .select('level')
    .eq('id', alert_id)
    .single()

  return NextResponse.json({
    vote: insertedVote,
    totalWeight,
    alertLevel: updatedAlert?.level || alert.level,
    escalated: newLevel > alert.level
  }, { status: 201 })
}
