# BE Development Principles Mapping

1. Definir pilares logicos verificables
- Soporte: `db/schema.sql`, `contracts/api/endpoints.contract.json`

2. Trabajar por objetivos funcionales y comportamiento esperado
- Soporte: `contracts/modules/*.contract.json`

3. Evitar retrabajo, usar librerias seguras
- Soporte: `.windsurf/rules/global_rules.md`, `README.md`

4. Estructura clara de archivos
- Soporte: `README.md`, `docs/windsurf-workspace-map.md`

5. Vision full-stack e integracion de capas
- Soporte: `contracts/README.md`, `runbook/agent-scope-runbook.md`

6. Aislar componentes reutilizables
- Soporte: `zona-seguraa/AGENTS.md` (regla de mover logica reusable a `src/lib/**`)