# Zona SeguRAA — Roo Code Rules

## Workspace layout
- `zona-seguraa/` — Next.js 14 app (JS puro, App Router)
- `CreatingAgentAssets/` — schema, seed, contratos, runbook

## Before writing any code
1. Read `CreatingAgentAssets/db/schema.md` for the canonical data model
2. Read the relevant contract in `CreatingAgentAssets/contracts/` for the screen/endpoint
3. Read `.windsurf/rules.md` for global project rules

## Mode recommendations
- **Code mode:** implementación de API routes y componentes
- **Architect mode:** cambios de schema, nuevas entidades, refactors grandes
- **Ask mode:** dudas sobre reglas de negocio, escalada de alertas, flujo de coordinadores

## Never do
- Instalar nuevas dependencias sin confirmar
- Crear archivos `.ts` o `.tsx`
- Usar `Response` nativo en lugar de `NextResponse.json()`
- Modificar `schema.md` sin actualizar el seed consistentemente
