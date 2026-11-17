-- Revierte 003. La función de 9 argumentos de 001 no se toca.
BEGIN;
DROP FUNCTION IF EXISTS public.create_n0_report(UUID, TEXT, UUID, UUID, TEXT, TEXT, TEXT, UUID, TEXT, TEXT);
ALTER TABLE public.alerts DROP CONSTRAINT IF EXISTS alerts_reported_severity_check;
ALTER TABLE public.alerts DROP COLUMN IF EXISTS reported_severity;
COMMIT;
