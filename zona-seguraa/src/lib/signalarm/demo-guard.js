// lib/signalarm/demo-guard.js
// El modo demo (datos en memoria + sesiones de personas ficticias) solo puede
// servirse en la máquina local. Se bloquea si:
//   - corre en Vercel (cualquier entorno: preview o producción), o
//   - el Host de la petición no es local ni está en SIGNALARM_DEMO_ALLOWED_HOSTS.
// No hay respaldo silencioso: el modo real nunca cae a memoria ni a sesión demo.
const LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]']

function hostname(hostHeader) {
  if (!hostHeader) return ''
  const h = String(hostHeader).toLowerCase()
  return h.startsWith('[') ? h.slice(0, h.indexOf(']') + 1) : h.split(':')[0]
}

// Devuelve null si está permitido, o un código de motivo.
export function demoBlockReason({ host, env = process.env } = {}) {
  if (env.VERCEL || env.VERCEL_ENV) return 'demo-on-vercel'
  const extra = (env.SIGNALARM_DEMO_ALLOWED_HOSTS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  const name = hostname(host)
  if (!LOCAL_HOSTS.includes(name) && !extra.includes(name)) return 'demo-non-local-host'
  return null
}
