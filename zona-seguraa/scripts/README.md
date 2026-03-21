# Database Scripts - Zona SeguRAA

This directory contains database-related scripts for the Zona SeguRAA project.

## Current Approach: Supabase MCP

We now use **Supabase MCP (Model Context Protocol)** for direct database operations:

- **Schema Management**: Use `mcp0_apply_migration` for DDL changes
- **Data Seeding**: Use `mcp0_apply_migration` for seed data
- **Database Queries**: Use `mcp0_execute_sql` for custom queries
- **Health Checks**: Use `mcp0_list_tables` and `curl http://localhost:3000/health`

## MCP Commands Reference

### Schema Operations
```bash
# Apply schema changes
mcp0_apply_migration --project_id=tyqpayvbelcfnwiuzfjt --name=migration_name --query="SQL_HERE"

# List all tables
mcp0_list_tables --project_id=tyqpayvbelcfnwiuzfjt --schemas=["public"] --verbose=true

# Execute custom SQL
mcp0_execute_sql --project_id=tyqpayvbelcfnwiuzfjt --query="SELECT * FROM zones"
```

### Database Reset Workflow
1. **Drop and Recreate Schema**: Apply migration with DROP/CREATE statements
2. **Seed Data**: Apply migration with INSERT statements  
3. **Verify**: Use `mcp0_execute_sql` to run verification queries
4. **Test**: Check `curl http://localhost:3000/health`

## File References

- **Schema Definition**: `CreatingAgentAssets/db/schema.md`
- **Seed Data**: `CreatingAgentAssets/seederZS.txt`
- **Contracts**: `CreatingAgentAssets/contracts/`

## Legacy Scripts (Removed)

The following scripts have been removed as they are now redundant with MCP:

- ~~test-supabase-connection.js~~ → Use MCP health checks
- ~~run-seeder.js~~ → Use `mcp0_apply_migration`
- ~~reset-database.js~~ → Use `mcp0_apply_migration`  
- ~~advanced-reset.js~~ → Use `mcp0_apply_migration`

## Environment Setup

Ensure your `.env.local` contains:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Development Workflow

1. **Schema Changes**: Update `CreatingAgentAssets/db/schema.md`
2. **Apply Migration**: Use `mcp0_apply_migration` with the schema SQL
3. **Update Seeds**: Update `CreatingAgentAssets/seederZS.txt` if needed
4. **Apply Seeds**: Use `mcp0_apply_migration` with seed data
5. **Verify**: Test with health endpoint and MCP queries
