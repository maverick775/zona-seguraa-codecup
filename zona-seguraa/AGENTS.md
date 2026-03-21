# Zona SeguRAA — Contexto del proyecto para agentes de código

## Dónde estás
Este es el subdirectorio `zona-seguraa/` — la aplicación Next.js 14 App Router en JavaScript puro.
El repo raíz es `zona-seguraa-codecup/`. Reglas globales en `../.windsurf/rules.md`.

## Documentos canónicos (leer antes de codificar)
- Schema DB: `../CreatingAgentAssets/db/schema.md`
- Seed: `../CreatingAgentAssets/seederZS.txt`
- Runbook (alcance permitido): `../CreatingAgentAssets/runbook.md`
- Contratos FE/BE: `../CreatingAgentAssets/contracts/*.md`

## Convenciones críticas
- JS puro — cero TypeScript, cero `.ts` o `.tsx`
- Imports siempre con alias: `@/lib/...`, `@/components/...`
- API routes: `NextResponse.json()` siempre, nunca `Response` nativo
- Supabase en API routes: `createServerClient()` desde `@/lib/supabase-server`
- Supabase en middleware: `createServerClient` de `@supabase/ssr` con adaptador de cookies
- Supabase en browser: `createBrowserClient()` desde `@/lib/supabase`

## Límites estrictos
- No hacer commits
- No modificar archivos fuera de `zona-seguraa/` sin instrucción explícita
- No instalar dependencias sin confirmar con el tech lead
- Ante duda sobre schema o contrato → preguntar, no asumir
