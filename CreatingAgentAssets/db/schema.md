# Schema de Base de Datos — Zona SeguRAA

> Fuente canónica del modelo de datos. Toda modificación de tablas se refleja aquí primero.
> Después de editar: purgar DB → ejecutar este SQL → ejecutar `seederZS.txt`.

## Diagrama de relaciones

```
zones ──┬── nodes
        ├── alerts ──── votes
        ├── communities ── community_members
        └── users
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
  lat         DOUBLE PRECISION,
  lng         DOUBLE PRECISION,
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. NODES — nodos IoT o puntos de referencia en una zona
-- ============================================================
CREATE TABLE IF NOT EXISTS nodes (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  zone_id       UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  type          TEXT NOT NULL CHECK (type IN (
    'avp_physical', 'avp_simulated', 'medical_point',
    'exit', 'emergency_exit', 'checkpoint', 'camera'
  )),
  pos_x         DOUBLE PRECISION,
  pos_y         DOUBLE PRECISION,
  lat           DOUBLE PRECISION,
  lng           DOUBLE PRECISION,
  lorawan_eui   TEXT,
  status        TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'alert', 'maintenance')),
  battery_pct   INTEGER CHECK (battery_pct BETWEEN 0 AND 100),
  last_seen_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 3. USERS — visitantes temporales y coordinadores
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nickname      TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'visitor' CHECK (role IN ('visitor', 'ally', 'coordinator', 'admin')),
  zone_id       UUID REFERENCES zones(id),
  language      TEXT DEFAULT 'es',
  password_hash TEXT,
  expires_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 4. ALERTS — incidentes reportados
-- ============================================================
CREATE TABLE IF NOT EXISTS alerts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  zone_id         UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  node_id         UUID REFERENCES nodes(id),
  created_by      UUID REFERENCES users(id),
  created_by_nick TEXT,
  type            TEXT NOT NULL CHECK (type IN ('security', 'medical', 'fire', 'other')),
  level           INTEGER NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 5),
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'in_progress', 'resolved', 'dismissed')),
  description     TEXT,
  language        TEXT DEFAULT 'es',
  lat             DOUBLE PRECISION,
  lng             DOUBLE PRECISION,
  resolved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 5. VOTES — validaciones comunitarias sobre alertas
-- ============================================================
CREATE TABLE IF NOT EXISTS votes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alert_id    UUID NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES users(id),
  nickname    TEXT,
  role        TEXT NOT NULL DEFAULT 'visitor' CHECK (role IN ('visitor', 'ally', 'coordinator')),
  weight      INTEGER NOT NULL DEFAULT 1,
  comment     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 6. COMMUNITIES — comunidades / zonas con membresía
-- ============================================================
CREATE TABLE IF NOT EXISTS communities (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  zone_id     UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'monitoring', 'alert')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 7. COMMUNITY_MEMBERS — relación usuario ↔ comunidad
-- ============================================================
CREATE TABLE IF NOT EXISTS community_members (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  community_id  UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role          TEXT NOT NULL DEFAULT 'visitor' CHECK (role IN ('visitor', 'ally', 'admin')),
  joined_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(community_id, user_id)
);

-- ============================================================
-- 8. INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_alerts_zone    ON alerts(zone_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status  ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_votes_alert    ON votes(alert_id);
CREATE INDEX IF NOT EXISTS idx_nodes_zone     ON nodes(zone_id);
CREATE INDEX IF NOT EXISTS idx_cm_community   ON community_members(community_id);
CREATE INDEX IF NOT EXISTS idx_cm_user        ON community_members(user_id);

-- ============================================================
-- 9. REALTIME — habilitar para tablas clave
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE nodes;
ALTER PUBLICATION supabase_realtime ADD TABLE votes;
```

## Notas de mantenimiento
- **Agregar columna:** actualizar este archivo → actualizar seed → actualizar contratos afectados → purgar y recrear.
- **Eliminar columna:** verificar que no haya dependencias en API routes o componentes antes de eliminar.
- **Enum values:** si se agrega un nuevo tipo de alerta o rol, actualizar CHECK constraints aquí y en `lib/validators/`.
