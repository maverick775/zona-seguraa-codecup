# Contrato 07 — Eventos Signalarm v1 (U8)
> Estado: **propuesta implementada en local, pendiente de revisión del owner.** Sin MQTT, ThingsBoard ni envíos reales.
> Código: `zona-seguraa/src/lib/signalarm/contracts/` · Fixtures: `zona-seguraa/scripts/fixtures/events-v1/` · Pruebas: `scripts/tests/events-v1.test.mjs`

## Alcance
- **Estables:** eventos del recorrido N0 que ya existe. Se derivan 1:1 de `alert_events` y no crean un historial nuevo.
- **Borrador:** `device.signal.received` y `device.command.requested`. Solo existen como fixtures. El validador los rechaza salvo que se pida `allowDraft` y que lleven `fixture_only: true`.
- Lo consumirá U7 (simulador de notificaciones), también sin envíos reales.

## Sobre (envelope)
| Campo | Regla |
|---|---|
| `spec_version` | `"1.0"` |
| `contract` / `contract_version` | `"signalarm.events"` / semver. Se acepta cualquier versión con mayor `1`; un mayor distinto se rechaza |
| `id` | UUID determinista por (reporte, `sequence`): reprocesar el historial produce los mismos ids, así el consumidor puede deduplicar |
| `type` | Uno de los tipos de la tabla siguiente |
| `source` | `signalarm-core` (los fixtures usan `fixture:*`) |
| `occurred_at` | ISO 8601 con zona horaria |
| `subject` | `{ kind: "report" \| "device", id }`. **Sin otros campos** |
| `sequence` | `seq` del historial (empieza en 1) |
| `zone_id` | Zona del reporte |
| `data` | Cerrado por tipo: una clave desconocida invalida el evento |

## Tipos estables
| type | Transición | actor_role | Campos extra de `data` |
|---|---|---|---|
| `report.created` | `null → active` | resident | `has_reference_point`, `reported_severity` (null o `informational`, `suspicious`, `urgent`) |
| `report.taken` | `active → in_progress` | coordinator | — |
| `report.closed` | `in_progress → resolved` | coordinator | `has_resolution: true` (el texto **no** viaja) |
| `report.dismissed` | `active \| in_progress → false_alarm` | coordinator | `dismiss_reason` |

Campos comunes de `data`: `level` (siempre 0 en v1), `report_type`, `status_from`, `status_to` y `actor_role`.

## Privacidad
Los eventos no llevan descripción, resolución, nota, nombres, correos ni ids de usuario: solo el rol. Un consumidor que necesite más debe consultar la API con su propia autorización. Las pruebas comprueban que ningún evento contiene el texto de la descripción ni el nombre de una persona.

## Piezas
- `validateEvent(ev, { allowDraft })` devuelve `{ valid, errors[{path, code, message}] }`. No lanza excepciones.
- `toEventEnvelope(alert, historyEvent)` y `eventsFromHistory(alert)` hacen la proyección desde la vista de coordinación.
- `createFakeEventBus()` es un bus en memoria: valida, deduplica por `id` (entrega al menos una vez), congela cada evento y avisa a sus suscriptores. No abre conexiones.
- `createSequenceAuditConsumer()` es el consumidor de demostración. Detecta `gap`, `out-of-order` y `broken-chain`, y reconstruye el último estado.

## Pendiente de decidir (no implementado)
- Transporte real (MQTT, según ADR) y temas por tenant y zona.
- Firma o mTLS entre ThingsBoard y Core (ver PoC).
- Esquema de las señales de dispositivo (ver inventario `05`).
- Retención de eventos.
- Si los eventos de nivel N1–N3 entran en v1.x o v2.
