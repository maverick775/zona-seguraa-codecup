import { guidanceFor } from '@/lib/signalarm/messages'

// U6-C: orientación para quien reporta. Mensajes del catálogo centralizado (messages.js).
// phase: 'draft' | 'submitted' | 'send-failed' | 'follow-up' | 'unknown'
export default function ReportGuidance({ phase, status, isDemo = false, headingLevel = 2, title = 'Qué significa' }) {
  const items = guidanceFor({ phase, status, isDemo })
  const H = `h${headingLevel}`
  return (
    <section aria-label={title} className="space-y-2">
      <H className="text-sm font-semibold text-gray-900">{title}</H>
      <ul className="space-y-2">
        {items.map((m) => (
          <li key={m.code} data-code={m.code}
            className={`rounded-xl border p-3 text-sm ${m.code === 'network-unavailable' || m.code === 'status-unknown' ? 'bg-amber-50 border-amber-400 text-amber-950' : 'bg-white border-gray-300 text-gray-900'}`}>
            <p className="font-semibold">{m.title}</p>
            <p className="mt-0.5">{m.body}</p>
            {m.action && (
              <a href={m.action.href} className="inline-block mt-1 underline font-semibold min-h-[44px] leading-[44px] focus-visible:outline-2 focus-visible:outline-slate-900">
                {m.action.label}
              </a>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
