---
name: contract-sync
description: Update FE/BE contract files by screen and endpoint when routes, payloads, entities, or user flows change. Use for two-team synchronization commits.
---

1. Identify affected screen modules and endpoint IDs.
2. Update module files in `CreatingAgentAssets/contracts/modules/*.contract.json`.
3. Update `CreatingAgentAssets/contracts/api/endpoints.contract.json`.
4. Add one short line to `CreatingAgentAssets/contracts/CHANGELOG.md`.
5. If incompatible changes were introduced, set `breaking_change: true` and include migration notes.