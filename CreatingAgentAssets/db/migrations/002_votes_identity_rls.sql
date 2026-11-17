-- ============================================================
-- 002_votes_identity_rls.sql · Signalarm App (prototipo zona-seguraa)
-- Estado: PROPUESTA — pendiente de revisión del owner. Requiere 001 aplicada.
-- NO ejecutar contra Supabase compartido ni producción sin aprobación.
--
-- 1) Votos con identidad del servidor (cierra H3 a nivel de datos):
--    alert_votes.voter_user_id + un voto por usuario y alerta.
-- 2) Cierra el acceso DIRECTO con la anon key (PostgREST) a las tablas de la app.
--    Hoy no hay RLS: con la anon key pública cualquiera puede leer y ESCRIBIR
--    alerts, alert_votes, users_temp, users_coord, etc., saltándose la API.
--    Tras 002: anon/authenticated solo pueden LEER zones y nodes.
--
-- Impacto conocido:
--   * Realtime de `alerts`/`alert_votes` en el navegador deja de recibir eventos
--     (las pantallas ya tienen botón "Actualizar" y leen por la API).
--     [NO VERIFICADO] comportamiento exacto de Realtime con RLS en el proyecto.
--   * La app (service_role) no se ve afectada: service_role tiene BYPASSRLS.
--   * Votos existentes quedan con voter_user_id NULL (no cuentan para el único).
--
-- Rollback: 002_votes_identity_rls.down.sql
-- ============================================================
BEGIN;

ALTER TABLE public.alert_votes
  ADD COLUMN IF NOT EXISTS voter_user_id UUID REFERENCES auth.users(id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_alert_votes_voter
  ON public.alert_votes (alert_id, voter_user_id)
  WHERE voter_user_id IS NOT NULL;

-- RLS en todas las tablas de la app. Sin políticas = sin acceso para anon/authenticated.
ALTER TABLE public.zones        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nodes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_votes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users_temp   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users_coord  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.iot_uplinks  ENABLE ROW LEVEL SECURITY;

-- Escritura directa prohibida para roles de cliente (defensa además de RLS).
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON
  public.zones, public.nodes, public.alerts, public.alert_votes,
  public.users_temp, public.users_coord, public.iot_uplinks,
  public.alert_events, public.coordinator_zones
FROM anon, authenticated;

-- Lectura pública solo de catálogo (zonas activas y sus nodos).
DROP POLICY IF EXISTS zones_public_read ON public.zones;
CREATE POLICY zones_public_read ON public.zones
  FOR SELECT TO anon, authenticated USING (active);

DROP POLICY IF EXISTS nodes_public_read ON public.nodes;
CREATE POLICY nodes_public_read ON public.nodes
  FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.zones z WHERE z.id = nodes.zone_id AND z.active));

COMMIT;
