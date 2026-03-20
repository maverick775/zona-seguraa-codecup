# Contrato FE/BE — 04 Comunidades

> Lista de comunidades con filtros, roles de membresía y acceso a alertas por zona.
> Wireframe: `CreatingAgentAssets/imagen (3).png`

## Ruta FE
- **Path:** `/communities`
- **Componente:** `src/app/communities/page.js`

## Entidades involucradas
| Tabla | Campos usados |
|-------|--------------|
| `communities` | `id`, `zone_id`, `name`, `description`, `status` |
| `community_members` | `community_id`, `user_id`, `role` |
| `zones` | `id`, `name` |
| `alerts` | conteo por `zone_id` (badges) |
| `users` | `id` (sesión actual para determinar rol del visitante) |

## API Endpoints

### GET /api/communities
Lista comunidades con conteo de miembros y alertas activas.

**Query params:** `?filter=all|nearby|member|ally` · `?lat=20.67&lng=-103.34` (para nearby)

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Residencial Los Pinos",
      "zone_name": "Corredor Chapultepec",
      "status": "active",
      "members_present": 24,
      "members_total": 87,
      "unverified_alerts": 2,
      "active_alerts": 1,
      "user_role": "admin"
    }
  ],
  "error": null
}
```

### POST /api/communities/[id]/join
Unirse a una comunidad.

**Request body:**
```json
{
  "user_id": "uuid"
}
```

**Response 201:**
```json
{
  "data": { "community_id": "uuid", "user_id": "uuid", "role": "visitor" },
  "error": null
}
```

## Componentes FE
| Componente | Propósito |
|-----------|----------|
| `CommunityList` | Lista scrollable de cards de comunidades |
| `CommunityCard` | Card con nombre, status badge, conteo miembros, alertas, botones |
| `CommunityFilters` | Tabs horizontales: Todas, Cerca de mí, Soy Miembro, Soy Aliado |
| `JoinButton` | Botón "Unirme" para comunidades donde el usuario no es miembro |
| `RoleBadge` | Badge coloreado: Admin (púrpura `#a020f0`), Aliado (azul `#3a86ff`), Visitante (gris `#6c757d`) |

## Colores de estado de comunidad
| Estado | Color | Label |
|--------|-------|-------|
| `active` | Verde `#2b7a78` | Todo tranquilo |
| `monitoring` | Naranja `#e76f51` | En monitoreo |
| `alert` | Rojo `#e63946` | Alerta activa |

## Reglas de acceso
- **Admin:** ve todo, puede gestionar zona, invitar aliados.
- **Aliado:** ve detalles + alertas de todos los niveles.
- **Visitante:** acceso limitado, solo alertas Nivel 1.

---
**Última actualización:** 2026-03-20
**Hash:** pendiente-de-PR
