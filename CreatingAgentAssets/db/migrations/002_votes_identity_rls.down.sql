-- Rollback de 002 · PROPUESTA. Vuelve a dejar las tablas SIN RLS (estado inseguro previo).
BEGIN;
DROP POLICY IF EXISTS nodes_public_read ON public.nodes;
DROP POLICY IF EXISTS zones_public_read ON public.zones;
ALTER TABLE public.zones       DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.nodes       DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts      DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_votes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users_temp  DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users_coord DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.iot_uplinks DISABLE ROW LEVEL SECURITY;
-- Los privilegios revocados NO se restauran automáticamente: re-otorgar solo si el owner lo decide.
DROP INDEX IF EXISTS public.uq_alert_votes_voter;
ALTER TABLE public.alert_votes DROP COLUMN IF EXISTS voter_user_id;
COMMIT;
