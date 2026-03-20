-- ============================================================
-- Reset all schema objects and recreate with latest schema.sql
-- Run this from CreatingAgentAssets/db
-- ============================================================

DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

\i schema.sql