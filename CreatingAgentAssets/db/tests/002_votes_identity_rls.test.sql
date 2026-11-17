\set ON_ERROR_STOP on
BEGIN;
INSERT INTO auth.users (id, email) VALUES ('00000000-0000-0000-0000-0000000000b1', 'b@demo.local');
-- V1: un voto por usuario y alerta
DO $$ DECLARE a uuid; BEGIN
  INSERT INTO alerts (zone_id, type) VALUES ('a1000000-0000-0000-0000-000000000001', 'fire') RETURNING id INTO a;
  INSERT INTO alert_votes (alert_id, voter_user_id, nickname, role, weight) VALUES (a, '00000000-0000-0000-0000-0000000000b1', 'B', 'visitor', 1);
  BEGIN
    INSERT INTO alert_votes (alert_id, voter_user_id, nickname, role, weight) VALUES (a, '00000000-0000-0000-0000-0000000000b1', 'B2', 'coordinator', 2);
    RAISE EXCEPTION 'V1 debió fallar';
  EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'V1 ok: voto duplicado rechazado'; END;
END $$;
SAVEPOINT s;

-- V2: anon no puede escribir ni leer alertas; sí lee zonas y nodos activos
SET LOCAL ROLE anon;
DO $$ BEGIN
  ASSERT (SELECT count(*) FROM zones) = 3, 'V2 zonas visibles';
  ASSERT (SELECT count(*) FROM nodes) >= 1, 'V2 nodos visibles';
  ASSERT (SELECT count(*) FROM alerts) = 0, 'V2 alerts invisibles para anon';
  ASSERT (SELECT count(*) FROM alert_votes) = 0, 'V2 votos invisibles para anon';
  RAISE NOTICE 'V2 ok: lectura anon limitada a catálogo';
END $$;
DO $$ BEGIN
  INSERT INTO alerts (zone_id, type) VALUES ('a1000000-0000-0000-0000-000000000001', 'fire');
  RAISE EXCEPTION 'V3 debió fallar';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'V3 ok: anon no inserta alerts';
END $$;
DO $$ BEGIN
  UPDATE alerts SET status = 'resolved';
  RAISE EXCEPTION 'V4 debió fallar';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'V4 ok: anon no actualiza alerts';
END $$;
DO $$ BEGIN
  INSERT INTO alert_votes (alert_id, nickname, role, weight) SELECT gen_random_uuid(), 'x', 'coordinator', 2;
  RAISE EXCEPTION 'V5 debió fallar';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'V5 ok: anon no inserta votos';
END $$;
RESET ROLE;
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  INSERT INTO alert_events (alert_id, seq, action, to_status, actor_role) SELECT id, 99, 'report.closed', 'resolved', 'coordinator' FROM alerts LIMIT 1;
  RAISE EXCEPTION 'V6 debió fallar';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'V6 ok: authenticated no escribe historial';
END $$;
DO $$ BEGIN
  INSERT INTO users_coord (email) VALUES ('yo-soy-coord@evil.test');
  RAISE EXCEPTION 'V7 debió fallar';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'V7 ok: authenticated no se autoasigna coordinador';
END $$;
RESET ROLE;
ROLLBACK;
