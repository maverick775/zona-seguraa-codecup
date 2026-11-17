'use client'

import { useId, useState } from 'react'
import { DEMO_PERSONAS } from '@/lib/signalarm/config'
import { NODE, ZONE, sampleViews } from '@/lib/signalarm/scenarios'
import { URGENCY_VALUES, evaluateReportReadiness } from '@/lib/signalarm/policy'
import { REPORTED_SEVERITY_LABELS, STATUS_LABELS } from '@/lib/signalarm/labels'
import CategoryChips from '@/components/signalarm/CategoryChips'
import ReportGuidance from '@/components/signalarm/ReportGuidance'
import CommunityPolicyPreview, { policyFrom } from '@/components/signalarm/lab/CommunityPolicyPreview'
import ResponseGuide from '@/components/signalarm/lab/ResponseGuide'
import ExperimentalTag from '@/components/signalarm/lab/ExperimentalTag'

const VIEWS = sampleViews() // banco U5: mismos reportes que las pruebas
const PHASES = [
  ['follow-up', 'Seguimiento (según estado del escenario)'],
  ['draft', 'Antes de enviar'],
  ['submitted', 'Recién registrado'],
  ['send-failed', 'Falló el envío (red o servicio)'],
  ['unknown', 'No se pudo consultar el estado'],
]
const select = 'w-full px-3 py-2 min-h-[44px] border border-gray-400 rounded-lg bg-white text-gray-900'

export default function LabClient() {
  const id = useId()
  const [config, setConfig] = useState({ profileId: 'residencial', overridesText: '' })
  const [scenarioKey, setScenarioKey] = useState('z1-abierto')
  const [personaKey, setPersonaKey] = useState('coord-liberacion')
  const [staleTab, setStaleTab] = useState(false)
  const [minutes, setMinutes] = useState(12)
  const [phase, setPhase] = useState('follow-up')
  const [draft, setDraft] = useState({ zone_id: ZONE.liberacion, type: '', description: '', node_id: '', urgency: '' })

  const resolved = policyFrom(config)
  const policy = resolved.policy
  const alert = VIEWS.find((v) => v.key === scenarioKey) || null
  const actor = DEMO_PERSONAS.find((p) => p.key === personaKey) || null
  const knownVersion = alert ? (staleTab ? Math.max(1, alert.version - 1) : alert.version) : undefined
  const staleImpossible = staleTab && alert?.version === 1
  const now = alert ? Date.parse(alert.created_at) + minutes * 60000 : NaN
  const readiness = evaluateReportReadiness({ policy, draft: { ...draft, node_id: draft.node_id || null } })

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <p className="text-sm text-gray-800 bg-white border border-gray-300 rounded-xl p-3">
        Flujo: <strong>configuración → escenario → resultado explicado</strong>. Los escenarios son los del banco de pruebas (U5). Ninguna acción llama a la API.
      </p>

      <CommunityPolicyPreview profileId={config.profileId} overridesText={config.overridesText} onChange={setConfig} />

      <section aria-labelledby={`${id}-esc`} className="bg-white border border-gray-300 rounded-2xl p-4 space-y-3">
        <h2 id={`${id}-esc`} className="text-lg font-bold text-gray-900">2 · Escenario</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor={`${id}-s`} className="block text-sm font-semibold text-gray-900 mb-1">Reporte</label>
            <select id={`${id}-s`} value={scenarioKey} onChange={(e) => setScenarioKey(e.target.value)} className={select}>
              {VIEWS.map((v) => <option key={v.key} value={v.key}>{v.key} · {STATUS_LABELS[v.status]}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor={`${id}-a`} className="block text-sm font-semibold text-gray-900 mb-1">Quién actúa</label>
            <select id={`${id}-a`} value={personaKey} onChange={(e) => setPersonaKey(e.target.value)} className={select}>
              <option value="">Sin sesión</option>
              {DEMO_PERSONAS.map((p) => <option key={p.key} value={p.key}>{p.displayName}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor={`${id}-m`} className="block text-sm font-semibold text-gray-900 mb-1">Minutos desde el reporte</label>
            <input id={`${id}-m`} type="number" min={0} max={1440} value={minutes}
              onChange={(e) => setMinutes(Math.max(0, Math.min(1440, Number(e.target.value) || 0)))} className={select} />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-900 min-h-[44px] self-end">
            <input type="checkbox" checked={staleTab} onChange={(e) => setStaleTab(e.target.checked)} className="w-5 h-5" />
            Simular otra pestaña con versión vieja
          </label>
        </div>
        {staleImpossible && <p className="text-xs text-gray-700">Este reporte está en su versión 1: no hay versión anterior que simular.</p>}
      </section>

      <section aria-labelledby={`${id}-res`} className="bg-white border border-gray-300 rounded-2xl p-4 space-y-6">
        <h2 id={`${id}-res`} className="text-lg font-bold text-gray-900">3 · Resultado explicado</h2>
        <p className="text-xs text-gray-700">
          Política aplicada: <span className="font-mono">{resolved.policyVersion}</span> <ExperimentalTag show={resolved.experimental} />
          {!resolved.valid && <> · <strong>configuración inválida: se aplica {resolved.fallback}</strong></>}
        </p>

        <ResponseGuide
          key={`${scenarioKey}|${personaKey}|${resolved.policyVersion}|${config.overridesText}|${staleTab}`}
          policy={policy} actor={actor} alert={alert} knownVersion={knownVersion} now={now}
          onReload={() => setStaleTab(false)}
        />

        <hr className="border-gray-200" />

        <div className="space-y-3">
          <h3 className="text-base font-bold text-gray-900">Orientación al residente</h3>
          <div>
            <label htmlFor={`${id}-ph`} className="block text-sm font-semibold text-gray-900 mb-1">Momento</label>
            <select id={`${id}-ph`} value={phase} onChange={(e) => setPhase(e.target.value)} className={select}>
              {PHASES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </div>
          <ReportGuidance phase={phase} status={alert?.status} isDemo headingLevel={4} title="Mensajes que vería" />
        </div>

        <hr className="border-gray-200" />

        <div className="space-y-3">
          <h3 className="text-base font-bold text-gray-900">Preparación de un reporte nuevo</h3>
          <CategoryChips value={draft.type} onChange={(t) => setDraft({ ...draft, type: t })} />
          <div>
            <label htmlFor={`${id}-d`} className="block text-sm font-semibold text-gray-900 mb-1">Descripción</label>
            <textarea id={`${id}-d`} rows={2} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm text-gray-900" />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-900 min-h-[44px]">
            <input type="checkbox" checked={!!draft.node_id} onChange={(e) => setDraft({ ...draft, node_id: e.target.checked ? NODE.liberacionCentro : '' })} className="w-5 h-5" />
            Incluir punto de referencia (Centro Plaza Liberación)
          </label>
          <div>
            <label htmlFor={`${id}-u`} className="block text-sm font-semibold text-gray-900 mb-1">
              Urgencia reportada <ExperimentalTag>Migración 003 pendiente</ExperimentalTag>
            </label>
            <select id={`${id}-u`} value={draft.urgency} onChange={(e) => setDraft({ ...draft, urgency: e.target.value })} className={select}>
              <option value="">Sin indicar</option>
              {URGENCY_VALUES.map((u) => <option key={u} value={u}>{REPORTED_SEVERITY_LABELS[u]}</option>)}
            </select>
          </div>
          <div role="status" aria-live="polite" className="rounded-lg border border-gray-300 p-3 text-sm text-gray-900">
            <p className="font-semibold">
              Servidor: {readiness.readyForServer ? '✓ aceptaría el envío' : '✕ lo rechazaría'} · Propuesta: {readiness.readyForPolicy ? '✓ completa' : '✕ incompleta'}
            </p>
            <ul className="mt-1 space-y-0.5">
              {readiness.findings.map((f, i) => (
                <li key={i}>
                  {f.severity === 'blocking-server' ? '✕' : f.severity === 'blocking-policy' ? '◆' : '○'} <span className="font-mono text-xs">{f.field}</span>: {f.explanation} {f.experimental && <ExperimentalTag />}
                </li>
              ))}
            </ul>
            <p className="text-xs text-gray-700 mt-1">✕ bloquea en el servidor · ◆ lo pide la propuesta · ○ sugerencia</p>
          </div>
        </div>
      </section>
    </div>
  )
}
