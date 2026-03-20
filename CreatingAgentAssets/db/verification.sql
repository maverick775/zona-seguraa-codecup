-- Quick verification queries after reset+seed

SELECT slug, name, city, active FROM zones ORDER BY slug;

SELECT zone_id, slug, name, visibility, safety_status, role_required
FROM communities
ORDER BY name;

SELECT zone_id, name, type, status, pos_x, pos_y
FROM nodes
ORDER BY name;

SELECT email, role FROM users_coord ORDER BY email;