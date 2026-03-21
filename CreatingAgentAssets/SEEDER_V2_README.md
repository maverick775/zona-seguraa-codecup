# Database Seeder v2.0 - Documentation

## Overview

Updated seeder file with schema alignment, transaction support, and comprehensive testing controls for safe database seeding.

**Files:**
- `seederZS_v2.sql` - Updated seeder (use this one)
- `seederZS_v1_backup.txt` - Original backup
- `seederZS.txt` - Original (kept for reference)

---

## Major Changes from v1.0

### 1. ✅ Schema Alignment (Critical Fix)
**Problem:** Original seeder referenced `lat`/`lng` columns in zones table that don't exist in the actual database schema.

**Solution:** Removed `lat` and `lng` columns from zones INSERT statement. These coordinates are stored in nodes table instead.

### 2. ✅ Transaction Support
**Added:** Full transaction wrapping (BEGIN/COMMIT/ROLLBACK)

**Benefits:**
- All operations succeed or all fail (atomicity)
- Prevents partial data corruption
- Enables safe dry-run testing

### 3. ✅ Pre-Validation Checks
**Added comprehensive pre-seed validation:**
- Table existence verification
- Current data counts
- Zone existence check
- Clear status messages

### 4. ✅ Post-Validation Checks
**Added comprehensive post-seed validation:**
- Zone data verification
- Node count validation (expects 8)
- Node type validation (expects 6 types)
- User count validation (expects 3)
- Community members validation
- Detailed node report

### 5. ✅ Dry-Run Mode
**Added instructions for safe testing:**
- Comment/uncomment ROLLBACK vs COMMIT
- Test entire seeder without saving changes
- Verify no errors before production run

### 6. ✅ Rollback Controls
**Added complete rollback SQL:**
- Reverse order deletion to avoid constraint errors
- Can reset database to pre-seed state
- Clear instructions in comments

---

## Quick Start Guide

### Step 1: Dry-Run Test (Recommended First)
```sql
-- 1. Open seederZS_v2.sql in Supabase SQL Editor
-- 2. Ensure ROLLBACK is uncommented at the bottom
-- 3. Ensure COMMIT is commented out
-- 4. Run the script
-- 5. Check output - should show no errors
-- 6. Verify data was NOT saved (this is expected in dry-run)
```

### Step 2: Production Execution
```sql
-- 1. Ensure COMMIT is uncommented
-- 2. Ensure ROLLBACK is commented out
-- 3. Run the script
-- 4. Review post-validation output
-- 5. All checks should show ✅
```

### Step 3: Verify Installation
```sql
-- Run the verification query at the end of the seeder
-- Should show:
-- - 1 zone (Corredor Chapultepec)
-- - 8 nodes with correct types
-- - 3 users (2 coordinators, 1 ally)
-- - 1 community with 3 members
```

---

## Rollback Instructions

### If you need to reset the database:

**Option 1: Use the built-in rollback (Recommended)**
```sql
-- Copy the ROLLBACK INSTRUCTIONS section from the end of seederZS_v2.sql
-- Uncomment and execute the SQL block
```

**Option 2: Manual reset**
```sql
DELETE FROM community_members WHERE community_id = 'd1000000-0000-0000-0000-000000000001';
DELETE FROM communities WHERE id = 'd1000000-0000-0000-0000-000000000001';
DELETE FROM users WHERE zone_id = 'a1000000-0000-0000-0000-000000000001';
DELETE FROM nodes WHERE zone_id = 'a1000000-0000-0000-0000-000000000001';
DELETE FROM zones WHERE slug = 'chapultepec';
```

**Option 3: Restore from Supabase backup**
- Use Supabase Dashboard → Database → Backups
- Restore to point before seeding

---

## Expected Validation Output

### Pre-Seed Check
```
✅ All required tables present
zones: 1 (or 0)
nodes: 8 (or 0)
users: 3 (or 0)
communities: 1 (or 0)
```

### Post-Seed Check
```
✅ Zone OK
✅ All 8 nodes present
✅ All node types present
✅ All 3 users present
✅ Community with 3 members OK
```

---

## Troubleshooting

### Issue: "column lat does not exist"
**Cause:** Using old seeder with mismatched schema
**Solution:** Use `seederZS_v2.sql` instead

### Issue: "unique constraint violation"
**Cause:** Data already exists
**Solution:** Use ON CONFLICT UPDATE (already in v2) or run rollback first

### Issue: "foreign key constraint fails"
**Cause:** Trying to delete in wrong order
**Solution:** Use the provided rollback SQL (deletes in correct order)

### Issue: Schema cache errors in scripts
**Cause:** Supabase schema cache outdated
**Solution:** 
1. Go to Supabase Dashboard → Database → Extensions
2. Click "Refresh cache" button
3. Or wait 1-2 minutes and retry

---

## Data Structure

### Zones (1)
- **ID:** a1000000-0000-0000-0000-000000000001
- **Slug:** chapultepec
- **Name:** Corredor Chapultepec — Zona Centro GDL

### Nodes (8)
| ID | Name | Type | Position |
|----|------|------|----------|
| b1000000-0000-0000-0000-000000000001 | AVP3-Alfa-01 — Glorieta Chapultepec | avp_physical | 50, 50 |
| b1000000-0000-0000-0000-000000000002 | Tramo Norte — Av. Libertad | avp_simulated | 50, 10 |
| b1000000-0000-0000-0000-000000000003 | Tramo Sur — Niños Héroes | avp_simulated | 50, 90 |
| b1000000-0000-0000-0000-000000000004 | Plaza de Bolsillo Este | checkpoint | 85, 45 |
| b1000000-0000-0000-0000-000000000005 | Zona de Terrazas Oeste | checkpoint | 15, 55 |
| b1000000-0000-0000-0000-000000000006 | Punto Médico — Cruz Verde | medical_point | 25, 30 |
| b1000000-0000-0000-0000-000000000007 | Acceso Principal — Cruce Juárez | exit | 50, 2 |
| b1000000-0000-0000-0000-000000000008 | Salida de Emergencia — Lateral Poniente | emergency_exit | 10, 80 |

### Users (3)
- **coord_zapopan_01** - coordinator
- **coord_chapultepec_02** - coordinator
- **aliado_demo_01** - ally

### Communities (1)
- **Vecinos Chapultepec** with 3 members (2 admin, 1 ally)

---

## Version History

### v2.0 (Current)
- ✅ Schema alignment (removed lat/lng from zones)
- ✅ Transaction support (BEGIN/COMMIT/ROLLBACK)
- ✅ Pre-validation checks
- ✅ Post-validation checks
- ✅ Dry-run mode instructions
- ✅ Rollback controls

### v1.0 (Backup: seederZS_v1_backup.txt)
- Original seeder
- Schema mismatch (lat/lng in zones)
- No transaction support
- No validation checks

---

## Next Steps

1. **Test the new seeder:** Run dry-run mode first
2. **Validate output:** Check all ✅ in post-validation
3. **Start development:** Use `npm run dev` in zona-seguraa folder
4. **Test application:** Verify data loads correctly

For issues or questions, refer to the validation output or run the test-supabase-connection.js script.
