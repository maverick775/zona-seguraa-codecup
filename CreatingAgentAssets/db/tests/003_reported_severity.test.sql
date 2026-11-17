\set ON_ERROR_STOP on
-- Pruebas de 003 (urgencia reportada). Corre con 001 y 002 aplicadas.
BEGIN;
INSERT INTO auth.users (id, email) VALUES ('00000000-0000-0000-0000-0000000000d1', 'd@demo.local');

-- U1: RPC de 9 argumentos sigue funcionando y deja la urgencia en NULL
DO $$ DECLARE a jsonb; BEGIN
  SELECT alert INTO a FROM create_n0_report('00000000-0000-0000-0000-0000000000d1', 'D',
    'a1000000-0000-0000-0000-000000000001', NULL, 'fire', NULL, 'es', gen_random_uuid(), 'h1');
  ASSERT a->>'reported_severity' IS NULL, 'U1 urgencia NULL';
  ASSERT (a->>'level')::int = 0 AND a->>'status' = 'active', 'U1 nivel/estado';
  RAISE NOTICE 'U1 ok: RPC de 001 compatible, urgencia NULL';
END $$;

-- U2: RPC de 10 argumentos guarda la urgencia, sin cambiar nivel ni estado; queda en el evento inicial
DO $$ DECLARE a jsonb; v_id uuid; BEGIN
  SELECT alert INTO a FROM create_n0_report('00000000-0000-0000-0000-0000000000d1', 'D',
    'a1000000-0000-0000-0000-000000000001', NULL, 'security', 'x', 'es', 'dddddddd-0000-4000-8000-000000000002', 'h2', 'urgent');
  v_id := (a->>'id')::uuid;
  ASSERT a->>'reported_severity' = 'urgent', 'U2 urgencia guardada';
  ASSERT (a->>'level')::int = 0 AND a->>'status' = 'active', 'U2 urgente sigue siendo N0 abierto';
  ASSERT (SELECT data->>'reported_severity' FROM alert_events WHERE alert_id = v_id AND seq = 1) = 'urgent', 'U2 evento';
  RAISE NOTICE 'U2 ok: urgent guardada; nivel 0 y estado active sin cambio';
END $$;

-- U3: reintento idéntico → replayed; mismo id con otro hash → P0409
DO $$ DECLARE rp boolean; BEGIN
  SELECT replayed INTO rp FROM create_n0_report('00000000-0000-0000-0000-0000000000d1', 'D',
    'a1000000-0000-0000-0000-000000000001', NULL, 'security', 'x', 'es', 'dddddddd-0000-4000-8000-000000000002', 'h2', 'urgent');
  ASSERT rp, 'U3 replayed';
  BEGIN
    PERFORM create_n0_report('00000000-0000-0000-0000-0000000000d1', 'D',
      'a1000000-0000-0000-0000-000000000001', NULL, 'security', 'x', 'es', 'dddddddd-0000-4000-8000-000000000002', 'h2-otro', 'informational');
    RAISE EXCEPTION 'U3 debió fallar';
  EXCEPTION WHEN SQLSTATE 'P0409' THEN RAISE NOTICE 'U3 ok: idempotencia conserva la urgencia original'; END;
END $$;

-- U4: valor fuera de la lista → 22023 en RPC y CHECK en tabla
DO $$ BEGIN
  BEGIN
    PERFORM create_n0_report('00000000-0000-0000-0000-0000000000d1', 'D',
      'a1000000-0000-0000-0000-000000000001', NULL, 'fire', NULL, 'es', gen_random_uuid(), 'h4', 'critica');
    RAISE EXCEPTION 'U4a debió fallar';
  EXCEPTION WHEN SQLSTATE '22023' THEN NULL; END;
  BEGIN
    UPDATE alerts SET reported_severity = 'urgente' WHERE created_by = '00000000-0000-0000-0000-0000000000d1';
    RAISE EXCEPTION 'U4b debió fallar';
  EXCEPTION WHEN check_violation THEN NULL; END;
  RAISE NOTICE 'U4 ok: solo informational, suspicious o urgent';
END $$;

-- U5: transiciones no tocan la urgencia
DO $$ DECLARE v_id uuid; a jsonb; BEGIN
  SELECT id INTO v_id FROM alerts WHERE client_report_id = 'dddddddd-0000-4000-8000-000000000002';
  a := transition_alert(v_id, 'take', 1, '00000000-0000-0000-0000-0000000000c1', NULL, 'K', NULL, NULL, NULL);
  ASSERT (SELECT reported_severity FROM alerts WHERE id = v_id) = 'urgent', 'U5 urgencia intacta';
  RAISE NOTICE 'U5 ok: tomar no cambia la urgencia';
END $$;

-- U6: anon y authenticated no ejecutan la nueva RPC
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  PERFORM create_n0_report('00000000-0000-0000-0000-0000000000d1', 'D',
    'a1000000-0000-0000-0000-000000000001', NULL, 'fire', NULL, 'es', gen_random_uuid(), 'h6', 'urgent');
  RAISE EXCEPTION 'U6 debió fallar';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'U6 ok: authenticated no ejecuta la RPC';
END $$;
RESET ROLE;
ROLLBACK;
