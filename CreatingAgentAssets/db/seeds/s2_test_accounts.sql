-- Cuentas de PRUEBA para S2. Solo en el proyecto Supabase de pruebas.
-- Paso previo (dashboard → Authentication → Add user, con "Auto Confirm"):
--   residente.a@<dominio>, residente.b@<dominio>, coord.z1@<dominio>, coord.z2@<dominio>
-- Reemplaza <dominio> antes de ejecutar. No usar correos reales de personas.
BEGIN;
INSERT INTO public.users_coord (email, role) VALUES
  ('coord.z1@<dominio>', 'coordinator'),
  ('coord.z2@<dominio>', 'coordinator')
ON CONFLICT (email) DO NOTHING;

INSERT INTO public.coordinator_zones (coord_id, zone_id)
SELECT id, 'a1000000-0000-0000-0000-000000000001' FROM public.users_coord WHERE email = 'coord.z1@<dominio>'
UNION ALL
SELECT id, 'a1000000-0000-0000-0000-000000000002' FROM public.users_coord WHERE email = 'coord.z2@<dominio>'
ON CONFLICT DO NOTHING;

-- Verificación: 2 filas, una por zona.
SELECT c.email, z.slug FROM public.coordinator_zones cz
JOIN public.users_coord c ON c.id = cz.coord_id JOIN public.zones z ON z.id = cz.zone_id;
COMMIT;
