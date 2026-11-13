-- S001 · Datos de DEMOSTRACIÓN de Pequeños Reyes (HU-19 y TEC-16).
--
-- TODOS los datos son FICTICIOS: no corresponden a personas reales ni a menores reales.
-- Se identifican por los códigos DEMO-*, los correos @ejemplo.cl y los nombres "Demo".
-- El script es idempotente: se puede ejecutar muchas veces sin duplicar nada.

-- ---------- Datos institucionales (ficticios para la demo) ----------
INSERT INTO institucion (id, nombre, tipo, direccion, comuna, region, telefono, email, horario_atencion)
VALUES (1, 'Pequeños Reyes (demo)', 'Jardín infantil y escuela de lenguaje',
        'Calle Ficticia 123', 'Viña del Mar', 'Valparaíso',
        '+56 32 000 0000', 'contacto@ejemplo.cl', 'Lunes a viernes, 08:30 a 16:00')
ON CONFLICT (id) DO NOTHING;

-- ---------- Categorías de actividades ----------
INSERT INTO categorias (nombre, descripcion)
VALUES
    ('Salida pedagógica', 'Actividades fuera del jardín'),
    ('Taller', 'Talleres con niños y familias'),
    ('Celebración', 'Actos y celebraciones institucionales'),
    ('Reunión', 'Reuniones de apoderados')
ON CONFLICT (nombre) DO NOTHING;

-- ---------- Usuarios demo ----------
-- password_hash NO es un hash real: estas cuentas no permiten iniciar sesión. Cuando
-- exista autenticación, se reemplazarán por hashes generados por la aplicación.
INSERT INTO usuarios (email, password_hash, rol)
VALUES
    ('educadora.demo@ejemplo.cl', 'demo-sin-contrasena', 'organizador'),
    ('direccion.demo@ejemplo.cl', 'demo-sin-contrasena', 'administrador')
ON CONFLICT (email) DO NOTHING;

-- ---------- Organizadores demo ----------
-- Tabla de HU-17. La cuenta educadora.demo@ejemplo.cl se reconoce por el mismo correo.
INSERT INTO organizadores (nombre, email, rol_perfil, activo)
VALUES
    ('Educadora Demo', 'educadora.demo@ejemplo.cl', 'Educadora', TRUE),
    ('Fonoaudióloga Demo', 'fono.demo@ejemplo.cl', 'Fonoaudióloga', TRUE)
ON CONFLICT (email) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Datos de DEMOSTRACIÓN. Todos son ficticios: no corresponden a personas reales
-- ni a menores reales. Los códigos DEMO-* y los correos @ejemplo.cl lo identifican.
-- ---------------------------------------------------------------------------

INSERT INTO apoderados (nombre, email)
VALUES
    ('Apoderada Demo Uno', 'apoderado.demo1@ejemplo.cl'),
    ('Apoderado Demo Dos', 'apoderado.demo2@ejemplo.cl')
ON CONFLICT (email) DO NOTHING;

INSERT INTO alumnos (codigo, nombre)
VALUES
    ('DEMO-A01', 'Alumno Demo 01'),
    ('DEMO-A02', 'Alumno Demo 02'),
    ('DEMO-A03', 'Alumno Demo 03'),
    ('DEMO-A04', 'Alumno Demo 04'),
    ('DEMO-A05', 'Alumno Demo 05'),
    ('DEMO-A06', 'Alumno Demo 06')
ON CONFLICT (codigo) DO NOTHING;

-- Apoderado Demo Uno es apoderado de los alumnos 01 a 05; Apoderado Demo Dos, del 06.
INSERT INTO apoderados_alumnos (apoderado_id, alumno_id, parentesco, es_contacto_principal)
SELECT ap.id, al.id, 'Apoderado', TRUE
FROM apoderados ap
JOIN alumnos al ON al.codigo IN ('DEMO-A01', 'DEMO-A02', 'DEMO-A03', 'DEMO-A04', 'DEMO-A05')
WHERE ap.email = 'apoderado.demo1@ejemplo.cl'
ON CONFLICT DO NOTHING;

INSERT INTO apoderados_alumnos (apoderado_id, alumno_id, parentesco, es_contacto_principal)
SELECT ap.id, al.id, 'Apoderado', TRUE
FROM apoderados ap
JOIN alumnos al ON al.codigo = 'DEMO-A06'
WHERE ap.email = 'apoderado.demo2@ejemplo.cl'
ON CONFLICT DO NOTHING;

-- Fechas relativas al día en que se ejecuta el script (hora de Chile), para que las
-- actividades demo estén vigentes al probar.
INSERT INTO actividades (codigo, titulo, descripcion, fecha, hora, lugar, cupo_maximo)
VALUES
    ('DEMO-SALIDA-GRANJA', 'Salida pedagógica a la granja educativa',
     'Visita guiada a una granja educativa. Traer colación, agua, gorro y bloqueador.',
     (now() AT TIME ZONE 'America/Santiago')::date + 7, '09:00', 'Salida desde el jardín', 20),
    ('DEMO-TALLER-RECICLAJE', 'Taller de reciclaje con familias',
     'Taller para niños y apoderados. Traer dos envases plásticos limpios.',
     (now() AT TIME ZONE 'America/Santiago')::date + 10, '10:00', 'Patio central', 10),
    ('DEMO-CUPO-REDUCIDO', 'Taller de cuentacuentos (cupo reducido)',
     'Actividad demo con solo 2 cupos, para probar el control de sobrecupo (HTTP 409).',
     (now() AT TIME ZONE 'America/Santiago')::date + 5, '11:00', 'Biblioteca', 2)
ON CONFLICT (codigo) DO UPDATE SET
    titulo = EXCLUDED.titulo,
    descripcion = EXCLUDED.descripcion,
    fecha = EXCLUDED.fecha,
    hora = EXCLUDED.hora,
    lugar = EXCLUDED.lugar,
    cupo_maximo = EXCLUDED.cupo_maximo;

-- Cuentas de usuario de los apoderados demo (se crean después de los apoderados).
INSERT INTO usuarios (email, password_hash, rol, apoderado_id)
SELECT ap.email, 'demo-sin-contrasena', 'apoderado', ap.id
FROM apoderados ap
WHERE ap.email IN ('apoderado.demo1@ejemplo.cl', 'apoderado.demo2@ejemplo.cl')
ON CONFLICT (email) DO NOTHING;

-- Categoría, organizador y costo de las actividades demo (solo si aún no los tienen).
UPDATE actividades a SET categoria_id = c.id
FROM categorias c
WHERE a.categoria_id IS NULL AND (
    (a.codigo = 'DEMO-SALIDA-GRANJA' AND c.nombre = 'Salida pedagógica') OR
    (a.codigo IN ('DEMO-TALLER-RECICLAJE', 'DEMO-CUPO-REDUCIDO') AND c.nombre = 'Taller')
);

UPDATE actividades a SET organizador_id = o.id
FROM organizadores o
WHERE a.organizador_id IS NULL AND a.codigo LIKE 'DEMO-%' AND o.email = 'educadora.demo@ejemplo.cl';

-- La salida a la granja tiene un costo (ficticio) para poder probar los pagos simulados.
UPDATE actividades SET costo = 3500
WHERE codigo = 'DEMO-SALIDA-GRANJA' AND costo = 0;
