# Agent Scope Runbook (Windsurf Workspace)

## Objetivo
Mantener ejecucion rapida y segura para el MVP sin efectos fuera del entorno `C:\JALEFPractices\secondaryZSRAA`.

## Alcance permitido
- Leer/escribir solo dentro de este workspace.
- Modificar codigo, contratos, esquema y seed dentro del repo.
- Ejecutar pruebas/lint/build locales del proyecto.

## Alcance bloqueado por defecto
- Cambios fuera del workspace.
- Comandos destructivos de historial (`git reset --hard`, `git checkout --`).
- Borrado masivo del sistema (`rm -rf /`, `rmdir /s /q`, `del /f /q`).

## Guardrails tecnicos
- Hooks: `.windsurf/hooks.json`
- Script de control: `.windsurf/scripts/enforce_scope.py`
- Ignore de contexto pesado: `.codeiumignore`

## Procedimiento estandar por tecnologia
1. Next.js (FE/BE):
   - `cd zona-seguraa`
   - `npm run lint`
   - `npm run build` (si se requiere validar integracion)
2. Contratos FE/BE:
   - Editar `CreatingAgentAssets/contracts/modules/*.contract.json`
   - Sincronizar `CreatingAgentAssets/contracts/api/endpoints.contract.json`
   - Registrar cambio en `CreatingAgentAssets/contracts/CHANGELOG.md`
3. Base de datos:
   - Editar `CreatingAgentAssets/db/schema.sql`
   - Ajustar `CreatingAgentAssets/seederZS.txt`
   - Ejecutar `pwsh ./CreatingAgentAssets/db/reset-and-seed.ps1`
4. IoT/Loriot:
   - Mantener payloads y comandos en contratos API + `src/lib/loriot.js`
   - No exponer secretos en archivos versionados

## Handshake FE/BE obligatorio
- Antes de merge entre equipos, validar:
  - contrato por pantalla actualizado,
  - endpoint IDs correctos,
  - esquema/seed consistente.

## Regla de commits
- Este entorno no hace commits automaticos.
- Los commits se realizan manualmente por el equipo.