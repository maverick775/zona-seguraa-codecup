-- Rollback de 001_n0_reports.sql · PROPUESTA, no ejecutar sin aprobación.
-- Falla a propósito si existen alertas con level = 0 (hay que decidir qué hacer con ellas).
BEGIN;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.alerts WHERE level = 0) THEN
    RAISE EXCEPTION 'Hay alertas N0 (level=0); migrarlas o borrarlas antes del rollback';
  END IF;
END $$;
DROP FUNCTION IF EXISTS public.transition_alert(UUID, TEXT, INTEGER, UUID, UUID, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.create_n0_report(UUID, TEXT, UUID, UUID, TEXT, TEXT, TEXT, UUID, TEXT);
DROP TABLE IF EXISTS public.alert_events;
DROP FUNCTION IF EXISTS public.alert_events_block_mutation();
DROP TABLE IF EXISTS public.coordinator_zones;
DROP INDEX IF EXISTS public.uq_alerts_creator_client_report;
DROP INDEX IF EXISTS public.idx_alerts_created_by;
ALTER TABLE public.alerts
  DROP CONSTRAINT IF EXISTS alerts_dismiss_reason_check,
  DROP COLUMN IF EXISTS version,
  DROP COLUMN IF EXISTS dismiss_reason,
  DROP COLUMN IF EXISTS resolution,
  DROP COLUMN IF EXISTS client_payload_hash,
  DROP COLUMN IF EXISTS client_report_id,
  DROP COLUMN IF EXISTS created_by;
ALTER TABLE public.alerts DROP CONSTRAINT IF EXISTS alerts_level_check;
ALTER TABLE public.alerts ADD CONSTRAINT alerts_level_check CHECK (level BETWEEN 1 AND 3);
COMMIT;
