// lib/signalarm/config.js
// Configuración explícita del escenario demo y del modo de datos.
// Seguro para cliente y servidor: no contiene secretos.

// 'supabase' (por omisión) o 'demo' (datos en memoria, SOLO para demostración local).
// El modo demo nunca se activa solo: requiere NEXT_PUBLIC_SIGNALARM_DATA_MODE=demo.
export const DATA_MODE =
  process.env.NEXT_PUBLIC_SIGNALARM_DATA_MODE === 'demo' ? 'demo' : 'supabase'

export const IS_DEMO_MODE = DATA_MODE === 'demo'

export const DEMO_SCENARIO = {
  name: 'FanFest Guadalajara (escenario de demostración)',
  // Zona que se muestra por omisión en inicio, mapa y formulario.
  defaultZoneId:
    process.env.NEXT_PUBLIC_DEMO_ZONE_ID || 'a1000000-0000-0000-0000-000000000001',
  mapCenter: [20.677, -103.3458],
  mapZoom: 17,
}

// Personas de demostración. Solo se usan con DATA_MODE === 'demo'.
// Los ids son fijos para que las pruebas sean reproducibles.
export const DEMO_PERSONAS = [
  {
    key: 'residente-ana',
    userId: 'd0000000-0000-4000-8000-0000000000a1',
    displayName: 'Ana (residente demo)',
    role: 'resident',
    zoneIds: [],
  },
  {
    key: 'residente-luis',
    userId: 'd0000000-0000-4000-8000-0000000000a2',
    displayName: 'Luis (residente demo)',
    role: 'resident',
    zoneIds: [],
  },
  {
    key: 'coord-liberacion',
    userId: 'd0000000-0000-4000-8000-0000000000c1',
    coordId: 'd0000000-0000-4000-8000-00000000cc01',
    displayName: 'Coordinación Plaza Liberación (demo)',
    role: 'coordinator',
    zoneIds: ['a1000000-0000-0000-0000-000000000001'],
  },
  {
    key: 'coord-rotonda',
    userId: 'd0000000-0000-4000-8000-0000000000c2',
    coordId: 'd0000000-0000-4000-8000-00000000cc02',
    displayName: 'Coordinación Rotonda (demo)',
    role: 'coordinator',
    zoneIds: ['a1000000-0000-0000-0000-000000000002'],
  },
]
