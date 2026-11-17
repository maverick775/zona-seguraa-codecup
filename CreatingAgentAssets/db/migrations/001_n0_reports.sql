-- ============================================================
-- 001_n0_reports.sql · Signalarm App (prototipo zona-seguraa)
-- Estado: PROPUESTA — pendiente de revisión del owner.
-- NO ejecutar contra Supabase compartido ni producción sin aprobación.
--
-- Objetivo: soportar reportes ciudadanos N0 autenticados, idempotentes y
-- con historial (auditoría) de cada transición del coordinador.
--
-- Impacto sobre lo existente:
--   * alerts.level pasa de CHECK 1..3 a CHECK 0..3 (N0 = reporte sin validar).
--     Filas existentes no cambian. El DEFAULT sigue en 1 (POST /api/alerts legado).
--   * Columnas nuevas en alerts, todas NULL-ables: no rompen inserts actuales.
--   * alerts.version (concurrencia optimista; 409 si cambió).
--   * Tablas nuevas alert_events (solo inserción) y coordinator_zones
--     (zonas que cada coordinador puede ver y gestionar), y 2 funciones RPC.
--   * Modelo INTERINO: Sprint 2 lo sustituye por incidents/signals/audit_log
--     con hash encadenado y organization_id (ver avp3/08-sprints...).
--   * Las funciones solo se conceden a service_role: la app las llama desde
--     API routes después de verificar identidad y rol.
--
-- Precondición a verificar en el proyecto desplegado ANTES de aplicar:
--   SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
--    WHERE conrelid = 'public.alerts'::regclass AND contype = 'c';
--   (El bloque DO de abajo elimina cualquier CHECK que mencione "level".)
--
-- Rollback: ver 001_n0_reports.down.sql
-- ============================================================

BEGIN;

-- 1. Nivel 0 permitido -------------------------------------------------------
DO $$
DECLARE c record;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
     WHERE conrelid = 'public.alerts'::regclass
       AND contype = 'c'
       AND pg_get_constraintdef(oid) ILIKE '%level%'
  LOOP
    EXECUTE format('ALTER TABLE public.alerts DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE public.alerts
  ADD CONSTRAINT alerts_level_check CHECK (level BETWEEN 0 AND 3);

-- 2. Identidad, idempotencia y cierre ---------------------------------------
ALTER TABLE public.alerts
  ADD COLUMN IF NOT EXISTS created_by          UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS client_report_id    UUID,
  ADD COLUMN IF NOT EXISTS client_payload_hash TEXT,
  ADD COLUMN IF NOT EXISTS resolution          TEXT,
  ADD COLUMN IF NOT EXISTS dismiss_reason      TEXT,
  ADD COLUMN IF NOT EXISTS version             INTEGER NOT NULL DEFAULT 1;

ALTER TABLE public.alerts DROP CONSTRAINT IF EXISTS alerts_dismiss_reason_check;
ALTER TABLE public.alerts
  ADD CONSTRAINT alerts_dismiss_reason_check
  CHECK (dismiss_reason IS NULL OR dismiss_reason IN
         ('false_report', 'duplicate', 'not_actionable', 'other'));

CREATE UNIQUE INDEX IF NOT EXISTS uq_alerts_creator_client_report
  ON public.alerts (created_by, client_report_id)
  WHERE client_report_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_alerts_created_by ON public.alerts (created_by);

-- 2b. Zonas asignadas a cada coordinador -----------------------------------
-- Un coordinador sin filas aquí no ve ningún reporte (cerrado por defecto).
CREATE TABLE IF NOT EXISTS public.coordinator_zones (
  coord_id   UUID NOT NULL REFERENCES public.users_coord(id) ON DELETE CASCADE,
  zone_id    UUID NOT NULL REFERENCES public.zones(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (coord_id, zone_id)
);
ALTER TABLE public.coordinator_zones ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.coordinator_zones FROM anon, authenticated;

-- 3. Historial de eventos (solo inserción) -----------------------------------
CREATE TABLE IF NOT EXISTS public.alert_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id      UUID NOT NULL REFERENCES public.alerts(id) ON DELETE CASCADE,
  seq           INTEGER NOT NULL CHECK (seq >= 1),
  action        TEXT NOT NULL CHECK (action IN
                  ('report.created', 'report.taken', 'report.closed', 'report.dismissed')),
  from_status   TEXT,
  to_status     TEXT NOT NULL,
  actor_user_id UUID,
  actor_role    TEXT NOT NULL CHECK (actor_role IN ('resident', 'coordinator', 'system')),
  actor_label   TEXT,
  data          JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (alert_id, seq)
);

CREATE INDEX IF NOT EXISTS idx_alert_events_alert ON public.alert_events (alert_id, seq);

CREATE OR REPLACE FUNCTION public.alert_events_block_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'alert_events es solo inserción' USING ERRCODE = '42501';
END $$;

DROP TRIGGER IF EXISTS trg_alert_events_immutable ON public.alert_events;
CREATE TRIGGER trg_alert_events_immutable
  BEFORE UPDATE OR DELETE ON public.alert_events
  FOR EACH ROW EXECUTE FUNCTION public.alert_events_block_mutation();

-- Sin políticas: anon/authenticated no pueden leer ni escribir vía PostgREST.
ALTER TABLE public.alert_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.alert_events FROM anon, authenticated;

-- 4. RPC: crear reporte N0 (transacción única) -------------------------------
-- Devuelve la fila de alerts y replayed=true si es un reintento idéntico.
-- Errores (SQLSTATE → HTTP en la API):
--   P0002 zona/nodo no encontrado → 404/400 · P0409 idempotency-mismatch → 409
CREATE OR REPLACE FUNCTION public.create_n0_report(
  p_user_id          UUID,
  p_actor_label      TEXT,
  p_zone_id          UUID,
  p_node_id          UUID,
  p_type             TEXT,
  p_description      TEXT,
  p_language         TEXT,
  p_client_report_id UUID,
  p_payload_hash     TEXT
) RETURNS TABLE (alert JSONB, replayed BOOLEAN)
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_existing public.alerts;
  v_new      public.alerts;
BEGIN
  IF p_user_id IS NULL OR p_client_report_id IS NULL THEN
    RAISE EXCEPTION 'user y client_report_id requeridos' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_existing FROM public.alerts
   WHERE created_by = p_user_id AND client_report_id = p_client_report_id;
  IF FOUND THEN
    IF v_existing.client_payload_hash IS DISTINCT FROM p_payload_hash THEN
      RAISE EXCEPTION 'idempotency-mismatch' USING ERRCODE = 'P0409';
    END IF;
    RETURN QUERY SELECT to_jsonb(v_existing), true;
    RETURN;
  END IF;

  PERFORM 1 FROM public.zones WHERE id = p_zone_id AND active;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'zone-not-found' USING ERRCODE = 'P0002';
  END IF;

  IF p_node_id IS NOT NULL THEN
    PERFORM 1 FROM public.nodes WHERE id = p_node_id AND zone_id = p_zone_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'node-not-in-zone' USING ERRCODE = 'P0002';
    END IF;
  END IF;

  BEGIN
    INSERT INTO public.alerts (zone_id, node_id, type, level, status, description,
                               language, created_by, created_by_nick,
                               client_report_id, client_payload_hash)
    VALUES (p_zone_id, p_node_id, p_type, 0, 'active', p_description,
            COALESCE(p_language, 'es'), p_user_id, p_actor_label,
            p_client_report_id, p_payload_hash)
    RETURNING * INTO v_new;
  EXCEPTION WHEN unique_violation THEN
    -- Carrera entre dos envíos simultáneos con la misma clave.
    SELECT * INTO v_existing FROM public.alerts
     WHERE created_by = p_user_id AND client_report_id = p_client_report_id;
    IF v_existing.client_payload_hash IS DISTINCT FROM p_payload_hash THEN
      RAISE EXCEPTION 'idempotency-mismatch' USING ERRCODE = 'P0409';
    END IF;
    RETURN QUERY SELECT to_jsonb(v_existing), true;
    RETURN;
  END;

  INSERT INTO public.alert_events (alert_id, seq, action, from_status, to_status,
                                   actor_user_id, actor_role, actor_label, data)
  VALUES (v_new.id, 1, 'report.created', NULL, 'active',
          p_user_id, 'resident', p_actor_label,
          jsonb_build_object('level', 0, 'node_id', p_node_id));

  RETURN QUERY SELECT to_jsonb(v_new), false;
END $$;

-- 5. RPC: transición del coordinador (transacción única) ---------------------
-- Errores: P0002 no encontrado → 404 · P0422 invalid-transition → 422
--          22023 datos faltantes → 400
CREATE OR REPLACE FUNCTION public.transition_alert(
  p_alert_id       UUID,
  p_action         TEXT,
  p_expected_version INTEGER,
  p_actor_user_id  UUID,
  p_actor_coord_id UUID,
  p_actor_label    TEXT,
  p_resolution     TEXT,
  p_dismiss_reason TEXT,
  p_note           TEXT
) RETURNS JSONB
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_alert public.alerts;
  v_to    TEXT;
  v_seq   INTEGER;
  v_event TEXT;
  v_from  TEXT;
BEGIN
  SELECT * INTO v_alert FROM public.alerts WHERE id = p_alert_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'not-found' USING ERRCODE = 'P0002';
  END IF;

  IF p_expected_version IS NULL OR v_alert.version <> p_expected_version THEN
    RAISE EXCEPTION 'version-conflict:%', v_alert.version USING ERRCODE = 'P0409';
  END IF;
  v_from := v_alert.status;

  IF p_action = 'take' AND v_alert.status = 'active' THEN
    v_to := 'in_progress'; v_event := 'report.taken';
  ELSIF p_action = 'close' AND v_alert.status = 'in_progress' THEN
    IF COALESCE(length(trim(p_resolution)), 0) = 0 THEN
      RAISE EXCEPTION 'resolution requerida' USING ERRCODE = '22023';
    END IF;
    v_to := 'resolved'; v_event := 'report.closed';
  ELSIF p_action = 'dismiss' AND v_alert.status IN ('active', 'in_progress') THEN
    IF p_dismiss_reason IS NULL THEN
      RAISE EXCEPTION 'dismiss_reason requerido' USING ERRCODE = '22023';
    END IF;
    v_to := 'false_alarm'; v_event := 'report.dismissed';
  ELSE
    RAISE EXCEPTION 'invalid-transition:%:%', p_action, v_alert.status USING ERRCODE = 'P0422';
  END IF;

  UPDATE public.alerts SET
    status         = v_to,
    updated_at     = NOW(),
    attended_by    = CASE WHEN p_action = 'take' THEN COALESCE(p_actor_coord_id, attended_by)
                          ELSE attended_by END,
    resolution     = CASE WHEN p_action = 'close' THEN p_resolution ELSE resolution END,
    dismiss_reason = CASE WHEN p_action = 'dismiss' THEN p_dismiss_reason ELSE dismiss_reason END,
    resolved_at    = CASE WHEN p_action IN ('close', 'dismiss') THEN NOW() ELSE resolved_at END,
    version        = version + 1
  WHERE id = p_alert_id
  RETURNING * INTO v_alert;

  SELECT COALESCE(MAX(seq), 0) + 1 INTO v_seq
    FROM public.alert_events WHERE alert_id = p_alert_id;

  INSERT INTO public.alert_events (alert_id, seq, action, from_status, to_status,
                                   actor_user_id, actor_role, actor_label, data)
  VALUES (p_alert_id, v_seq, v_event,
          v_from,
          v_to, p_actor_user_id, 'coordinator', p_actor_label,
          jsonb_strip_nulls(jsonb_build_object(
            'resolution', CASE WHEN p_action = 'close' THEN p_resolution END,
            'dismiss_reason', p_dismiss_reason,
            'note', p_note)));

  RETURN to_jsonb(v_alert);
END $$;

REVOKE ALL ON FUNCTION public.create_n0_report(UUID, TEXT, UUID, UUID, TEXT, TEXT, TEXT, UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.transition_alert(UUID, TEXT, INTEGER, UUID, UUID, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_n0_report(UUID, TEXT, UUID, UUID, TEXT, TEXT, TEXT, UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.transition_alert(UUID, TEXT, INTEGER, UUID, UUID, TEXT, TEXT, TEXT, TEXT) TO service_role;

COMMIT;
