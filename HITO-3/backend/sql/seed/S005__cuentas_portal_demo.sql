-- S005 · HU-16 (Sprint 3 · Daniel): cuenta de apoderado demo SIN alumnos asociados, para
-- probar el portal con 0 hijos (los demo existentes cubren 1 hijo y 5 hijos).
--
-- Datos FICTICIOS (@ejemplo.cl). password_hash es un marcador que NO permite iniciar sesión:
-- la API reemplaza el marcador por un hash real solo si DEMO_PASSWORD está definida en el
-- entorno (ver app/services/auth.py). Idempotente.

INSERT INTO apoderados (nombre, email)
VALUES ('Apoderade Demo Tres', 'apoderado.demo3@ejemplo.cl')
ON CONFLICT (email) DO NOTHING;

INSERT INTO usuarios (email, password_hash, rol, apoderado_id)
SELECT ap.email, 'demo-sin-contrasena', 'apoderado', ap.id
FROM apoderados ap
WHERE ap.email = 'apoderado.demo3@ejemplo.cl'
ON CONFLICT (email) DO NOTHING;
