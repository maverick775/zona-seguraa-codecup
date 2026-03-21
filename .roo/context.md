# Zona SeguRAA — Roo Code Context
### Contexto para desarrollo asistido · CodeCup 2026 · Actualizado: 21 Mar 2026

---

## Descripción del Proyecto

MVP de seguridad comunitaria para el FanFest FIFA World Cup 2026 en la Plaza de la Liberación, Guadalajara, Jalisco, México. Permite a visitantes reportar emergencias, validar reportes de forma comunitaria y que coordinadores de seguridad gestionen la respuesta en tiempo real.

**Demo:** Sábado 21 de marzo de 2026 — CodeCup Hackathon
**Escenario:** Visitante extranjero activa alerta médica → comunidad valida → coordinador atiende y resuelve

---

## Stack Técnico

```
Frontend:  Next.js 14, App Router, JavaScript (no TypeScript), Tailwind CSS
Mapa:      Leaflet.js + react-leaflet + OpenStreetMap
Backend:   Next.js API Routes (serverless en Vercel)
DB:        Supabase PostgreSQL
Realtime:  Supabase Realtime (postgres_changes WebSocket)
Deploy:    Vercel (git push → live)
```

---

## Estructura de Archivos Esperada

```
app/
  page.js                         ← Landing con info de la zona
  join/
    page.js                       ← Registro visitante temporal ← CREAR
  zone/
    [id]/
      page.js                     ← Vista pública: mapa + alertas + botón pánico
  alert/
    new/
      page.js                     ← Formulario nueva alerta
    [id]/
      page.js                     ← Detalle: votos, comentarios, estado ← CREAR
  coordinator/
    dashboard/
      page.js                     ← Dashboard principal SIN auth ← REPARAR (404)
    alert/
      [id]/
        page.js                   ← Gestión de alerta por coordinador
  api/
    alerts/
      route.js                    ← GET + POST
      [id]/
        route.js                  ← PATCH (cambio de estado)
    votes/
      route.js                    ← POST (+ escalado automático)
    nodes/
      route.js                    ← GET
    users/
      temp/
        route.js                  ← POST ← CREAR
lib/
  supabase.js                     ← createClient() para browser
  supabase-server.js              ← createServerClient() para API routes
hooks/
  useRealtimeAlerts.js            ← Suscripción + fallback manual
  useRealtimeNodes.js             ← Suscripción a nodos
components/
  ZoneMap.js                      ← Leaflet con L.circle 150m ← REEMPLAZAR marcadores
  AlertCard.js                    ← Card de alerta en lista
  AlertForm.js                    ← Formulario multistep
  VoteSection.js                  ← Lista votos + formulario comentario
  CoordinatorPanel.js             ← Acciones: En Atención / Resolver / Escalar
```

---

## Estado Actual del Código (feat-fix)

| Archivo | Estado | Notas |
|---|---|---|
| `app/zone/[id]/page.js` | ✅ Funciona parcialmente | Mapa visible, alertas se cargan |
| `app/alert/new/page.js` | ✅ Funciona | Alertas se guardan en DB |
| `app/coordinator/dashboard/page.js` | 🔴 404 | Crear o corregir ruta |
| `app/join/page.js` | 🔴 No existe | Crear |
| `app/alert/[id]/page.js` | 🔴 No existe | Crear |
| `app/api/alerts/route.js` | ✅ Funciona | GET y POST OK |
| `app/api/votes/route.js` | ⚠️ Parcial | Inserta pero no actualiza `alerts.level` |
| `app/api/nodes/route.js` | ✅ Funciona | GET OK |
| `app/api/users/temp/route.js` | 🔴 No existe | Crear |
| `components/ZoneMap.js` (o similar) | ⚠️ Mapa visible | Cambiar de markers a circles con lat/lng |

---

## Esquema de Base de Datos

```sql
zones        (id, name, description, city, created_at)
nodes        (id, zone_id, name, type, lat, lng, lorawan_eui, status, last_seen_at)
alerts       (id, zone_id, node_id, type, level, status, description, language, created_by_nick, created_at, updated_at)
alert_votes  (id, alert_id, nickname, role, weight, comment, created_at)
users_temp   (id, nickname UNIQUE, zone_id, language, created_at, expires_at)
users_coord  (id, email UNIQUE, role, created_at)
iot_uplinks  (id, node_eui, payload_hex, alert_state, battery_pct, received_at)
```

**Realtime habilitado en:** `alerts`, `nodes`

**Escalado automático de nivel:**
```
SUM(alert_votes.weight) >= 3 → alerts.level = 2
  donde: visitor.weight = 1, coordinator.weight = 2
```

**Estados válidos de alerta:**
```
active → in_progress → resolved
active → false_alarm
in_progress → resolved
```

---

## Datos de la Zona Demo

```javascript
// Zona: fanfest-plaza-liberacion
// Coordenadas: Plaza de la Liberación, Guadalajara
const ZONE_CENTER = [20.6770, -103.3458]

// Nodos semilla (insertar con UUID real de zone_id)
const NODES_SEED = [
  { name: 'Nodo Principal - Plaza Liberación', type: 'avp_physical',   lat: 20.6770, lng: -103.3458 },
  { name: 'Nodo Norte - Catedral',             type: 'avp_simulated',  lat: 20.6783, lng: -103.3456 },
  { name: 'Nodo Sur - Hospicio Cabañas',       type: 'avp_simulated',  lat: 20.6755, lng: -103.3461 },
  { name: 'Nodo Poniente - Teatro Degollado',  type: 'avp_simulated',  lat: 20.6769, lng: -103.3472 },
  { name: 'Punto Médico A',                    type: 'medical_point',  lat: 20.6774, lng: -103.3449 },
  { name: 'Punto Médico B',                    type: 'medical_point',  lat: 20.6763, lng: -103.3466 },
  { name: 'Salida Principal - Av. Hidalgo',    type: 'exit',           lat: 20.6778, lng: -103.3453 },
  { name: 'Salida Emergencia - Morelos',       type: 'exit',           lat: 20.6762, lng: -103.3453 },
]
```

---

## Configuración del Mapa Leaflet

```javascript
// components/ZoneMap.js — Implementación de referencia
'use client'
import { useEffect, useRef } from 'react'

const TYPE_COLORS = {
  avp_physical:  '#ef4444',
  avp_simulated: '#3b82f6',
  medical_point: '#10b981',
  exit:          '#f59e0b',
}

export default function ZoneMap({ nodes = [], alerts = [] }) {
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const circlesRef = useRef([])

  useEffect(() => {
    if (mapInstance.current || !mapRef.current) return
    const L = require('leaflet')
    require('leaflet/dist/leaflet.css')
    mapInstance.current = L.map(mapRef.current, {
      center: [20.6770, -103.3458],
      zoom: 17
    })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(mapInstance.current)
  }, [])

  useEffect(() => {
    if (!mapInstance.current || !nodes.length) return
    const L = require('leaflet')
    circlesRef.current.forEach(c => c.remove())
    circlesRef.current = []

    const alertNodeIds = new Set(alerts.filter(a => a.status === 'active').map(a => a.node_id))

    nodes.forEach(node => {
      const isAlert = alertNodeIds.has(node.id) || node.status === 'alert'
      const color = isAlert ? '#ef4444' : (TYPE_COLORS[node.type] || '#3b82f6')
      const circle = L.circle([node.lat, node.lng], {
        radius: 150,
        color,
        fillColor: color,
        fillOpacity: isAlert ? 0.4 : 0.15,
        weight: 2
      })
        .addTo(mapInstance.current)
        .bindPopup(`<b>${node.name}</b><br>Tipo: ${node.type}<br>Estado: ${node.status}`)
      circlesRef.current.push(circle)
    })
  }, [nodes, alerts])

  return (
    <div ref={mapRef} style={{ height: '450px', width: '100%', borderRadius: '12px', zIndex: 0 }} />
  )
}
```

---

## Hook de Realtime con Fallback

```javascript
// hooks/useRealtimeAlerts.js
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'

export function useRealtimeAlerts(zoneId) {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(null)

  const fetchAlerts = useCallback(async () => {
    const res = await fetch(`/api/alerts?zone_id=${zoneId}`)
    const data = await res.json()
    setAlerts(Array.isArray(data) ? data : [])
    setLastUpdate(new Date())
    setLoading(false)
  }, [zoneId])

  useEffect(() => {
    if (!zoneId) return
    fetchAlerts()
    const supabase = createClient()
    const channel = supabase
      .channel(`alerts-zone-${zoneId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'alerts', filter: `zone_id=eq.${zoneId}`
      }, () => fetchAlerts())
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [zoneId, fetchAlerts])

  return { alerts, loading, lastUpdate, refetch: fetchAlerts }
}
```

---

## Ejemplos de Llamadas a API

```javascript
// Crear alerta
const res = await fetch('/api/alerts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    zone_id: 'uuid-de-la-zona',
    node_id: 'uuid-del-nodo-mas-cercano',   // opcional
    type: 'medical',                         // 'medical' | 'security' | 'evacuation'
    level: 1,
    status: 'active',
    description: 'Persona inconsciente en la plaza',
    language: 'es',
    created_by_nick: 'UsuarioTemporal123'
  })
})
const alert = await res.json()  // retorna la alerta creada con su id

// Votar/comentar
await fetch('/api/votes', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    alert_id: alert.id,
    nickname: 'OtroVisitante',
    role: 'visitor',      // 'visitor' | 'coordinator'
    comment: 'Confirmado, lo estoy viendo'
  })
})

// Cambiar estado (coordinador)
await fetch(`/api/alerts/${alert.id}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ status: 'in_progress' })
})

// Registrar visitante temporal
await fetch('/api/users/temp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    nickname: 'JohnUK_42',
    zone_id: 'uuid-de-la-zona',
    language: 'en'
  })
})
```

---

## Definition of Done (DoD) del MVP

- [ ] DoD-1: Mapa de Plaza Liberación con nodos como círculos de 150m visibles
- [ ] DoD-2: Visitante crea alerta → persiste en DB y aparece en mapa/lista
- [ ] DoD-3: 3 votos acumulan peso ≥ 3 → alerta escala a Nivel 2 automáticamente
- [ ] DoD-4: Dashboard de coordinador muestra todas las alertas activas (sin auth)
- [ ] DoD-5: Coordinador cambia estado → cambio visible sin recargar (Realtime o refresh manual)
- [ ] DoD-6: Detalle de alerta muestra votos, comentarios y estado actual
- [ ] DoD-7: Registro de visitante temporal funciona (nickname + idioma)

