// U6: garantías estáticas del laboratorio (sin servidor).
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8')
const LAB_FILES = [
  'src/app/demo/laboratorio/LabClient.js',
  'src/components/signalarm/lab/ResponseGuide.js',
  'src/components/signalarm/lab/CommunityPolicyPreview.js',
  'src/components/signalarm/ReportGuidance.js',
  'src/lib/signalarm/policy.js',
  'src/lib/signalarm/messages.js',
]

test('laboratorio y motor no hacen llamadas de red ni usan el repositorio', () => {
  for (const f of LAB_FILES) {
    const src = read(f)
    assert.doesNotMatch(src, /\bfetch\(|apiFetch|XMLHttpRequest|WebSocket|getRepository|supabase/i, f)
  }
})

test('páginas demo responden 404 fuera del modo demo', () => {
  for (const f of ['src/app/demo/laboratorio/page.js', 'src/app/demo/componentes/page.js']) {
    assert.match(read(f), /if \(!IS_DEMO_MODE\) notFound\(\)/, f)
  }
})

test('el motor no importa nada que escriba ni autorice en el servidor', () => {
  const src = read('src/lib/signalarm/policy.js')
  const imports = [...src.matchAll(/from '([^']+)'/g)].map((m) => m[1])
  assert.deepEqual(imports.sort(), ['./domain.js', './messages.js'])
})
