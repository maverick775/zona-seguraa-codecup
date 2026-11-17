'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { IS_DEMO_MODE } from '@/lib/signalarm/config'
import { useMe } from '@/hooks/useMe'
import { createClient } from '@/lib/supabase'

export async function signOut() {
  if (IS_DEMO_MODE) {
    await fetch('/api/demo/session', { method: 'DELETE' })
  } else {
    await createClient().auth.signOut()
  }
}

export default function SiteHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const { status, me, reload } = useMe()

  const links = [
    { href: '/', label: 'Inicio' },
    { href: '/alerts/create', label: 'Reportar' },
    { href: '/reports', label: 'Mis reportes' },
  ]
  if (me?.role === 'coordinator') links.push({ href: '/coordinator/reports', label: 'Coordinación' })

  const handleSignOut = async () => {
    await signOut()
    await reload()
    router.push('/')
    router.refresh()
  }

  const isActive = (href) => (href === '/' ? pathname === '/' : pathname.startsWith(href))

  return (
    <header className="bg-slate-900 text-white">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:bg-white focus:text-slate-900 focus:px-3 focus:py-2 focus:rounded">
        Saltar al contenido
      </a>
      <div className="max-w-3xl mx-auto px-4 pt-2 pb-1">
        <div className="flex items-center gap-3">
          <Link href="/" className="font-bold text-lg tracking-tight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white rounded">
            Signalarm
          </Link>
          <div className="ml-auto text-sm flex items-center gap-2">
            {status === 'signed-in' && (
              <>
                <span className="text-slate-200 hidden sm:inline">{me.display_name}</span>
                <button onClick={handleSignOut} className="px-3 py-2 min-h-[44px] rounded-md border border-white/30 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white">
                  Salir
                </button>
              </>
            )}
            {status === 'signed-out' && (
              <Link href={`/login?next=${encodeURIComponent(pathname)}`} className="px-3 py-2 min-h-[44px] inline-flex items-center rounded-md bg-white text-slate-900 font-medium focus-visible:outline-2 focus-visible:outline-white">
                Iniciar sesión
              </Link>
            )}
          </div>
        </div>
        <nav aria-label="Principal" className="flex gap-1 text-sm overflow-x-auto -mx-1 px-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={isActive(l.href) ? 'page' : undefined}
              className={`px-3 py-2 rounded-md min-h-[44px] inline-flex items-center whitespace-nowrap focus-visible:outline-2 focus-visible:outline-white ${
                isActive(l.href) ? 'bg-white/15 font-semibold' : 'hover:bg-white/10'
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  )
}
