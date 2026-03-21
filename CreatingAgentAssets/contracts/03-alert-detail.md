# Contrato FE/BE — 03 Detalle de Alerta

> Vista de una alerta activa con timeline, votos comunitarios, mapa y acciones del coordinador.

## Ruta FE
- **Path:** `/zone/[slug]/alert/[id]`
- **Componente:** `src/app/zone/[slug]/alert/[id]/page.js`

## Entidades involucradas
| Tabla | Campos usados |
|-------|--------------|
| `alerts` | todos |
| `votes` | `id`, `alert_id`, `nickname`, `role`, `weight`, `comment`, `created_at` |
| `nodes` | `id`, `name`, `lat`, `lng` (ubicación en mapa) |
| `users` | `nickname`, `role` (contexto del votante) |

## API Endpoints

### GET /api/alerts/[id]
Detalle completo de la alerta con votos y nodo asociado.

**Response 200:**
```json
{
  "data": {
    "id": "uuid",
    "zone_id": "uuid",
    "type": "medical",
    "level": 3,
    "status": "active",
    "description": "Persona inconsciente cerca de la fuente",
    "lat": 20.6732,
    "lng": -103.3444,
    "created_by_nick": "MariaZMG",
    "created_at": "2026-03-20T22:00:00Z",
    "node": { "id": "uuid", "name": "Fuente Central" },
    "votes": [
      { "id": "uuid", "nickname": "Carlos", "role": "ally", "weight": 2, "comment": "Confirmado", "created_at": "..." }
    ],
    "votes_total_weight": 5,
    "validation_pct": 62
  },
  "error": null
}
```

### POST /api/votes
Agrega un voto de validación comunitaria.

**Request body:**
```json
{
  "alert_id": "uuid",
  "nickname": "PedroV",
  "role": "visitor",
  "comment": "Lo estoy viendo desde aquí"
}
```

**Response 201:**
```json
{
  "data": { "id": "uuid", "weight": 1, "created_at": "..." },
  "error": null
}
```

**Lógica de escalada:** cuando `SUM(weight) >= 3` → alerta sube de nivel automáticamente (`level + 1`, máx 5).

### PATCH /api/alerts/[id]
Transición de estado (solo coordinadores autenticados).

**Request body:**
```json
{
  "status": "in_progress"
}
```

**Transiciones válidas:**
- `active` → `in_progress` | `dismissed`
- `in_progress` → `resolved` | `active` (reabrir)

**Response 200:**
```json
{
  "data": { "id": "uuid", "status": "in_progress", "updated_at": "..." },
  "error": null
}
```

## Componentes FE
| Componente | Propósito |
|-----------|----------|
| `AlertHeader` | Tipo + nivel + badge de estado + timestamp |
| `AlertMap` | Mapa Leaflet centrado en lat/lng de la alerta con marcador |
| `AlertTimeline` | Lista cronológica de eventos (creación, votos, cambios de estado) |
| `VoteCard` | Muestra nickname, rol, peso, comentario |
| `VoteButton` | Botón "Confirmo" para visitantes/aliados |
| `CoordinatorActions` | Botones "Atender" / "Descartar" (visible solo si `role=coordinator`) |
| `SafeFeedback` | Botón "Estoy seguro" post-resolución para mejorar algoritmos |

## Realtime
- Canal `alerts:id=eq.{alert_id}` para cambios de estado.
- Canal `votes:alert_id=eq.{alert_id}` para nuevos votos en tiempo real.

## Mensajes contextuales por nivel
| Nivel | Mensaje |
|-------|---------|
| 1-2 | "Monitorea la situación y valida si puedes" |
| 3 | "Respira y sigue las instrucciones de seguridad" |
| 4-5 | "Mantente en posición segura, ayuda en camino" |

---
**Última actualización:** 2026-03-20
**Hash:** pendiente-de-PR
