-- ============================================================
-- Zona SeguRAA DB Schema (MVP)
-- Public zone scenario: Parque Metropolitano, Zapopan
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  city text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS communities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id uuid NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  visibility text NOT NULL CHECK (visibility IN ('public', 'member', 'restricted')),
  safety_status text NOT NULL CHECK (safety_status IN ('calm', 'monitoring', 'active_alert')),
  ally_count integer NOT NULL DEFAULT 0,
  present_count integer NOT NULL DEFAULT 0,
  capacity integer NOT NULL DEFAULT 0,
  unverified_alerts integer NOT NULL DEFAULT 0,
  active_alerts integer NOT NULL DEFAULT 0,
  role_required text NOT NULL DEFAULT 'visitor' CHECK (role_required IN ('visitor', 'ally', 'admin')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id uuid NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  community_id uuid REFERENCES communities(id) ON DELETE SET NULL,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('avp_physical', 'avp_simulated', 'medical_point', 'exit', 'emergency_exit', 'meeting_point')),
  pos_x numeric(5,2) NOT NULL CHECK (pos_x >= 0 AND pos_x <= 100),
  pos_y numeric(5,2) NOT NULL CHECK (pos_y >= 0 AND pos_y <= 100),
  lat numeric(9,6),
  lng numeric(9,6),
  lorawan_eui text,
  status text NOT NULL DEFAULT 'online' CHECK (status IN ('online', 'offline', 'alert', 'in_progress', 'maintenance')),
  battery_pct integer CHECK (battery_pct IS NULL OR (battery_pct >= 0 AND battery_pct <= 100)),
  last_seen_at timestamptz
);

CREATE TABLE IF NOT EXISTS users_coord (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  role text NOT NULL DEFAULT 'coordinator' CHECK (role IN ('coordinator', 'admin')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users_temp (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nickname text NOT NULL UNIQUE,
  zone_id uuid NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  community_id uuid REFERENCES communities(id) ON DELETE SET NULL,
  language text NOT NULL CHECK (language IN ('es', 'en')),
  accessibility_profile jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '1 hour')
);

CREATE TABLE IF NOT EXISTS alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id uuid NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  community_id uuid REFERENCES communities(id) ON DELETE SET NULL,
  node_id uuid REFERENCES nodes(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('security', 'medical', 'fire', 'evacuation', 'other')),
  level integer NOT NULL CHECK (level BETWEEN 1 AND 4),
  severity_label text NOT NULL DEFAULT 'low' CHECK (severity_label IN ('low', 'medium', 'high', 'critical')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'validated', 'in_progress', 'resolved', 'false_alarm', 'cancelled')),
  description text NOT NULL,
  context_summary text,
  language text NOT NULL DEFAULT 'es' CHECK (language IN ('es', 'en')),
  created_by_nick text NOT NULL,
  validation_ratio numeric(5,2) NOT NULL DEFAULT 0,
  confirmations_required integer NOT NULL DEFAULT 3,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  attended_by uuid REFERENCES users_coord(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS alert_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id uuid NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
  nickname text NOT NULL,
  role text NOT NULL CHECK (role IN ('visitor', 'ally', 'coordinator')),
  weight integer NOT NULL DEFAULT 1 CHECK (weight BETWEEN 1 AND 3),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (alert_id, nickname)
);

CREATE TABLE IF NOT EXISTS iot_uplinks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  node_eui text NOT NULL,
  payload_hex text NOT NULL,
  alert_state integer NOT NULL,
  battery_pct integer,
  rssi integer,
  snr numeric(5,2),
  received_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notification_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id uuid NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('push', 'sms', 'whatsapp', 'lorawan', 'local')),
  level integer NOT NULL CHECK (level BETWEEN 1 AND 4),
  sent_at timestamptz NOT NULL DEFAULT now(),
  result text NOT NULL DEFAULT 'queued'
);

CREATE INDEX IF NOT EXISTS idx_nodes_zone_status ON nodes(zone_id, status);
CREATE INDEX IF NOT EXISTS idx_alerts_zone_status_created ON alerts(zone_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alert_votes_alert ON alert_votes(alert_id);
CREATE INDEX IF NOT EXISTS idx_communities_zone ON communities(zone_id);