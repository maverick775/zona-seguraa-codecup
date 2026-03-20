# Windsurf Workspace Mapping

## Clasificacion de requerimientos -> archivos

- Configuracion base del agente Windsurf:
  - `AGENTS.md`
  - `.windsurf/rules/global_rules.md`
  - `.windsurf/rules/*.md`

- Reglas de velocidad y metodologia MVP:
  - `.windsurf/rules/global_rules.md`
  - `.windsurf/skills/rapid-mvp-slice/SKILL.md`
  - `.windsurf/workflows/mvp-slice.md`

- Contratos FE/BE por pantalla:
  - `CreatingAgentAssets/contracts/modules/*.contract.json`
  - `CreatingAgentAssets/contracts/api/endpoints.contract.json`
  - `CreatingAgentAssets/contracts/data/entities.contract.json`
  - `CreatingAgentAssets/contracts/CHANGELOG.md`

- DB facil de modificar + purge/rebuild + seed:
  - `CreatingAgentAssets/db/schema.sql`
  - `CreatingAgentAssets/db/reset.sql`
  - `CreatingAgentAssets/db/reset-and-seed.ps1`
  - `CreatingAgentAssets/db/verification.sql`
  - `CreatingAgentAssets/seederZS.txt`

- Runbook de alcance filesystem y operacion:
  - `CreatingAgentAssets/runbook/agent-scope-runbook.md`
  - `.windsurf/hooks.json`
  - `.windsurf/scripts/enforce_scope.py`

- Contexto visual FE (paleta y accesibilidad):
  - `CreatingAgentAssets/docs/frontend-tokens.css`
  - `CreatingAgentAssets/docs/fe-uiux-considerations.md`
  - `CreatingAgentAssets/docs/be-principles-mapping.md`
  - `.windsurf/rules/frontend-ui.md`

- Documentacion principal de proyecto y operacion:
  - `README.md`
  - `AGENT.md`
  - `zona-seguraa/AGENTS.md`
