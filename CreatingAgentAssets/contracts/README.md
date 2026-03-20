# Contratos FE/BE — Zona SeguRAA

Este directorio es la fuente compartida de contratos para sincronizar dos equipos (FE y BE).

## Estructura
- `api/endpoints.contract.json`: contratos de endpoints y payloads.
- `data/entities.contract.json`: entidades y enums de dominio.
- `modules/*.contract.json`: contrato por pantalla/ruta de frontend.
- `CHANGELOG.md`: trazabilidad de cambios de contrato por commit.

## Regla de trabajo
1. Si cambia una pantalla o endpoint, se actualiza su contrato en el mismo cambio.
2. Si el cambio rompe compatibilidad, marcar `"breaking_change": true`.
3. El handoff FE/BE solo se considera completo cuando el contrato y el código coinciden.

## Flujo mínimo
1. Editar `modules/<pantalla>.contract.json`.
2. Editar `api/endpoints.contract.json` y/o `data/entities.contract.json` si aplica.
3. Registrar una línea en `CHANGELOG.md`.