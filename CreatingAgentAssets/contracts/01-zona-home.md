# Contrato FE/BE — 01 Zona Home

> Pantalla principal del visitante. Muestra zona activa, botón SOS, acciones rápidas y navegación inferior.
> Wireframe: `CreatingAgentAssets/imagen.png`

## Ruta FE
- **Path:** `/zone/[slug]`
- **Componente:** `src/app/zone/[slug]/page.js`

## Entidades involucradas
| Tabla | Campos usados |
|-------|--------------|
| `zones` | `id`, `slug`, `name`, `active` |
| `nodes` | `id`, `zone_id`, `name`, `type`, `status`, `lat`, `lng` |
| `alerts` | `id`, `zone_id`, `level`, `status`, `created_at` (conteo badge) |

## API Endpoints

### GET /api/zones/[slug]
Obtiene datos de la zona activa con conteo de nodos y alertas.

**Response 200:**
```json
{
  "data": {
    "id": "uuid",
    "slug": "chapultepec",
    "name": "FanFest",
    "active": true,
    "nodes_count": 8,
    "active_alerts_count": 5
  },
  "error": null
}
```

### GET /api/alerts?zone_id={uuid}&status=active
Conteo de alertas activas para el badge de la tab "Alertas".

**Response 200:**
```json
{
  "data": [{ "id": "uuid", "level": 2, "status": "active", "type": "security" }],
  "count": 5,
  "error": null
}
```

## Componentes FE
| Componente | Propósito |
|-----------|----------|
| `ZoneHeader` | Muestra nombre de zona + selector + campana de notificaciones |
| `SOSButton` | Botón rojo prominente; pulsación prolongada 3s activa alerta; navega a pantalla 02 |
| `QuickActions` | Grid 3×2: Invitar aliado, Gestionar zona, Actividad reciente, Llamar 911, Mapa de zona, Guías de apoyo |
| `BottomNav` | Tabs: Zona, Alertas (badge count), Comunidades (badge count), Más |

## Realtime
- Suscripción a `alerts` filtrado por `zone_id` para actualizar badge en tiempo real.

## Notas
- El botón SOS crea un alert en estado `draft` al iniciar pulsación; si se completa (3s), transiciona a `active` vía `POST /api/alerts`.
- "Llamar 911" usa `tel:911` nativo del navegador.

---
**Última actualización:** 2026-03-20
**Hash:** pendiente-de-PR
