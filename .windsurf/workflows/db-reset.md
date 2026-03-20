# db-reset

Use when schema columns, constraints, or enums change during MVP.

## Steps
1. Edit `CreatingAgentAssets/db/schema.sql`.
2. Regenerate reset script if needed (`CreatingAgentAssets/db/reset.sql`).
3. Align `CreatingAgentAssets/seederZS.txt`.
4. Run `CreatingAgentAssets/db/reset-and-seed.ps1`.
5. Execute `CreatingAgentAssets/db/verification.sql` checks.