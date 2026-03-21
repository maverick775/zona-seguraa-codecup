# Supabase Connection Test

This script tests the connection to your Supabase cloud service using the credentials in your `.env.local` file.

## Setup

1. **Create `.env.local` file** in the `zona-seguraa` directory:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

2. **Install dependencies** (if not already installed):

```bash
cd zona-seguraa
npm install dotenv
```

## Usage

Run the test script from the `zona-seguraa` directory:

```bash
node scripts/test-supabase-connection.js
```

## What the script tests

1. **Environment Variables** - Validates all required Supabase credentials are present
2. **Connection** - Tests both public (anon) and admin (service role) connections
3. **Database Schema** - Verifies all required tables exist and are accessible:
   - zones
   - nodes
   - users
   - alerts
   - votes
   - communities
   - community_members
4. **Seeded Data** - Validates the data from `seederZS.txt`:
   - Chapultepec zone exists
   - All 8 nodes are present with correct types
   - Users and communities are properly seeded
5. **Verification Query** - Runs the same verification query from `seederZS.txt` to confirm data integrity

## Expected Output

If successful, you'll see:
- ✅ Green checkmarks for passed tests
- 📊 A table showing all 8 nodes with their details
- 🎉 Success message at the end

If there are issues, you'll see:
- ❌ Red error messages with specific failure details
- ⚠️ Yellow warnings for non-critical issues
- 💡 Helpful hints for fixing problems

## Troubleshooting

**Missing credentials**: Make sure your `.env.local` file contains all three required variables.

**Connection failed**: Verify your Supabase URL and keys are correct. Check if your project is active.

**Schema errors**: Run the schema creation SQL from `CreatingAgentAssets/db/schema.md` first.

**Missing data**: Run the seed data from `CreatingAgentAssets/seederZS.txt` after creating the schema.
