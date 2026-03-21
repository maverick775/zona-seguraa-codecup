# Contrato FE/BE — 05 Dashboard Coordinador

> Panel de gestión para coordinadores de seguridad y personal C5 Zapopan.
> Requiere autenticación; protegido por middleware.

## Ruta FE
- **Path:** `/coordinator`
- **Componente:** `src/app/coordinator/page.js`
- **Auth:** middleware valida cookie `coordinator_token` → redirige a `/coordinator/login` si falta.

## Entidades involucradas
| Tabla | Campos usados |
|-------|--------------|
| `alerts` | todos (lista principal + mapa) |
| `nodes` | todos (marcadores en mapa) |
| `votes` | conteo por alerta (indicador de validación) |
| `zones` | `id`, `slug`, `name` (selector de zona) |
| `users` | `id`, `nickname`, `role` (sesión coordinador) |

## API Endpoints

### POST /api/coordinator/login
Autenticación de coordinador.

**Request body:**
```json
{
  "nickname": "coord_zapopan_01",
  "password": "..."
}
```

**Response 200:**
```json
{
  "data": { "token": "jwt...", "user": { "id": "uuid", "nickname": "...", "role": "coordinator" } },
  "error": null
}
```

### GET /api/alerts?zone_id={uuid}
Lista todas las alertas de la zona (activas, en progreso, resueltas recientes).

### GET /api/nodes?zone_id={uuid}
Lista nodos para el mapa con estado actual.

### PATCH /api/alerts/[id]
Cambiar estado (ver contrato 03 para transiciones).

### GET /api/alerts/[id]/timeline
Historial completo de eventos de una alerta.

**Response 200:**
```json
{
  "data": [
    { "event": "created", "actor": "JuanVisitante", "timestamp": "..." },
    { "event": "vote", "actor": "MariaAliada", "weight": 2, "timestamp": "..." },
    { "event": "level_up", "from": 1, "to": 2, "timestamp": "..." },
    { "event": "status_change", "from": "active", "to": "in_progress", "actor": "Coord_01", "timestamp": "..." }
  ],
  "error": null
}
```

## Componentes FE
| Componente | Propósito |
|-----------|----------|
| `CoordinatorLayout` | Layout con sidebar de zona + header con sesión |
| `AlertsPanel` | Lista de alertas con filtros por status y level, ordenadas por urgencia |
| `ZoneMap` | Mapa Leaflet full con marcadores de nodos y alertas geolocalizadas |
| `AlertRow` | Fila: tipo icon + nivel badge + descripción + tiempo transcurrido + votos count |
| `AlertDetailModal` | Modal con timeline + acciones (Atender, Resolver, Descartar) |
| `NodeMarker` | Marcador en mapa con color por estado (online=verde, alert=rojo, offline=gris) |
| `StatsBar` | Barra superior: alertas activas, tiempo promedio de respuesta, nodos online |

## Realtime
- Canal `alerts:zone_id=eq.{zone_id}` para nuevas alertas y cambios de estado.
- Canal `nodes:zone_id=eq.{zone_id}` para actualizaciones de nodos IoT.
- Canal `votes` para actualizar conteos de validación en tiempo real.

## Mapa — Configuración
- **Centro:** coordenadas de la zona seleccionada.
- **Zoom:** 16-17 para vista de corredor urbano.
- **Tile:** OpenStreetMap.
- **Marcadores:** nodos con color por estado + alertas con ícono por tipo.

## Íconos universales por tipo de alerta
| Tipo | Ícono |
|------|-------|
| `security` | Candado roto |
| `medical` | Cruz médica |
| `fire` | Llama |
| `other` | Signo de exclamación |

---
**Última actualización:** 2026-03-20
**Hash:** pendiente-de-PR
