---
trigger: glob
globs: CreatingAgentAssets/db/**
---

# Database Iteration Rule

- Apply schema edits in `CreatingAgentAssets/db/schema.sql`.
- Keep reset flow idempotent (`reset.sql` then `seederZS.txt`).
- Keep seed rows aligned with schema constraints and enum domains.