# Zona SeguRAA — ColoniApp MVP
### CodeCup 2026 · FanFest FIFA World Cup · Plaza Liberación, Guadalajara

> **Branch activo:** `feat-fix`
> **Estado:** MVP en integración — demo el Sábado 21 de marzo 2026
> **Stack:** Next.js 14 (App Router, JS puro) + Supabase + Leaflet + Vercel

---

## Estado Actual del MVP (21 Mar 2026)

### ✅ Funciona
- Creación de alertas → se persiste en Supabase `alerts`
- Vista pública de zona con mapa Leaflet visible
- Inserción de votos en tabla `alert_votes`
- API routes `/api/alerts` (GET/POST) y `/api/votes` (POST) operativas

### ⚠️ Bugs Conocidos (a resolver hoy)
| Bug | Impacto | Ruta afectada |
|---|---|---|
| Votos se insertan en DB pero no actualizan el nivel/estado visible | Alto - bloquea diferenciador de validación comunitaria | `POST /api/votes` + vista alerta |
| Dashboard coordinador devuelve 404 | Alto - bloquea flujo completo de la demo | `/coordinator/dashboard` |
| No existe registro de usuario temporal (`/join`) | Medio - cualquiera puede crear alertas sin identificación | `/join` + `POST /api/users/temp` |
| Sin página de detalle de alerta | Medio - no se pueden ver votos ni agregar comentarios | `/alert/[id]` |
| Auth de coordinador no funciona | Medio - solucionable dejando dashboard sin auth para demo | `/coordinator/login` |

### 🔴 Fuera de Scope (decidido 21 Mar)
- Integración Loriot / IoT / firmware real
- `/api/iot/uplink` y `/api/iot/downlink` (archivos existen, no son dependencia del demo path)
- Script `demo-mode.js` (flujo manual controlado por el equipo es preferible)
- Auth de coordinadores con Supabase Auth (dash abierto para la demo)

---

## Mapa de Demo: Plaza Liberación, FanFest FIFA 2026

**Zona objetivo:** Plaza de la Liberación, Centro Histórico, Guadalajara, Jalisco  
**Coordenadas centro:** `20.6770, -103.3458`  
**Zoom recomendado:** 17 (nivel calle)  
**Radio de cobertura por nodo:** 150 metros (círculo L.circle con fillOpacity)

### Nodos definidos (Plaza Liberación + entorno)
Basado en el mapa de planeación del equipo. Insertar en DB con `zone_id` correspondiente:

```sql
-- Zona: fanfest-plaza-liberacion
INSERT INTO nodes (id, zone_id, name, type, lat, lng, status) VALUES
  (gen_random_uuid(), '<ZONE_ID>', 'Nodo Principal - Plaza Liberación',   'avp_physical',   20.6770, -103.3458, 'online'),
  (gen_random_uuid(), '<ZONE_ID>', 'Nodo Norte - Catedral',               'avp_simulated',  20.6783, -103.3456, 'online'),
  (gen_random_uuid(), '<ZONE_ID>', 'Nodo Sur - Hospicio Cabañas',         'avp_simulated',  20.6755, -103.3461, 'online'),
  (gen_random_uuid(), '<ZONE_ID>', 'Nodo Poniente - Teatro Degollado',    'avp_simulated',  20.6769, -103.3472, 'online'),
  (gen_random_uuid(), '<ZONE_ID>', 'Punto Médico A',                      'medical_point',  20.6774, -103.3449, 'online'),
  (gen_random_uuid(), '<ZONE_ID>', 'Punto Médico B',                      'medical_point',  20.6763, -103.3466, 'online'),
  (gen_random_uuid(), '<ZONE_ID>', 'Salida Principal - Av. Hidalgo',      'exit',           20.6778, -103.3453, 'online'),
  (gen_random_uuid(), '<ZONE_ID>', 'Salida de Emergencia - Morelos',      'exit',           20.6762, -103.3453, 'online');
```

> ⚠️ Reemplazar `<ZONE_ID>` con el UUID real de la zona en Supabase antes de insertar.

---

## Rutas de la Aplicación

| Ruta | Estado | Descripción |
|---|---|---|
| `/` | ✅ OK | Landing page |
| `/join` | 🔴 Falta | Registro visitante temporal (alias + idioma) |
| `/zone/[id]` | ✅ OK (parcial) | Mapa + alertas activas + botón pánico |
| `/alert/new` | ✅ OK | Formulario nueva alerta |
| `/alert/[id]` | 🔴 Falta | Detalle: votos, comentarios, estado |
| `/coordinator/dashboard` | 🔴 404 | Dashboard coordinador — PRIORIDAD |
| `/coordinator/alert/[id]` | 🔴 Falta | Gestión individual de alerta |
| `/api/alerts` (GET/POST) | ✅ OK | Listar y crear alertas |
| `/api/alerts/[id]` (PATCH) | ⚠️ Sin probar | Cambio de estado por coordinador |
| `/api/votes` (POST) | ⚠️ Parcial | Inserta pero no actualiza nivel |
| `/api/nodes` (GET) | ✅ OK | Lista nodos por zona |
| `/api/users/temp` (POST) | 🔴 Falta | Registro visitante temporal |

---

## Modelo de Datos (Supabase)

Tablas con Realtime habilitado: `alerts`, `nodes`

```
zones → nodes → alerts → alert_votes
                       ↑
               users_temp (created_by_nick)
```

**Regla de escalado automático (en `/api/votes`):**
```
SUM(alert_votes.weight) >= 3  →  UPDATE alerts SET level = 2
```
- visitor weight = 1
- coordinator weight = 2 (1 voto de coordinador = escalado directo)

---

## Variables de Entorno Requeridas

```env
# .env.local (NO commitear)
NEXT_PUBLIC_SUPABASE_URL=https://[proyecto].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key]
SUPABASE_SERVICE_ROLE_KEY=[service-role-key]

# IoT — solo para referencia futura, no se usa en demo path
LORIOT_APP_ID=
LORIOT_API_TOKEN=
LORIOT_SERVER=https://us1.loriot.io

# Demo — coordinador pre-creado manualmente en Supabase Auth
DEMO_COORDINATOR_EMAIL=coordinator@zonaseguraa.com
DEMO_COORDINATOR_PASSWORD=[password]
```

---

## Definition of Done — Demo (21 Mar 2026)

- [ ] **DoD-1** Visitante abre zona, ve mapa de Plaza Liberación con nodos como círculos de 150m
- [ ] **DoD-2** Visitante crea una alerta médica → aparece en lista y mapa en <5 segundos
- [ ] **DoD-3** 3 votos de visitantes acumulan peso ≥ 3 → alerta escala automáticamente a Nivel 2
- [ ] **DoD-4** Dashboard de coordinador muestra todas las alertas activas
- [ ] **DoD-5** Coordinador cambia estado a `in_progress` → se refleja sin recargar (Realtime o refresh manual)
- [ ] **DoD-6** Coordinador marca alerta como `resolved` → desaparece de la cola activa
- [ ] **DoD-7** Página de detalle de alerta muestra votos, comentarios y estado actual

---

## Configuración del Mapa (Componente ZoneMap)

```javascript
// Usar en: components/ZoneMap.js
const FANFEST_CENTER = [20.6770, -103.3458]  // Plaza Liberación
const DEFAULT_ZOOM = 17
const NODE_RADIUS_METERS = 150

// Color por tipo de nodo
const NODE_COLORS = {
  avp_physical:  '#ef4444',  // rojo — nodo físico AVP
  avp_simulated: '#3b82f6',  // azul — nodo simulado
  medical_point: '#10b981',  // verde — punto médico
  exit:          '#f59e0b',  // amarillo — salida
}

// Color por estado
const STATUS_COLORS = {
  online:  '#22c55e',
  offline: '#6b7280',
  alert:   '#ef4444',
}
```

---

## Contribución — Flujo de Ramas

```
main        ← producción (Vercel auto-deploy)
  └── dev   ← integración general
       └── feat-fix  ← rama activa de fixes CodeCup
```

Hacer PR de `feat-fix` → `main` solo cuando DoD-1 al DoD-5 estén verificados.

