# Contrato FE/BE — 02 Reporte de Alerta

> Flujo de creación de alerta en 2 pasos. El usuario describe el incidente, selecciona categoría/urgencia y confirma ubicación.
> Wireframes: `CreatingAgentAssets/imagen (1).png` (paso 1) · `CreatingAgentAssets/imagen (2).png` (paso 2)

## Ruta FE
- **Path:** `/zone/[slug]/alert/new`
- **Componentes:** `src/app/zone/[slug]/alert/new/page.js`

## Entidades involucradas
| Tabla | Campos usados |
|-------|--------------|
| `alerts` | `id`, `zone_id`, `node_id`, `created_by`, `created_by_nick`, `type`, `level`, `status`, `description`, `language`, `lat`, `lng` |
| `zones` | `id`, `slug` (contexto) |
| `nodes` | `id`, `lat`, `lng` (nodo más cercano) |

## Flujo de pasos

### Paso 1 — Descripción y categoría
- **Descripción** (textarea, opcional): texto libre.
- **Categoría** (required): `security` | `medical` | `fire` | `other`.
- **Nivel de urgencia** (slider): 1 (Aviso) → 5 (Crisis). Default: 2 (Advertencia).

### Paso 2 — Ubicación y confirmación
- **Ubicación:** usa Geolocation API del navegador. Fallback: centro de la zona.
- **Botón "Cambiar ubicación":** abre selector manual en mapa Leaflet.
- **Nivel de alerta** (slider refinado): mismo slider, 5 niveles con labels (Aviso, Advertencia, Peligro, Emergencia, Crisis).
- **"Generar reporte":** envía POST.
- **"Cancelar alerta":** pulsación prolongada 5s para confirmar cancelación.

## API Endpoints

### POST /api/alerts
Crea una nueva alerta.

**Request body:**
```json
{
  "zone_id": "uuid",
  "node_id": "uuid | null",
  "type": "security | medical | fire | other",
  "level": 3,
  "description": "Veo humo saliendo del edificio",
  "language": "es",
  "lat": 20.6732,
  "lng": -103.3444,
  "created_by_nick": "CarlosZMG"
}
```

**Response 201:**
```json
{
  "data": {
    "id": "uuid",
    "zone_id": "uuid",
    "type": "security",
    "level": 3,
    "status": "active",
    "created_at": "2026-03-20T22:00:00Z"
  },
  "error": null
}
```

**Response 400:**
```json
{
  "data": null,
  "error": "zone_id and type are required"
}
```

## Componentes FE
| Componente | Propósito |
|-----------|----------|
| `AlertReportStep1` | Form: descripción + categoría chips + slider urgencia |
| `AlertReportStep2` | Mapa ubicación + slider nivel refinado + botones acción |
| `CategoryChip` | Chip seleccionable (Seguridad, Médica, Incendio, Otro) |
| `UrgencySlider` | Slider 1-5 con labels y color dinámico por nivel |
| `LocationPicker` | Muestra lat/lng del navegador + botón cambiar + mini mapa |

## Validaciones
- `type` requerido; si no se selecciona, mostrar error inline.
- `level` default 2 si el usuario no mueve el slider.
- Geolocation: pedir permiso; si se deniega, usar centro de zona como fallback.

## Colores por nivel
| Nivel | Label | Color |
|-------|-------|-------|
| 1 | Aviso | `#f4a261` (amarillo) |
| 2 | Advertencia | `#e76f51` (naranja) |
| 3 | Peligro | `#e63946` (rojo) |
| 4 | Emergencia | `#d00000` (rojo intenso) |
| 5 | Crisis | `#9d0208` (rojo oscuro) |

---
**Última actualización:** 2026-03-20
**Hash:** pendiente-de-PR
