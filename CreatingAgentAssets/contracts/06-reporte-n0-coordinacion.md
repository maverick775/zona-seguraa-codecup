# Contrato FE/BE — 06 Reporte N0 y coordinación (Signalarm)

> Estado: **propuesta implementada en local, pendiente de revisión del owner**. Sustituye para el flujo N0 a `02-alert-report.md` (que pedía 5 niveles, tipo `other` y lat/lng no presentes en el esquema).
> Todas las respuestas: `{ "data": ..., "error": null }` o `{ "data": null, "error": { "code", "message", "details"? } }`, con cabecera `X-Request-Id`.

## Identidad
- La identidad sale **solo de la sesión**: cookie de Supabase Auth (`@supabase/ssr`) o `Authorization: Bearer`. En modo demo, cookie firmada `sg_demo_session`.
- Se ignoran `created_by`, `created_by_nick`, `nickname`, `role`, `level` y `status` que mande el cliente.
- Rol coordinador: fila en `users_coord` con el email del usuario. Zonas: `coordinator_zones`. Sin zonas, no ve nada.
- Recurso de otra zona o de otro residente → **404**. Rol insuficiente → **403**. Sin sesión → **401**.

## Rutas FE
| Ruta | Quién | Propósito |
|---|---|---|
| `/login?next=` | Todos | Login (Supabase email/contraseña, o personas demo) |
| `/alerts/create` | Autenticado | Crear N0 |
| `/reports`, `/reports/[id]` | Autor | Mis reportes y seguimiento (vista reducida) |
| `/coordinator/reports`, `/coordinator/reports/[id]` | Coordinador | Bandeja, detalle, acciones e historial |

## Endpoints
| Método y ruta | Rol | Respuestas |
|---|---|---|
| `GET /api/me` | Autenticado | 200 `{user_id, display_name, role, zone_ids, data_mode}` · 401 |
| `GET /api/zones` | Público | 200 `[{id, slug, name}]` · 503 |
| `POST /api/reports` | Autenticado | 201 nuevo · 200 reintento idéntico (`replayed: true`) · 400 · 401 · 404 zona · 409 `idempotency-mismatch` · 503 |
| `GET /api/reports` | Autenticado | 200 mis reportes (vista reducida) |
| `GET /api/reports/:id` | Autor o coordinador de la zona | 200 · 404 |
| `GET /api/coordinator/alerts?status=a,b&level=0&zone_id=` | Coordinador | 200 · 400 filtro inválido · 403 · 404 zona ajena |
| `GET /api/coordinator/alerts/:id` | Coordinador de la zona | 200 con `history[]` · 404 |
| `POST /api/coordinator/alerts/:id/transitions` | Coordinador de la zona | 200 · 400 · 403 · 404 · 409 `version-conflict` (`details.current_version`) · 422 `invalid-transition` |
| `PATCH /api/alerts/:id` (legado) | Coordinador de la zona | Solo `level` 1–3. Con `status` → 409 `use-transitions` |

### POST /api/reports
```json
{ "client_report_id": "uuid generado por el cliente y reutilizado en reintentos",
  "zone_id": "uuid", "node_id": "uuid | null (opcional)",
  "type": "medical | security | fire | evacuation",
  "description": "texto opcional, máx. 500" }
```
Respuesta `data` (vista reducida): `id, zone_id, type, level (0), status, description, node {name} | null, created_at, updated_at, replayed`.

### POST /api/coordinator/alerts/:id/transitions
```json
{ "action": "take | close | dismiss", "expected_version": 1,
  "resolution": "obligatorio en close (1–1000)",
  "dismiss_reason": "false_report | duplicate | not_actionable | other (obligatorio en dismiss)",
  "note": "obligatoria si dismiss_reason = other (máx. 500)" }
```
| Acción | Desde | Hacia |
|---|---|---|
| `take` | `active` (Abierto) | `in_progress` (En atención) |
| `close` | `in_progress` | `resolved` (Cerrado) |
| `dismiss` | `active`, `in_progress` | `false_alarm` (Descartado) |

Cada creación y transición inserta un evento en `alert_events` dentro de la misma transacción (función SQL). Sin efectos externos: no hay notificaciones, SMS, sirenas ni dispositivos.

**Última actualización:** 2026-11-03
