# Signalarm (prototipo zona-seguraa) — Contexto para agentes de código

## Dónde estás
Este es el subdirectorio `zona-seguraa/` — la aplicación Next.js 16 (App Router) en JavaScript puro.
Nombre visible del producto: **Signalarm**. Las carpetas y nombres internos `zona-seguraa` se conservan.
El repo raíz es `zona-seguraa-codecup/`. Reglas globales en `../.windsurf/rules.md`.

## Documentos canónicos (leer antes de codificar)
- Schema DB: `../CreatingAgentAssets/db/schema.md`
- Seed: `../CreatingAgentAssets/seederZS.txt`
- Runbook (alcance permitido): `../CreatingAgentAssets/runbook.md`
- Contratos FE/BE: `../CreatingAgentAssets/contracts/*.md` (N0 y coordinación: `06-reporte-n0-coordinacion.md`)
- Migraciones propuestas: `../CreatingAgentAssets/db/migrations/` (no aplicar sin aprobación del owner)
- Continuación: `../CreatingAgentAssets/CONTINUACION-signalarm-n0.md`

## Convenciones críticas
- JS puro — cero TypeScript, cero `.ts` o `.tsx`
- Imports siempre con alias: `@/lib/...`, `@/components/...`
- API routes: `NextResponse.json()` siempre, nunca `Response` nativo
- Supabase en API routes: `createServerClient()` desde `@/lib/supabase-server`
- Supabase en middleware: `createServerClient` de `@supabase/ssr` con adaptador de cookies
- Supabase en browser: `createBrowserClient()` desde `@/lib/supabase`

## Seguridad (obligatorio)
- **La coordinación y los reportes exigen sesión.** No quitar el middleware ni dejar el dashboard sin login.
- Identidad, rol y zona salen de la sesión en el servidor (`src/lib/signalarm/actor.js`); nunca del cuerpo.
- Toda API que lee o muta reportes autoriza por zona; recurso ajeno → 404.
- Los cambios de estado pasan por `POST /api/coordinator/alerts/:id/transitions` (dejan historial).
- Modo demo solo con `NEXT_PUBLIC_SIGNALARM_DATA_MODE=demo` y solo en local; nunca como respaldo de un fallo.
- Un fallo de API se muestra como error, nunca como éxito simulado.

## Pruebas
- `npm run lint` · `node --test scripts/tests/*.test.mjs` · `scripts/smoke-api.mjs` (modo demo local)
- SQL: `../CreatingAgentAssets/db/tests/run-local.sh` (solo PostgreSQL local)

## Límites estrictos
- No hacer commits, push, PR ni merge sin confirmación del owner
- No ejecutar migraciones en Supabase compartido o producción
- No modificar archivos fuera de `zona-seguraa/` sin instrucción explícita
- No instalar dependencias sin confirmar con el tech lead
- Ante duda sobre schema o contrato → preguntar, no asumir
