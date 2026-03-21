# Zona SeguRAA — Windsurf Rules
### Reglas para agentes de IA en este proyecto · Actualizado: 21 Mar 2026

---

## Contexto del Proyecto

Zona SeguRAA es un MVP de seguridad comunitaria para el **FanFest FIFA World Cup 2026** en la **Plaza de la Liberación, Guadalajara**. Se presenta en CodeCup el **sábado 21 de marzo de 2026**.

**Stack:** Next.js 14 App Router · JavaScript (no TypeScript) · Tailwind CSS · Supabase (PostgreSQL + Realtime) · Leaflet.js · Vercel

---

## Reglas Generales — SIEMPRE

1. **JavaScript puro.** Nunca generar archivos `.ts` o `.tsx`. Sin anotaciones de tipo ni interfaces TypeScript.
2. **App Router de Next.js 14.** Estructura `app/` con `page.js`, `layout.js`, `route.js`. No usar `pages/`.
3. **Componentes cliente vs servidor:**
   - Agregar `'use client'` a cualquier componente con hooks, estado, eventos o Leaflet.
   - Las API routes (`app/api/**/route.js`) son siempre servidor.
4. **Supabase browser client** → solo en componentes `'use client'`:
   ```javascript
   import { createClient } from '@/lib/supabase'
   ```
5. **Supabase server client** → solo en `app/api/**/route.js`:
   ```javascript
   import { createServerClient } from '@/lib/supabase-server'
   ```
6. **Tailwind para estilos.** No crear archivos CSS adicionales. No usar `style={{}}` inline salvo para el div del mapa Leaflet.
7. **NextResponse.json()** en todas las respuestas de API routes.

---

## Alcance del Demo — CRÍTICO

### EN SCOPE (modificar libremente)
- Flujo visitante: `/join` → `/zone/[id]` → `/alert/new` → `/alert/[id]`
- Flujo coordinador: `/coordinator/dashboard` → `/coordinator/alert/[id]`
- APIs: `/api/alerts`, `/api/votes`, `/api/nodes`, `/api/users/temp`
- Mapa Leaflet con nodos como círculos de 150m en Plaza Liberación
- Hooks: `useRealtimeAlerts`, `useRealtimeNodes`

### FUERA DE SCOPE — No tocar para la demo
- `/api/iot/uplink` y `/api/iot/downlink`
- `lib/loriot.js` — no importar en el flujo principal
- Variables de entorno `LORIOT_*`
- Scripts de simulación automática (`demo-mode.js`)

### Auth de coordinadores (SIMPLIFICADO para demo)
- El dashboard `/coordinator/dashboard` debe ser **accesible sin login**
- Eliminar o comentar cualquier middleware de protección en rutas `/coordinator/*`
- No agregar nueva auth hasta después del CodeCup

---

## Mapa: Plaza Liberación FanFest

- **Centro:** `[20.6770, -103.3458]`
- **Zoom:** 17
- **Tiles:** OpenStreetMap
- **Representación de nodos:** `L.circle([lat, lng], { radius: 150 })`
- **Campos de posición en DB:** `node.lat` y `node.lng` (NO `node.x` / `node.y`)
- **Colores por tipo:**
  - `avp_physical`: `#ef4444` (rojo)
  - `avp_simulated`: `#3b82f6` (azul)
  - `medical_point`: `#10b981` (verde)
  - `exit`: `#f59e0b` (amarillo)
- **Estado alert:** color `#ef4444` con `fillOpacity: 0.4`
- Importar Leaflet solo con `require('leaflet')` dentro de `useEffect`

---

## Contratos de API

### POST /api/votes — Incluir escalado automático
```javascript
// Después de insertar el voto
const { data: votes } = await supabase.from('alert_votes').select('weight').eq('alert_id', alertId)
const total = votes.reduce((s, v) => s + v.weight, 0)
if (total >= 3) await supabase.from('alerts').update({ level: 2 }).eq('id', alertId).lt('level', 2)
```

### PATCH /api/alerts/[id] — Estados válidos
```javascript
// status acepta: 'active' | 'in_progress' | 'resolved' | 'false_alarm'
// level acepta: 1 | 2 | 3
```

### GET /api/alerts — Query params esperados
```
?zone_id=<uuid>            → alertas de la zona
?status=active             → filtrar por estado
?include_votes=true        → incluir alert_votes relacionados
```

### GET /api/nodes — Query params esperados
```
?zone_id=<uuid>            → nodos de la zona
```

---

## Realtime + Fallback Manual

Estrategia aceptada para la demo:

```javascript
// Patrón estándar — usar en zona y dashboard
async function fetchAlerts() {
  const res = await fetch(`/api/alerts?zone_id=${zoneId}`)
  setAlerts(await res.json())
}

useEffect(() => {
  fetchAlerts()
  const supabase = createClient()
  const ch = supabase.channel(`alerts-${zoneId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts', filter: `zone_id=eq.${zoneId}` },
      () => fetchAlerts())
    .subscribe()
  return () => supabase.removeChannel(ch)
}, [zoneId])

// UI: agregar botón "Actualizar" visible para fallback controlado
<button onClick={fetchAlerts}>↻ Actualizar</button>
```

---

## Prioridad de Tareas (orden estricto)

1. **P0** — Reparar `/coordinator/dashboard` (404) — SIN auth
2. **P0** — `POST /api/votes` recalcula y actualiza `alerts.level`
3. **P0** — Crear `/alert/[id]/page.js` con votos/comentarios
4. **P1** — Crear `/join/page.js` + `POST /api/users/temp`
5. **P1** — Mapa con `L.circle` 150m usando `lat`/`lng` reales de Plaza Liberación
6. **P1** — Realtime + botón refresh en dashboard y zona
7. **P1** — Botones de coordinador: `En Atención`, `Resolver` en dashboard
8. **P2** — Polish: etiquetas ES/EN, colores de nivel, cronómetro

---

## Errores a Evitar

- No usar `createBrowserClient` en API routes
- No usar `node.x` / `node.y` para posición (usar `node.lat` / `node.lng`)
- No importar Leaflet en server components
- No bloquear dashboard con auth
- No depender de `LORIOT_*` en el flujo principal
- No olvidar `.select()` después de `.insert()` cuando se necesita el objeto creado

