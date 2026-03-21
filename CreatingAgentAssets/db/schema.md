# Schema de Base de Datos — Zona SeguRAA

> Fuente canónica del modelo de datos. Toda modificación de tablas se refleja aquí primero.  
> Después de editar: purgar DB → ejecutar este SQL → ejecutar `seederZS.txt`.

## Diagrama de relaciones

```
zones ──┬── nodes
        ├── alerts ──── alert_votes
        ├── users_temp
        └── users_coord (Supabase Auth)

iot_uplinks  (log independiente, sin FK)
```

## SQL — Crear tablas

```sql
-- ============================================================
-- EXTENSIONES
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. ZONES — zonas públicas monitoreadas
-- ============================================================
CREATE TABLE IF NOT EXISTS zones (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug        TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  description TEXT,
  city        TEXT NOT NULL DEFAULT 'Guadalajara',
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. NODES — nodos IoT o puntos de referencia en una zona
-- ============================================================
CREATE TABLE IF NOT EXISTS nodes (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  zone_id      UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  type         TEXT NOT NULL CHECK (type IN (
    'avp_physical', 'avp_simulated', 'medical_point', 'mobile_unit'
  )),
  x            DOUBLE PRECISION,  -- posición en mapa estático (% del ancho)
  y            DOUBLE PRECISION,  -- posición en mapa estático (% del alto)
  lat          DOUBLE PRECISION,  -- coordenadas GPS reales
  lng          DOUBLE PRECISION,  -- coordenadas GPS reales
  lorawan_eui  TEXT,              -- DevEUI si físico, NULL si simulado
  status       TEXT NOT NULL DEFAULT 'offline' CHECK (status IN (
    'online', 'offline', 'alert'
  )),
  last_seen_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 3. USERS_COORD — coordinadores de seguridad
-- Contraseña gestionada por Supabase Auth (auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS users_coord (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email      TEXT UNIQUE NOT NULL,
  role       TEXT NOT NULL DEFAULT 'coordinator',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 4. USERS_TEMP — visitantes con alias temporal
-- ============================================================
CREATE TABLE IF NOT EXISTS users_temp (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nickname   TEXT UNIQUE NOT NULL,
  zone_id    UUID REFERENCES zones(id),
  language   TEXT DEFAULT 'es',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 hour')
);

-- ============================================================
-- 5. ALERTS — incidentes reportados
-- ============================================================
CREATE TABLE IF NOT EXISTS alerts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  zone_id         UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  node_id         UUID REFERENCES nodes(id),
  type            TEXT NOT NULL CHECK (type IN ('medical', 'security', 'fire', 'evacuation')),
  level           INTEGER NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 3),
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
    'active', 'in_progress', 'resolved', 'false_alarm'
  )),
  description     TEXT,
  language        TEXT DEFAULT 'es',
  created_by_nick TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at     TIMESTAMPTZ,
  attended_by     UUID REFERENCES users_coord(id)
);

-- ============================================================
-- 6. ALERT_VOTES — validaciones comunitarias sobre alertas
-- ============================================================
CREATE TABLE IF NOT EXISTS alert_votes (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alert_id   UUID NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
  nickname   TEXT,
  role       TEXT NOT NULL DEFAULT 'visitor' CHECK (role IN ('visitor', 'coordinator')),
  weight     INTEGER NOT NULL DEFAULT 1,  -- visitor=1, coordinator=2
  comment    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 7. IOT_UPLINKS — log de uplinks LoRaWAN (debug y trazabilidad)
-- ============================================================
CREATE TABLE IF NOT EXISTS iot_uplinks (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  node_eui    TEXT NOT NULL,
  payload_hex TEXT,
  alert_state INTEGER,
  battery_pct INTEGER,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 8. INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_alerts_zone    ON alerts(zone_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status  ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_votes_alert    ON alert_votes(alert_id);
CREATE INDEX IF NOT EXISTS idx_nodes_zone     ON nodes(zone_id);
CREATE INDEX IF NOT EXISTS idx_users_temp_exp ON users_temp(expires_at);

-- ============================================================
-- 9. REALTIME — habilitar para tablas clave
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE nodes;
ALTER PUBLICATION supabase_realtime ADD TABLE alert_votes;
```

## Reglas de mantenimiento
- **Agregar columna:** actualizar este archivo → actualizar `seederZS.txt` → actualizar contratos afectados → purgar y recrear.
- **Enum values:** si se agrega tipo de alerta o rol, actualizar CHECK constraints aquí y en `zona-seguraa/src/lib/validators.js`.
- **users_coord:** los registros deben existir primero en `auth.users` de Supabase antes de insertar en esta tabla.
