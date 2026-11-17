# Continuación — Signalarm, demo de reportes N0 (sesión express 2026-11-03)

## Resumen
- Hay un flujo completo en local: un residente con sesión crea un **N0** sin dispositivo, ve la confirmación con folio y lo sigue en "Mis reportes". Coordinación lo lista, filtra, toma, cierra o descarta, y cada paso queda en el historial.
- **Verificado solo en modo demo** (datos en memoria) y con la migración SQL probada en un PostgreSQL 16 local. **No se probó contra ningún Supabase.** La persistencia real, Auth de Supabase y el esquema desplegado siguen **sin validar**. No es un MVP operativo.
- Sin commits, push, PR, despliegues ni migraciones aplicadas. No se instalaron dependencias (solo `npm ci` del lockfile).

## Actualización S1 (2026-11-03, rama local `signalarm/security-auth`, sin commits)
- Votos con sesión: sin rol/identidad del cuerpo, un voto por usuario, **sin escalamiento automático**.
- `POST /api/alerts` legado → 410. Demo bloqueado fuera de local o en Vercel (503); cookie demo ignorada en modo real.
- Middleware probado: sesión ausente, expirada, revocada y válida (`scripts/tests/middleware-*.test.mjs`).
- `002_votes_identity_rls.sql`: RLS en todas las tablas, sin escritura directa con la anon key, voto único. Probado solo en PostgreSQL local.
- Reglas de agentes sin contradicciones (runbook, AGENTS.md, .windsurf, .roo, .roomodes).
- Pruebas: 26 unitarias/middleware, 48 de humo HTTP demo, SQL T1–T9 + V1–V7.
- S2 preparado, no ejecutado: `scripts/smoke-supabase.mjs`, `db/seeds/s2_test_accounts.sql`, plan en `avp3/demo-n0/S2-plan-supabase.md`. Este entorno no alcanza `*.supabase.co`.

## Actualización U5 + U1 (2026-11-03, mismo árbol, sin commits)
- **U5 banco de escenarios** `src/lib/signalarm/scenarios.js`: 5 reportes semilla (Abierto, En atención, Cerrado, Descartado, otra zona) y una matriz de acceso de 27 casos (sin sesión, residentes, coordinación de otra zona y de la zona, versión vieja, voto duplicado). La misma matriz corre en tres lugares:
  - en proceso contra las rutas reales, sin servidor: `scripts/tests/scenarios.test.mjs` (usa `scripts/lib/inprocess-api.mjs` y `alias-hooks.mjs`, sin dependencias);
  - por HTTP en modo demo: `scripts/smoke-api.mjs` (49 + 27 = 76 comprobaciones);
  - con Auth real: `scripts/smoke-supabase.mjs` (preparado, **no ejecutado**).
- **U1 componentes** `src/components/signalarm/`: `ReportCard`, `FilterChips`, `CategoryChips`, `StatusSteps`, `Timeline`, `ZoneStatus`, `ScreenHeader`; `StatusBadge` con símbolo además del color. Tokens `--sg-*` en `globals.css`.
  - En uso: bandeja, Mis reportes, seguimiento del residente, historial de coordinación e inicio.
  - Inicio: si la consulta falla muestra **"Sin datos de la zona"** (antes mostraba 0 y "Todo está normal"); con cero reportes dice "Sin reportes abiertos registrados" y aclara que eso no significa ausencia de incidentes.
  - Galería `/demo/componentes` con datos ficticios; responde 404 fuera del modo demo.
- `CategoryChips` está lista pero el formulario de creación aún no la usa (U2).

## Actualización U6 — laboratorio de políticas (2026-11-03, solo demo, sin commits)
- Motor puro `src/lib/signalarm/policy.js` (`resolvePolicy`, `validatePolicy`, `getAvailableActions`, `getRequiredFields`, `evaluateReportReadiness`, `previewTransition`, `waitingAdvisory`) y catálogo `messages.js`. **Orientativo:** no autoriza, no muta y no cambia nivel ni prioridad. Una política inválida usa las reglas vigentes.
- Tres perfiles sintéticos (residencial, evento, privada): son ejemplos y no están aprobados.
- `/demo/laboratorio` (404 fuera de demo). Componentes: `ResponseGuide`, `CommunityPolicyPreview`, `ReportGuidance` (este último ya se usa en `/reports/[id]`).
- Pruebas: `scripts/tests/policy.test.mjs`, `lab-static.test.mjs`. Total `node --test` 73/73. Humo HTTP 76/76 (antes reporté 75 por un conteo hecho sobre una segunda corrida; son 49 + 27).
- Para desactivar U6: borra `src/app/demo/laboratorio/` y `src/components/signalarm/lab/`. El motor y los mensajes no los importa ninguna ruta productiva; `ReportGuidance` en `/reports/[id]` se quita en 2 líneas.

## Actualización 2026-11-17 — preservación, recorrido, S2 y U8 (sin commits)
- **R0:** el árbol local es igual a un clon limpio de `e8f4038` con el parche acumulado aplicado (verificado). Revisión de secretos sin hallazgos. Checkpoint en `avp3/checkpoint/`.
- **U6, ajustes:**
  - Una configuración inválida dice explícitamente `BASE_POLICY` y no conserva la candidata.
  - Prueba de **paridad** motor ↔ servidor: 125 casos. Encontró 7 en que el motor revisaba el estado antes que la versión; se corrigió el orden.
  - Prueba de ausencia de mutaciones en los escenarios del laboratorio.
  - Las suites son repetibles: el humo HTTP ya no depende de la memoria previa.
- **Urgencia:** se usan los códigos de la spec F1 `reported_severity` (`informational`, `suspicious`, `urgent`). La etiqueta en español es solo para mostrar. `003_reported_severity.sql` y sus pruebas U1–U6 pasan en PostgreSQL local. **No aplicada.** Aún no está integrada en la API.
- **R1:** el formulario usa `CategoryChips` y orientación al confirmar y al fallar. Coordinación explica las acciones con `BASE_POLICY`. `scripts/e2e-recorrido.mjs` cubre residente, dos sesiones de coordinación, conflicto, cierre e historial.
- **S2:** solicitud exacta en `avp3/checkpoint/S2-solicitud-migracion.md`. Falta el proyecto y su ref, más acceso de red.
- **U8:** `src/lib/signalarm/contracts/` (eventos v1, bus falso, consumidor) y el contrato `contracts/07-eventos-v1.md`.
- Resultados: `node --test` 203/203 (dos corridas), humo HTTP 76/76 (dos corridas), E2E 19/19 (dos corridas), SQL con 003 (dos corridas), lint sin errores, builds demo, real y sin variables OK.

## Punto de partida
- Rama `main`, commit `e8f4038e9dc21b7e50df6c5a3cd5b9c5dc5c816b`, árbol limpio. `feat-fix` (`e28d3d3`) es más nueva y toca `page.js`, `zone/page.js` y `alert/[id]/page.js`: puede chocar con este cambio.
- Antes del primer commit (S0-1 en `avp3/08-sprints-prototipo-criterios.md`): tag `prototipo-baseline-2026-11` en `e8f4038` y rama `signalarm` desde `main`.

## Cómo correr
```bash
cd zona-seguraa && npm ci
npm run lint                      # 0 errores (2 advertencias previas en alert/[id])
node --test scripts/tests/*.test.mjs   # 203 (incluye matriz U5, paridad U6, eventos U8)

# Modo demo (datos en memoria, aviso visible en todas las páginas)
export NEXT_PUBLIC_SIGNALARM_DATA_MODE=demo
export SIGNALARM_DEMO_SECRET="$(openssl rand -base64 32)"   # obligatorio, >= 32 caracteres
npm run build && SIGNALARM_DEMO_INSECURE_COOKIE=1 npx next start -p 3100   # o npm run dev
BASE_URL=http://localhost:3100 node scripts/smoke-api.mjs   # 76 comprobaciones HTTP (incluye la matriz U5)

# Migración en PostgreSQL LOCAL desechable (se niega con hosts remotos)
PGHOST=/ruta/al/socket PGPORT=5432 CreatingAgentAssets/db/tests/run-local.sh
```
Personas demo: `residente-ana`, `residente-luis`, `coord-liberacion` (zona Plaza Liberación), `coord-rotonda` (zona Rotonda).
`SIGNALARM_DEMO_INSECURE_COOKIE=1` solo para `next start` por HTTP en local; en `npm run dev` no hace falta.

Modo Supabase (por omisión): requiere `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` **y la migración 001 aplicada**; sin ella, crear y transicionar responde 503.

## Qué se cambió
| Área | Archivos |
|---|---|
| Dominio y datos | `src/lib/signalarm/` (`domain.js` reglas puras, `repo-supabase.js` vía RPC, `repo-memory.js` demo, `actor.js` identidad, `demo-session.js` cookie HMAC, `http.js`, `config.js` escenario demo, `labels.js`) |
| API nuevas | `api/me`, `api/zones`, `api/reports`, `api/reports/[id]`, `api/coordinator/alerts`, `.../[id]`, `.../[id]/transitions`, `api/demo/session` (404 fuera de demo) |
| API endurecidas | `PATCH /api/alerts/[id]` ya exige coordinador de la zona y no cambia estados (H2); `GET /api/alerts` y `/[id]` con columnas explícitas y `sort` en lista blanca (H5) |
| Middleware | `middleware.js`: sesión real de `@supabase/ssr` o cookie demo; redirige a `/login?next=` (H6). Protege `/coordinator/*`, `/reports/*`, `/alerts/create` |
| Pantallas | `login`, `alerts/create` (N0), `reports`, `reports/[id]`, `coordinator/reports`, `coordinator/reports/[id]`; encabezado y aviso demo en `layout.js`; marca Signalarm; `ZONE_ID` sale de `config.js` |
| Legado | `/coordinator` conserva mapa y paneles, pero sus acciones llevan a la bandeja; `/coordinator/login` y `/coordinator/dashboard` redirigen |
| SQL | `CreatingAgentAssets/db/migrations/001_n0_reports.sql` (+ `.down.sql`), `db/tests/` |
| Docs | `contracts/06-reporte-n0-coordinacion.md`, nota en `db/schema.md`, sección Auth de `.windsurf/rules.md` |

`zona-seguraa/middleware.js` se modificó con la excepción autorizada por el owner (S1). `AGENTS.md` y las reglas de `.roo` y `.windsurf` ya no dicen "sin auth".

## Verificaciones ejecutadas (resultado real)
| Verificación | Resultado |
|---|---|
| `npm run lint` | 0 errores, 2 advertencias preexistentes (antes: 1 error) |
| `npm run build` sin variables | OK (antes fallaba al prerenderizar) |
| Build en modo demo y en modo Supabase con variables de relleno | OK |
| Unitarias `node --test` | 13/13 |
| SQL en PostgreSQL 16 local (T1–T9 + reaplicar + rollback) | OK |
| Humo HTTP en modo demo | 37/37: 401 sin sesión, 400 validación, 201/200/409 idempotencia, 403 residente, 404 otra zona y otro residente, 409 versión, 422 transición, historial |
| Modo Supabase con Auth/BD caídos | 401 sin sesión, 503 con token (nunca éxito), `/api/demo/session` → 404 |
| Recorrido UI móvil (Playwright, 390 px) | Login → N0 (doble clic: 1 solo reporte) → folio → Mis reportes → bandeja → tomar → cerrar → historial; residente en bandeja → mensaje 403 |
| UI con 500 forzado y sin red | Muestra error, no confirma; el reintento usa la misma clave y crea 1 reporte |

**No verificado:** esquema desplegado en Supabase, RLS, Realtime con la nueva columna, Auth real de Supabase, axe/lector de pantalla, rendimiento.

## Bloqueos y riesgos abiertos
1. **Migración 001 sin aplicar.** Antes, correr la consulta de precondición del archivo en el proyecto de pruebas. Requiere aprobación (S2-6).
2. **Modelo interino:** `alert_events` sin hash encadenado ni `organization_id`; Sprint 2 lo reemplaza (`incidents`, `signals`, `audit_log`).
3. **Service role en API (H4 sigue abierto):** las rutas verifican identidad y luego usan service role + RPC. S1-7 pide cliente con token de usuario + RLS.
4. **Pendientes de seguridad:** H3 y `POST /api/alerts` cerrados en S1. Siguen: `GET /api/alerts` y `/api/nodes` públicos (S1-1, S1-4); `users/temp` sin sesión; hasta aplicar 002, la anon key permite escritura directa en tablas sin RLS.
5. **Residentes sin membresía:** cualquier usuario autenticado puede reportar en cualquier zona activa (no hay tabla de membresías).
6. **Modo demo:** memoria por proceso; no sirve en serverless (Vercel) ni con varias instancias.
7. Sin límite de reportes por persona (429) ni cola offline de la PWA (S3-2).
8. `PATCH /api/alerts/:id` conserva el cambio manual de nivel 1–3 por coordinador **sin** evento de historial.

## Siguiente tarea sugerida
Aplicar 001 en un Supabase **de pruebas** (no compartido), crear 1 coordinador (`users_coord` + `coordinator_zones`) y 1 residente en Auth, y repetir `smoke-api.mjs` adaptado a tokens reales. Después, S1-2/S3-6: cerrar H3 en `POST /api/votes`.
