---
description: Reset and reseed the Supabase database from schema and seed files
---

# DB Reset & Reseed

Use this workflow when the database schema has changed and you need to rebuild from scratch.

## Steps

1. Open the Supabase SQL Editor for the project (or use `supabase` CLI if installed locally).

2. Run the full schema SQL from `CreatingAgentAssets/db/schema.md` (copy the SQL block).
   - This uses `CREATE TABLE IF NOT EXISTS` so it is safe to re-run, but if you need a clean slate, drop tables first:
   ```sql
   DROP TABLE IF EXISTS community_members, communities, votes, alerts, users, nodes, zones CASCADE;
   ```

3. Run the seed file:
   ```sql
   -- Paste contents of CreatingAgentAssets/seederZS.txt
   ```

4. Verify with the SELECT at the end of the seed file — should return all nodes for the zone.

5. Start the dev server and hit `/health` to confirm connectivity:
// turbo
```bash
cd zona-seguraa && npm run dev
```

6. Open `http://localhost:3000/health` and verify `{ "status": "ok", "supabase": "connected" }`.

## After reset
- Update any affected contracts in `CreatingAgentAssets/contracts/` if columns changed.
- Update `seederZS.txt` if new columns were added to existing tables.
