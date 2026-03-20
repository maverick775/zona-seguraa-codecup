// lib/loriot.js
// Helper para integración con Loriot Network Server
// Docs API: https://docs.loriot.io/space/LNS/5799938/API+Reference

const LORIOT_SERVER  = process.env.LORIOT_SERVER  || 'https://us1.loriot.io'
const LORIOT_APP_ID  = process.env.LORIOT_APP_ID  || ''
const LORIOT_API_TOKEN = process.env.LORIOT_API_TOKEN || ''

// ─────────────────────────────────────────────────────────────
// DOWNLINK — Enviar comando al AVP3 desde el dashboard
// ─────────────────────────────────────────────────────────────
// Comandos definidos:
//   0x00 = Volver a NORMAL
//   0x04 = Marcar EN ATENCIÓN (coordinador atiende)
//   0x05 = RESUELTA
//   0x03 = CRÍTICO (nivel 3, evacuación)

export async function sendDownlink(deviceEui, commandByte) {
  if (!LORIOT_APP_ID || !LORIOT_API_TOKEN) {
    console.warn('[Loriot] Variables de entorno no configuradas — downlink omitido')
    return { ok: false, simulated: true }
  }

  // Loriot espera el EUI sin separadores (sin : ni -)
  const cleanEui = deviceEui.replace(/[:-]/g, '').toUpperCase()

  // El payload va en base64
  const payloadHex = commandByte.toString(16).padStart(2, '0')
  const payloadB64 = Buffer.from(payloadHex, 'hex').toString('base64')

  const url = `${LORIOT_SERVER}/1/rest/app/${LORIOT_APP_ID}/device/${cleanEui}/down`

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LORIOT_API_TOKEN}`
      },
      body: JSON.stringify({
        cmd: 'tx',
        EUI: cleanEui,
        port: 2,          // Puerto 2 para downlinks de control
        confirmed: false, // Unconfirmed para mayor velocidad
        data: payloadB64
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[Loriot] Downlink error ${response.status}:`, errorText)
      return { ok: false, status: response.status, error: errorText }
    }

    console.log(`[Loriot] Downlink enviado → EUI: ${cleanEui}, cmd: 0x${payloadHex}`)
    return { ok: true, eui: cleanEui, command: `0x${payloadHex}` }

  } catch (error) {
    console.error('[Loriot] Error de red al enviar downlink:', error.message)
    return { ok: false, error: error.message }
  }
}

// ─────────────────────────────────────────────────────────────
// UPLINK PARSER — Decodificar payload recibido del webhook
// ─────────────────────────────────────────────────────────────
// Payload AVP3: 2 bytes
//   Byte 0: alert_state (0-5, mapeado a EstadoAlarma en el firmware)
//   Byte 1: battery_pct (0-100)

export function parseUplinkPayload(dataHex) {
  if (!dataHex || dataHex.length < 4) {
    return { alertState: 0, batteryPct: null, valid: false }
  }

  const alertState = parseInt(dataHex.substring(0, 2), 16)
  const batteryPct = parseInt(dataHex.substring(2, 4), 16)

  return {
    alertState: isNaN(alertState) ? 0 : alertState,
    batteryPct: isNaN(batteryPct) ? null : batteryPct,
    valid: true
  }
}

// Mapeo de estado numérico → string (sincronizado con Supabase y firmware)
export function alertStateToStatus(alertState) {
  const map = {
    0: 'normal',
    1: 'active',
    2: 'active',     // nivel 2 sigue activo hasta que coordinador atiende
    3: 'active',     // nivel 3 crítico
    4: 'in_progress',
    5: 'resolved'
  }
  return map[alertState] ?? 'active'
}

export function alertStateToLevel(alertState) {
  if (alertState <= 1) return 1
  if (alertState <= 2) return 2
  return 3
}

// ─────────────────────────────────────────────────────────────
// LORIOT WEBHOOK VALIDATOR — Verificar que el request viene de Loriot
// Opcional pero recomendado para producción
// ─────────────────────────────────────────────────────────────
export function isValidLoriotRequest(request) {
  // En producción real validarías un HMAC signature
  // Para el MVP, validamos que el Content-Type sea correcto
  const contentType = request.headers.get('content-type') || ''
  return contentType.includes('application/json')
}

