---
trigger: model_decision
description: Apply when changing API routes, payloads, DB entities, or front-end screen flows that require FE/BE contract synchronization.
---

# Contract Sync Rule

- If route, payload, or entity changes, update:
  - `CreatingAgentAssets/contracts/api/endpoints.contract.json`
  - `CreatingAgentAssets/contracts/modules/*.contract.json`
  - `CreatingAgentAssets/contracts/CHANGELOG.md`
- Keep endpoint IDs stable; bump module `contract_version`.
- Do not remove fields without marking `breaking_change: true` and writing a migration note.