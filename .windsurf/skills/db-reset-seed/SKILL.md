---
name: db-reset-seed
description: Rebuild database schema quickly for MVP iteration by purging, recreating, and reseeding from workspace SQL files.
---

1. Edit `CreatingAgentAssets/db/schema.sql` first.
2. Keep `CreatingAgentAssets/db/reset.sql` aligned.
3. Update `CreatingAgentAssets/seederZS.txt` with valid baseline rows.
4. Run `CreatingAgentAssets/db/reset-and-seed.ps1`.
5. Verify with `CreatingAgentAssets/db/verification.sql` queries.