'use client'

import { useId, useState } from 'react'
import { POLICY_PROFILES, exportPolicy, invalidPolicyResult, resolvePolicy } from '@/lib/signalarm/policy'
import ExperimentalTag from './ExperimentalTag'

// U6-D: configuración propuesta de comunidad. Perfiles sintéticos; no hay administrador real.
// Los ajustes se escriben como JSON parcial y se validan; si fallan, rigen las reglas vigentes.
const PROFILE_OPTIONS = [['vigente', 'Reglas vigentes (sin propuestas)'], ...Object.entries(POLICY_PROFILES).map(([k, p]) => [k, p.label])]

export default function CommunityPolicyPreview({ profileId, overridesText, onChange }) {
  const id = useId()
  const [copied, setCopied] = useState('')
  const resolved = policyFrom({ profileId, overridesText })
  const json = exportPolicy(resolved.policy)

  const copy = async () => {
    try { await navigator.clipboard.writeText(json); setCopied('Copiado al portapapeles.') } catch { setCopied('No se pudo copiar; usa Descargar.') }
  }
  const download = () => {
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url; a.download = `politica-${resolved.policy.id}-${resolved.policy.version}.json`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section aria-labelledby={`${id}-h`} className="bg-white border border-gray-300 rounded-2xl p-4 space-y-3">
      <h2 id={`${id}-h`} className="text-lg font-bold text-gray-900">1 · Configuración propuesta</h2>
      <div>
        <label htmlFor={`${id}-p`} className="block text-sm font-semibold text-gray-900 mb-1">Perfil de ejemplo</label>
        <select id={`${id}-p`} value={profileId} onChange={(e) => onChange({ profileId: e.target.value, overridesText: '' })}
          className="w-full px-3 py-2 min-h-[44px] border border-gray-400 rounded-lg bg-white text-gray-900">
          {PROFILE_OPTIONS.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
        </select>
        <p className="text-xs text-gray-700 mt-1">Los perfiles son ejemplos de diseño, no decisiones aprobadas.</p>
      </div>
      <div>
        <label htmlFor={`${id}-o`} className="block text-sm font-semibold text-gray-900 mb-1">Ajustes (JSON parcial, opcional)</label>
        <textarea id={`${id}-o`} value={overridesText} rows={4} spellCheck={false}
          onChange={(e) => onChange({ profileId, overridesText: e.target.value })}
          aria-describedby={`${id}-st`}
          placeholder='{"coordination": {"waitingAdvisoryMinutes": 20}}'
          className="w-full px-3 py-2 border border-gray-400 rounded-lg font-mono text-xs text-gray-900" />
      </div>
      <div id={`${id}-st`} role="status" aria-live="polite"
        className={`rounded-lg p-3 text-sm border ${resolved.valid ? 'bg-green-50 border-green-400 text-green-950' : 'bg-red-50 border-red-400 text-red-950'}`}>
        <p className="font-semibold">
          {resolved.valid ? '✓ ' : '✕ '}{resolved.explanation}{' '}
          <span className="font-mono text-xs">[{resolved.code}]</span>
        </p>
        {!resolved.valid && (
          <ul className="list-disc ml-5 mt-1">
            {resolved.errors.map((e, i) => <li key={i}><span className="font-mono text-xs">{e.path || '(raíz)'}</span>: {e.explanation}</li>)}
          </ul>
        )}
        <p className="text-xs mt-1">
          {resolved.fallback ? <>Política aplicada: <strong className="font-mono">{resolved.fallback}</strong> · </> : null}
          Versión efectiva: <span className="font-mono">{resolved.policyVersion}</span> <ExperimentalTag show={resolved.experimental} />
        </p>
      </div>
      <details>
        <summary className="cursor-pointer text-sm font-semibold text-gray-900 min-h-[44px] flex items-center">Configuración efectiva (JSON)</summary>
        <pre className="text-xs bg-gray-50 border border-gray-200 rounded-lg p-3 overflow-x-auto text-gray-900">{json}</pre>
      </details>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => onChange({ profileId, overridesText: '' })}
          className="px-3 py-2 min-h-[44px] border border-gray-400 rounded-lg text-sm text-gray-900 focus-visible:outline-2 focus-visible:outline-slate-900">Restaurar valores del perfil</button>
        <button type="button" onClick={copy}
          className="px-3 py-2 min-h-[44px] border border-gray-400 rounded-lg text-sm text-gray-900 focus-visible:outline-2 focus-visible:outline-slate-900">Copiar JSON</button>
        <button type="button" onClick={download}
          className="px-3 py-2 min-h-[44px] border border-gray-400 rounded-lg text-sm text-gray-900 focus-visible:outline-2 focus-visible:outline-slate-900">Descargar JSON</button>
      </div>
      <p role="status" aria-live="polite" className="text-xs text-gray-700">{copied}</p>
    </section>
  )
}

// Política efectiva para el resto del laboratorio. JSON ilegible → reglas vigentes.
export function policyFrom({ profileId, overridesText }) {
  if (!overridesText.trim()) return resolvePolicy({ profileId })
  try {
    return resolvePolicy({ profileId, overrides: JSON.parse(overridesText) })
  } catch {
    return invalidPolicyResult([{ path: '', code: 'invalid-json', explanation: 'El JSON de ajustes no se puede leer.' }])
  }
}
