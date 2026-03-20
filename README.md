# Zona SeguRAA - Windsurf Workspace

Zona SeguRAA es un MVP de alerta colaborativa para una zona publica de libre acceso (ejemplo: Parque Metropolitano, Zapopan). Este workspace esta preparado para trabajo paralelo FE/BE con contratos compartidos y ciclos rapidos de entrega.

## Objetivo del MVP
- Reportar alertas comunitarias desde web en segundos.
- Validar alertas por comunidad para reducir falsas alarmas.
- Escalar por niveles y coordinar respuesta operativa.
- Mantener trazabilidad FE/BE por contratos versionados.

## Workspace
- `zona-seguraa/`: app Next.js (FE + API routes).
- `CreatingAgentAssets/contracts/`: contratos por pantalla, endpoints y entidades.
- `CreatingAgentAssets/db/`: esquema mutable + reset + verificacion.
- `CreatingAgentAssets/seederZS.txt`: seed base de zona publica.
- `CreatingAgentAssets/runbook/agent-scope-runbook.md`: runbook operativo.
- `.windsurf/`: rules, skills, workflows y hooks para Cascade.

## Configuracion Windsurf (ya incluida)
- `AGENTS.md` (raiz): reglas globales del workspace.
- `.windsurf/rules/*.md`: comportamiento por contexto.
- `.windsurf/skills/*/SKILL.md`: procedimientos reutilizables.
- `.windsurf/workflows/*.md`: slash workflows manuales.
- `.windsurf/hooks.json`: guardrails de alcance + comandos.
- `.codeiumignore`: exclusiones para contexto rapido.

## Flujo FE/BE (obligatorio)
1. Cambiar contrato por pantalla en `CreatingAgentAssets/contracts/modules`.
2. Sincronizar endpoint/entidad en contratos API/data.
3. Implementar en `zona-seguraa`.
4. Registrar cambio en `CreatingAgentAssets/contracts/CHANGELOG.md`.

## DB Iterativa (MVP)
1. Editar `CreatingAgentAssets/db/schema.sql`.
2. Ajustar `CreatingAgentAssets/seederZS.txt`.
3. Ejecutar `pwsh ./CreatingAgentAssets/db/reset-and-seed.ps1`.

## Comandos utiles
```bash
cd zona-seguraa
npm install
npm run dev
npm run lint
npm run build
```

## Notas operativas
- No hay commits automaticos.
- Mantener cambios dentro de este workspace.
- Documentar solo el por que en comentarios de codigo.