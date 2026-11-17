-- 003_reported_severity.sql — Urgencia REPORTADA por quien crea un N0.
-- Decisión del owner (2026-11-03, tarjeta de decisión): 3 valores de la spec F1
-- (avp3/04-spec-f1-reporte-n0.md, campo reported_severity): informational | suspicious | urgent.
-- Semántica: percepción declarada por quien reporta. NO es nivel (sigue N0), NO es
-- prioridad operativa, NO cambia estado ni dispara avisos. Coordinación la ve; no se valida.
-- Opcional (NULL = no indicada) para no romper reportes existentes ni el RPC de 9 argumentos.
-- Requiere 001 aplicada. Idempotente. NO aplicar en entornos compartidos sin aprobación (S2).
BEGIN;

ALTER TABLE public.alerts ADD COLUMN IF NOT EXISTS reported_severity TEXT;
ALTER TABLE public.alerts DROP CONSTRAINT IF EXISTS alerts_reported_severity_check;
ALTER TABLE public.alerts ADD CONSTRAINT alerts_reported_severity_check
  CHECK (reported_severity IS NULL OR reported_severity IN ('informational', 'suspicious', 'urgent'));
COMMENT ON COLUMN public.alerts.reported_severity IS
  'Urgencia declarada por quien reporta (spec F1). No es nivel ni prioridad operativa.';

-- Sobrecarga con un argumento más. La versión de 9 argumentos de 001 sigue vigente
-- (guarda NULL), así la app actual funciona sin cambios hasta integrar el campo.
CREATE OR REPLACE FUNCTION public.create_n0_report(
  p_user_id           UUID,
  p_actor_label       TEXT,
  p_zone_id           UUID,
  p_node_id           UUID,
  p_type              TEXT,
  p_description       TEXT,
  p_language          TEXT,
  p_client_report_id  UUID,
  p_payload_hash      TEXT,
  p_reported_severity TEXT
) RETURNS TABLE (alert JSONB, replayed BOOLEAN)
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
-- Misma lógica que la versión de 9 argumentos de 001 (idempotencia, zona, nodo,
-- historial en la misma transacción) más la urgencia en la fila y en el evento inicial.
-- alert_events es solo inserción: el dato entra en el INSERT, nunca por UPDATE.
DECLARE
  v_existing public.alerts;
  v_new      public.alerts;
BEGIN
  IF p_user_id IS NULL OR p_client_report_id IS NULL THEN
    RAISE EXCEPTION 'user y client_report_id requeridos' USING ERRCODE = '22023';
  END IF;
  IF p_reported_severity IS NOT NULL AND p_reported_severity NOT IN ('informational', 'suspicious', 'urgent') THEN
    RAISE EXCEPTION 'reported_severity inválida' USING ERRCODE = '22023';
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
                               client_report_id, client_payload_hash, reported_severity)
    VALUES (p_zone_id, p_node_id, p_type, 0, 'active', p_description,
            COALESCE(p_language, 'es'), p_user_id, p_actor_label,
            p_client_report_id, p_payload_hash, p_reported_severity)
    RETURNING * INTO v_new;
  EXCEPTION WHEN unique_violation THEN
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
          jsonb_build_object('level', 0, 'node_id', p_node_id, 'reported_severity', p_reported_severity));

  RETURN QUERY SELECT to_jsonb(v_new), false;
END $$;

REVOKE ALL ON FUNCTION public.create_n0_report(UUID, TEXT, UUID, UUID, TEXT, TEXT, TEXT, UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_n0_report(UUID, TEXT, UUID, UUID, TEXT, TEXT, TEXT, UUID, TEXT, TEXT) TO service_role;

COMMIT;
