// 'next/server.js' (con extensión) para que node:test lo resuelva como ESM; Next lo resuelve igual.
import { NextResponse } from 'next/server.js'
import { createServerClient } from '@supabase/ssr'
// Imports relativos (no alias) para poder probar este archivo con node:test.
import { IS_DEMO_MODE } from './src/lib/signalarm/config.js'
import { DEMO_COOKIE, verifyDemoSession } from './src/lib/signalarm/demo-session.js'
import { demoBlockReason } from './src/lib/signalarm/demo-guard.js'

// 1) Modo demo: solo se sirve en local (ver demo-guard.js). Fuera de local → 503.
// 2) Páginas protegidas: exigen sesión y redirigen a /login?next=...
// La autorización real (rol y zona) la hace cada API route en el servidor.

const PROTECTED = [/^\/coordinator(\/|$)/, /^\/reports(\/|$)/, /^\/alerts\/create$/]

function redirectToLogin(request) {
  const url = new URL('/login', request.url)
  url.searchParams.set('next', request.nextUrl.pathname + request.nextUrl.search)
  return NextResponse.redirect(url)
}

export async function middleware(request) {
  const { pathname } = request.nextUrl

  if (IS_DEMO_MODE) {
    const reason = demoBlockReason({ host: request.headers.get('host') })
    if (reason) {
      return NextResponse.json(
        { data: null, error: { code: reason, message: 'El modo demostración solo puede usarse en local.' } },
        { status: 503 }
      )
    }
  }

  if (!PROTECTED.some((re) => re.test(pathname)) || pathname === '/coordinator/login') {
    return NextResponse.next()
  }

  if (IS_DEMO_MODE) {
    const persona = await verifyDemoSession(request.cookies.get(DEMO_COOKIE)?.value)
    return persona ? NextResponse.next() : redirectToLogin(request)
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) return redirectToLogin(request)

  // Patrón de @supabase/ssr: lee la sesión de las cookies y permite refrescarla.
  let response = NextResponse.next({ request })
  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })

  // getUser() valida el token contra Supabase Auth (no confía en la cookie).
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return redirectToLogin(request)
  return response
}

export const config = {
  // Todo salvo estáticos: necesario para bloquear el modo demo fuera de local.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|leaflet/).*)'],
}
