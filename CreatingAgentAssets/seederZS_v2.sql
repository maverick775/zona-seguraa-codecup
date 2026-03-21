-- ============================================================
-- SEED DATA · Zona SeguRAA · CodeCup 2026
-- Venue: Corredor Chapultepec — Zona Centro de Guadalajara
-- Version: 2.0 (Schema-Aligned with Transaction Support)
-- ============================================================

-- ============================================================
-- EXECUTION INSTRUCTIONS
-- ============================================================
-- 1. DRY-RUN MODE (Safe Testing):
--    - Uncomment ROLLBACK at the end
--    - Comment out COMMIT
--    - Run the script - no changes will be saved
--    - Check output for errors
--
-- 2. PRODUCTION EXECUTION:
--    - Ensure ROLLBACK is commented out
--    - Ensure COMMIT is uncommented
--    - Run the script
--
-- 3. ROLLBACK/RESET:
--    - See "ROLLBACK INSTRUCTIONS" section at the end
--    - Or restore from Supabase backup
-- ============================================================

-- ============================================================
-- 0. PRE-VALIDATION CHECKS
-- ============================================================
-- Check current database state before seeding

SELECT 'PRE-SEED VALIDATION' as check_type, NOW() as timestamp;

-- Check if required tables exist
SELECT 
  COUNT(*) as tables_found,
  CASE 
    WHEN COUNT(*) = 7 THEN '✅ All required tables present'
    ELSE '❌ Missing tables - run schema.sql first'
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('zones', 'nodes', 'users', 'alerts', 'votes', 'communities', 'community_members');

-- Check existing data (will show what exists before seeding)
SELECT 'zones' as table_name, COUNT(*) as count FROM zones
UNION ALL SELECT 'nodes', COUNT(*) FROM nodes
UNION ALL SELECT 'users', COUNT(*) FROM users
UNION ALL SELECT 'communities', COUNT(*) FROM communities
UNION ALL SELECT 'community_members', COUNT(*) FROM community_members;

-- Check if chapultepec zone already exists
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM zones WHERE slug = 'chapultepec') 
    THEN '⚠️  Chapultepec zone exists - will be updated'
    ELSE '✅ Chapultepec zone not found - will be created'
  END as zone_status;

-- ============================================================
-- BEGIN TRANSACTION
-- ============================================================
-- This ensures all operations succeed or all fail (atomicity)

BEGIN;

-- ============================================================
-- 1. ZONA: Corredor Chapultepec
-- ============================================================
-- NOTE: lat/lng columns removed - actual DB schema doesn't include them
-- GPS coordinates are stored in nodes table instead

INSERT INTO zones (
  id,
  slug,
  name,
  description,
  city,
  active
) VALUES (
  'a1000000-0000-0000-0000-000000000001',
  'chapultepec',
  'Corredor Chapultepec — Zona Centro GDL',
  'Corredor peatonal y cultural de libre acceso en la Zona Centro de Guadalajara. Flujo ciudadano distribuido 24/7. Zona de demostración del sistema Zona SeguRAA para CodeCup 2026.',
  'Guadalajara',
  true
)
ON CONFLICT (slug) DO UPDATE SET
  name        = EXCLUDED.name,
  description = EXCLUDED.description,
  active      = EXCLUDED.active;


-- ============================================================
-- 2. NODOS (8 total)
-- Coordenadas GPS: a lo largo del Corredor Chapultepec real
-- pos_x / pos_y: posición % en overlay de imagen (0=izquierda/arriba, 100=derecha/abajo)
-- ============================================================

INSERT INTO nodes (
  id,
  zone_id,
  name,
  type,
  pos_x, pos_y,
  lat, lng,
  lorawan_eui,
  status,
  battery_pct,
  last_seen_at
) VALUES

  -- ──────────────────────────────────────────────────────────
  -- NODO 1: AVP3-ALFA (FÍSICO — conectado al Pico 2 + RFM95W)
  -- 🔧 UPDATE: lorawan_eui con el DevEUI real del dispositivo en Loriot
  -- ──────────────────────────────────────────────────────────
  (
    'b1000000-0000-0000-0000-000000000001',
    'a1000000-0000-0000-0000-000000000001',
    'AVP3-Alfa-01 — Glorieta Chapultepec',
    'avp_physical',
    50.0, 50.0,
    20.67320, -103.36850,     -- GPS: Glorieta Chapultepec (centro del corredor)
    'DUMMY-EUI-0000000001',   -- 🔧 UPDATE con DevEUI real del Pico 2
    'online',
    100,
    NOW()
  ),

  -- ──────────────────────────────────────────────────────────
  -- NODO 2: Tramo Norte — Av. Chapultepec / Libertad (simulado)
  -- ──────────────────────────────────────────────────────────
  (
    'b1000000-0000-0000-0000-000000000002',
    'a1000000-0000-0000-0000-000000000001',
    'Tramo Norte — Av. Libertad',
    'avp_simulated',
    50.0, 10.0,
    20.67580, -103.36750,
    NULL,
    'online',
    NULL,
    NULL
  ),

  -- ──────────────────────────────────────────────────────────
  -- NODO 3: Tramo Sur — Av. Chapultepec / Niños Héroes (simulado)
  -- ──────────────────────────────────────────────────────────
  (
    'b1000000-0000-0000-0000-000000000003',
    'a1000000-0000-0000-0000-000000000001',
    'Tramo Sur — Niños Héroes',
    'avp_simulated',
    50.0, 90.0,
    20.67050, -103.36950,
    NULL,
    'online',
    NULL,
    NULL
  ),

  -- ──────────────────────────────────────────────────────────
  -- NODO 4: Plaza de bolsillo — Lado Este (simulado)
  -- ──────────────────────────────────────────────────────────
  (
    'b1000000-0000-0000-0000-000000000004',
    'a1000000-0000-0000-0000-000000000001',
    'Plaza de Bolsillo Este',
    'checkpoint',
    85.0, 45.0,
    20.67340, -103.36680,
    NULL,
    'online',
    NULL,
    NULL
  ),

  -- ──────────────────────────────────────────────────────────
  -- NODO 5: Zona de Terrazas — Lado Oeste (simulado)
  -- ──────────────────────────────────────────────────────────
  (
    'b1000000-0000-0000-0000-000000000005',
    'a1000000-0000-0000-0000-000000000001',
    'Zona de Terrazas Oeste',
    'checkpoint',
    15.0, 55.0,
    20.67300, -103.37020,
    NULL,
    'online',
    NULL,
    NULL
  ),

  -- ──────────────────────────────────────────────────────────
  -- NODO 6: Punto Médico — Cruz Verde cercana (simulado)
  -- ──────────────────────────────────────────────────────────
  (
    'b1000000-0000-0000-0000-000000000006',
    'a1000000-0000-0000-0000-000000000001',
    'Punto Médico — Cruz Verde',
    'medical_point',
    25.0, 30.0,
    20.67450, -103.36980,
    NULL,
    'online',
    NULL,
    NULL
  ),

  -- ──────────────────────────────────────────────────────────
  -- NODO 7: Acceso Principal — Cruce Chapultepec/Juárez (simulado)
  -- ──────────────────────────────────────────────────────────
  (
    'b1000000-0000-0000-0000-000000000007',
    'a1000000-0000-0000-0000-000000000001',
    'Acceso Principal — Cruce Juárez',
    'exit',
    50.0, 2.0,
    20.67620, -103.36720,
    NULL,
    'online',
    NULL,
    NULL
  ),

  -- ──────────────────────────────────────────────────────────
  -- NODO 8: Salida de Emergencia — Lateral Poniente (simulado)
  -- ──────────────────────────────────────────────────────────
  (
    'b1000000-0000-0000-0000-000000000008',
    'a1000000-0000-0000-0000-000000000001',
    'Salida de Emergencia — Lateral Poniente',
    'emergency_exit',
    10.0, 80.0,
    20.67120, -103.37080,
    NULL,
    'online',
    NULL,
    NULL
  )

ON CONFLICT (id) DO UPDATE SET
  name         = EXCLUDED.name,
  type         = EXCLUDED.type,
  pos_x        = EXCLUDED.pos_x,
  pos_y        = EXCLUDED.pos_y,
  lat          = EXCLUDED.lat,
  lng          = EXCLUDED.lng,
  lorawan_eui  = EXCLUDED.lorawan_eui,
  status       = EXCLUDED.status;


-- ============================================================
-- 3. USUARIOS BASE (coordinadores + aliado demo)
-- ============================================================

INSERT INTO users (id, nickname, role, zone_id, language, password_hash)
VALUES
  ('c1000000-0000-0000-0000-000000000001', 'coord_zapopan_01', 'coordinator', 'a1000000-0000-0000-0000-000000000001', 'es', 'DUMMY_HASH_01'),
  ('c1000000-0000-0000-0000-000000000002', 'coord_chapultepec_02', 'coordinator', 'a1000000-0000-0000-0000-000000000001', 'es', 'DUMMY_HASH_02'),
  ('c1000000-0000-0000-0000-000000000003', 'aliado_demo_01', 'ally', 'a1000000-0000-0000-0000-000000000001', 'es', NULL)
ON CONFLICT (id) DO UPDATE SET
  nickname      = EXCLUDED.nickname,
  role          = EXCLUDED.role,
  password_hash = EXCLUDED.password_hash;


-- ============================================================
-- 4. COMUNIDAD BASE
-- ============================================================

INSERT INTO communities (id, zone_id, name, description, status)
VALUES (
  'd1000000-0000-0000-0000-000000000001',
  'a1000000-0000-0000-0000-000000000001',
  'Vecinos Chapultepec',
  'Comunidad de vecinos, comerciantes y visitantes frecuentes del Corredor Chapultepec. Monitoreo colaborativo 24/7.',
  'active'
)
ON CONFLICT (id) DO UPDATE SET
  name        = EXCLUDED.name,
  description = EXCLUDED.description,
  status      = EXCLUDED.status;

INSERT INTO community_members (id, community_id, user_id, role)
VALUES
  ('e1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'admin'),
  ('e1000000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000002', 'admin'),
  ('e1000000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000003', 'ally')
ON CONFLICT (community_id, user_id) DO UPDATE SET
  role = EXCLUDED.role;


-- ============================================================
-- 5. POST-SEED VALIDATION
-- ============================================================
-- Verify all data was inserted correctly

SELECT 'POST-SEED VALIDATION' as check_type, NOW() as timestamp;

-- Validate zone exists with correct data
SELECT 
  'Zone Check' as validation,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM zones 
      WHERE slug = 'chapultepec' 
      AND name = 'Corredor Chapultepec — Zona Centro GDL'
    ) THEN '✅ Zone OK'
    ELSE '❌ Zone Failed'
  END as status;

-- Validate all 8 nodes exist
SELECT 
  'Nodes Count' as validation,
  COUNT(*) as expected_8,
  CASE 
    WHEN COUNT(*) = 8 THEN '✅ All 8 nodes present'
    ELSE '❌ Missing nodes'
  END as status
FROM nodes 
WHERE zone_id = 'a1000000-0000-0000-0000-000000000001';

-- Validate node types
SELECT 
  'Node Types' as validation,
  COUNT(DISTINCT type) as types_found,
  STRING_AGG(DISTINCT type, ', ') as types_list,
  CASE 
    WHEN COUNT(DISTINCT type) >= 6 THEN '✅ All node types present'
    ELSE '⚠️  Some node types missing'
  END as status
FROM nodes 
WHERE zone_id = 'a1000000-0000-0000-0000-000000000001';

-- Validate users
SELECT 
  'Users Count' as validation,
  COUNT(*) as expected_3,
  CASE 
    WHEN COUNT(*) = 3 THEN '✅ All 3 users present'
    ELSE '❌ Missing users'
  END as status
FROM users 
WHERE zone_id = 'a1000000-0000-0000-0000-000000000001';

-- Validate community and members
SELECT 
  'Community' as validation,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM communities c
      JOIN community_members cm ON cm.community_id = c.id
      WHERE c.zone_id = 'a1000000-0000-0000-0000-000000000001'
      GROUP BY c.id
      HAVING COUNT(cm.id) = 3
    ) THEN '✅ Community with 3 members OK'
    ELSE '❌ Community/members issue'
  END as status;


-- ============================================================
-- 6. VERIFICATION QUERY (Detailed Node Report)
-- ============================================================

SELECT
  n.name                        AS nodo,
  n.type                        AS tipo,
  n.status                      AS estado,
  COALESCE(n.lorawan_eui, '— simulado —') AS eui,
  ROUND(n.pos_x::numeric, 1)    AS "pos_x%",
  ROUND(n.pos_y::numeric, 1)    AS "pos_y%",
  n.lat,
  n.lng
FROM nodes n
JOIN zones z ON z.id = n.zone_id
WHERE z.slug = 'chapultepec'
ORDER BY n.type DESC, n.name;


-- ============================================================
-- COMMIT OR ROLLBACK
-- ============================================================
-- PRODUCTION: Uncomment the line below to save changes
COMMIT;

-- DRY-RUN: Uncomment the line below to discard changes (for testing)
-- ROLLBACK;


-- ============================================================
-- ROLLBACK INSTRUCTIONS (Execute if you need to reset)
-- ============================================================
/*
-- To completely remove all seeded data and start fresh:

BEGIN;

-- Delete in reverse order of dependencies
DELETE FROM community_members 
WHERE community_id = 'd1000000-0000-0000-0000-000000000001';

DELETE FROM communities 
WHERE id = 'd1000000-0000-0000-0000-000000000001';

DELETE FROM users 
WHERE zone_id = 'a1000000-0000-0000-0000-000000000001';

DELETE FROM nodes 
WHERE zone_id = 'a1000000-0000-0000-0000-000000000001';

DELETE FROM zones 
WHERE slug = 'chapultepec';

COMMIT;
*/

-- ============================================================
-- END OF SEEDER
-- ============================================================
