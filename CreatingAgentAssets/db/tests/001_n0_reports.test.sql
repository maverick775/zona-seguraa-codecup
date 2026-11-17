-- Pruebas de 001_n0_reports.sql. Se ejecutan con ON_ERROR_STOP en una BD local desechable.
\set ON_ERROR_STOP on
BEGIN;
INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-0000000000a1', 'residente@demo.local'),
  ('00000000-0000-0000-0000-0000000000c1', 'coord@demo.local');
INSERT INTO users_coord (id, email) VALUES ('00000000-0000-0000-0000-00000000cc01', 'coord@demo.local');
INSERT INTO coordinator_zones (coord_id, zone_id) VALUES
  ('00000000-0000-0000-0000-00000000cc01', 'a1000000-0000-0000-0000-000000000001');

-- T1: crear N0 sin nodo
CREATE TEMP TABLE r AS SELECT * FROM create_n0_report(
  '00000000-0000-0000-0000-0000000000a1', 'Residente Demo',
  'a1000000-0000-0000-0000-000000000001', NULL, 'security', 'Persona sospechosa', 'es',
  '11111111-1111-4111-8111-111111111111', 'hashA');
DO $$ DECLARE a jsonb; rp boolean; BEGIN
  SELECT alert, replayed INTO a, rp FROM r;
  ASSERT (a->>'level')::int = 0, 'T1 level debe ser 0';
  ASSERT a->>'node_id' IS NULL, 'T1 node_id debe ser NULL';
  ASSERT NOT rp, 'T1 no es reintento';
  ASSERT (SELECT count(*) FROM alert_events WHERE alert_id = (a->>'id')::uuid) = 1, 'T1 1 evento';
  RAISE NOTICE 'T1 ok: N0 creado sin nodo con evento seq 1';
END $$;

-- T2: reintento idéntico → mismo id, replayed, sin evento nuevo
DO $$ DECLARE a jsonb; rp boolean; orig uuid; BEGIN
  SELECT (alert->>'id')::uuid INTO orig FROM r;
  SELECT alert, replayed INTO a, rp FROM create_n0_report(
    '00000000-0000-0000-0000-0000000000a1', 'Residente Demo',
    'a1000000-0000-0000-0000-000000000001', NULL, 'security', 'Persona sospechosa', 'es',
    '11111111-1111-4111-8111-111111111111', 'hashA');
  ASSERT (a->>'id')::uuid = orig AND rp, 'T2 debe devolver el original';
  ASSERT (SELECT count(*) FROM alerts WHERE created_by='00000000-0000-0000-0000-0000000000a1') = 1, 'T2 sin duplicado';
  ASSERT (SELECT count(*) FROM alert_events WHERE alert_id = orig) = 1, 'T2 sin evento nuevo';
  RAISE NOTICE 'T2 ok: reintento idéntico idempotente';
END $$;

-- T3: misma clave, otro cuerpo → P0409
DO $$ BEGIN
  PERFORM create_n0_report('00000000-0000-0000-0000-0000000000a1', 'Residente Demo',
    'a1000000-0000-0000-0000-000000000001', NULL, 'fire', 'otro', 'es',
    '11111111-1111-4111-8111-111111111111', 'hashB');
  RAISE EXCEPTION 'T3 debió fallar';
EXCEPTION WHEN SQLSTATE 'P0409' THEN RAISE NOTICE 'T3 ok: idempotency-mismatch';
END $$;

-- T4: zona inexistente y nodo de otra zona → P0002
DO $$ BEGIN
  PERFORM create_n0_report('00000000-0000-0000-0000-0000000000a1', 'R',
    'ffffffff-0000-0000-0000-000000000000', NULL, 'fire', NULL, 'es', gen_random_uuid(), 'h');
  RAISE EXCEPTION 'T4a debió fallar';
EXCEPTION WHEN SQLSTATE 'P0002' THEN RAISE NOTICE 'T4a ok: zona inexistente';
END $$;
DO $$ DECLARE other_node uuid; BEGIN
  SELECT id INTO other_node FROM nodes WHERE zone_id <> 'a1000000-0000-0000-0000-000000000001' LIMIT 1;
  IF other_node IS NULL THEN RAISE NOTICE 'T4b omitida: seed sin nodos en otra zona'; RETURN; END IF;
  PERFORM create_n0_report('00000000-0000-0000-0000-0000000000a1', 'R',
    'a1000000-0000-0000-0000-000000000001', other_node, 'fire', NULL, 'es', gen_random_uuid(), 'h');
  RAISE EXCEPTION 'T4b debió fallar';
EXCEPTION WHEN SQLSTATE 'P0002' THEN RAISE NOTICE 'T4b ok: nodo de otra zona';
END $$;

-- T5: transiciones con versión
DO $$ DECLARE v_id uuid; a jsonb; BEGIN
  SELECT (alert->>'id')::uuid INTO v_id FROM r;
  -- close desde active → inválida
  BEGIN PERFORM transition_alert(v_id, 'close', 1, NULL, NULL, 'K', 'x', NULL, NULL);
    RAISE EXCEPTION 'T5a debió fallar';
  EXCEPTION WHEN SQLSTATE 'P0422' THEN RAISE NOTICE 'T5a ok: close desde active es inválida'; END;
  a := transition_alert(v_id, 'take', 1, '00000000-0000-0000-0000-0000000000c1',
                        '00000000-0000-0000-0000-00000000cc01', 'Coord', NULL, NULL, NULL);
  ASSERT a->>'status' = 'in_progress' AND (a->>'version')::int = 2, 'T5b take';
  ASSERT a->>'attended_by' = '00000000-0000-0000-0000-00000000cc01', 'T5b attended_by';
  -- versión vieja → conflicto
  BEGIN PERFORM transition_alert(v_id, 'close', 1, NULL, NULL, 'K', 'x', NULL, NULL);
    RAISE EXCEPTION 'T5c debió fallar';
  EXCEPTION WHEN SQLSTATE 'P0409' THEN RAISE NOTICE 'T5c ok: version-conflict'; END;
  -- close sin resolución → 22023
  BEGIN PERFORM transition_alert(v_id, 'close', 2, NULL, NULL, 'K', '  ', NULL, NULL);
    RAISE EXCEPTION 'T5d debió fallar';
  EXCEPTION WHEN SQLSTATE '22023' THEN RAISE NOTICE 'T5d ok: resolución requerida'; END;
  a := transition_alert(v_id, 'close', 2, '00000000-0000-0000-0000-0000000000c1', NULL, 'Coord', 'Se atendió', NULL, NULL);
  ASSERT a->>'status' = 'resolved' AND a->>'resolution' = 'Se atendió' AND a->>'resolved_at' IS NOT NULL, 'T5e close';
  ASSERT (SELECT string_agg(action || ':' || COALESCE(from_status,'-') || '>' || to_status, ',' ORDER BY seq)
            FROM alert_events WHERE alert_id = v_id)
         = 'report.created:->active,report.taken:active>in_progress,report.closed:in_progress>resolved', 'T5f historial';
  RAISE NOTICE 'T5 ok: take → close con historial de 3 eventos';
END $$;

-- T6: dismiss
DO $$ DECLARE a jsonb; BEGIN
  SELECT alert INTO a FROM create_n0_report('00000000-0000-0000-0000-0000000000a1', 'R',
    'a1000000-0000-0000-0000-000000000001', NULL, 'medical', NULL, 'es', gen_random_uuid(), 'h2');
  BEGIN PERFORM transition_alert((a->>'id')::uuid, 'dismiss', 1, NULL, NULL, 'K', NULL, NULL, NULL);
    RAISE EXCEPTION 'T6a debió fallar';
  EXCEPTION WHEN SQLSTATE '22023' THEN NULL; END;
  BEGIN PERFORM transition_alert((a->>'id')::uuid, 'dismiss', 1, NULL, NULL, 'K', NULL, 'inventado', NULL);
    RAISE EXCEPTION 'T6b debió fallar';
  EXCEPTION WHEN check_violation THEN NULL; END;
  a := transition_alert((a->>'id')::uuid, 'dismiss', 1, NULL, NULL, 'K', NULL, 'duplicate', NULL);
  ASSERT a->>'status' = 'false_alarm' AND a->>'dismiss_reason' = 'duplicate', 'T6 dismiss';
  RAISE NOTICE 'T6 ok: dismiss exige motivo válido';
END $$;

-- T7: alert_events es solo inserción (también para service_role)
DO $$ BEGIN
  UPDATE alert_events SET to_status = 'x';
  RAISE EXCEPTION 'T7a debió fallar';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'T7a ok: UPDATE bloqueado';
END $$;
DO $$ BEGIN
  DELETE FROM alert_events;
  RAISE EXCEPTION 'T7b debió fallar';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'T7b ok: DELETE bloqueado';
END $$;

-- T8: anon/authenticated no pueden ejecutar las RPC ni leer alert_events
DO $$ BEGIN
  ASSERT NOT has_function_privilege('anon', 'create_n0_report(uuid,text,uuid,uuid,text,text,text,uuid,text)', 'EXECUTE'), 'T8 anon rpc';
  ASSERT NOT has_function_privilege('authenticated', 'transition_alert(uuid,text,integer,uuid,uuid,text,text,text,text)', 'EXECUTE'), 'T8 auth rpc';
  ASSERT has_function_privilege('service_role', 'create_n0_report(uuid,text,uuid,uuid,text,text,text,uuid,text)', 'EXECUTE'), 'T8 service rpc';
  ASSERT NOT has_table_privilege('anon', 'alert_events', 'SELECT'), 'T8 anon events';
  RAISE NOTICE 'T8 ok: privilegios';
END $$;

-- T9: inserts legados siguen funcionando (level por defecto 1, nivel 4 rechazado)
DO $$ BEGIN
  INSERT INTO alerts (zone_id, type) VALUES ('a1000000-0000-0000-0000-000000000001', 'fire');
  BEGIN INSERT INTO alerts (zone_id, type, level) VALUES ('a1000000-0000-0000-0000-000000000001', 'fire', 4);
    RAISE EXCEPTION 'T9 debió fallar';
  EXCEPTION WHEN check_violation THEN NULL; END;
  RAISE NOTICE 'T9 ok: compatibilidad con inserts legados';
END $$;
ROLLBACK;
