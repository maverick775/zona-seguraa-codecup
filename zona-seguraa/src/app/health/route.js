import { createServerClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = createServerClient()
    const { data: zones, error } = await supabase
      .from('zones')
      .select('slug, name')
      .limit(5)

    if (error) throw error

    return NextResponse.json({
      status: 'ok',
      supabase: 'connected',
      zones
    })
  } catch (err) {
    return NextResponse.json(
      { status: 'error', message: err.message },
      { status: 500 }
    )
  }
}

