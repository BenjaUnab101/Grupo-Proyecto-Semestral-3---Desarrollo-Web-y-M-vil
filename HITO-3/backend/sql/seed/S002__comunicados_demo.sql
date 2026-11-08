-- S002 · Datos de DEMOSTRACIÓN de comunicados (HU-21). Todos ficticios e idempotentes.
-- Requiere S001 (usuarios y alumnos demo).

-- ---------- Salas y matrículas demo (para calcular los comunicados pertinentes) ----------
INSERT INTO salas (nombre, nivel, capacidad, grupo_comunicados)
VALUES
    ('Sala Demo Medio Mayor', 'Medio mayor', 20, 'Preescolar'),
    ('Sala Demo Transición', 'Transición', 20, 'Preescolar'),
    ('Sala Demo TEL', 'Escuela de lenguaje (TEL)', 15, 'Salas TEL')
ON CONFLICT (nombre) DO NOTHING;

-- Apoderado Demo Uno (alumnos 01 a 05): todos en salas Preescolar.
-- Apoderado Demo Dos (alumno 06): en la sala TEL.
INSERT INTO matriculas (alumno_id, sala_id, anio_escolar, estado)
SELECT al.id, s.id, extract(year FROM now() AT TIME ZONE 'America/Santiago')::int, 'vigente'
FROM alumnos al
JOIN salas s ON s.nombre = CASE
    WHEN al.codigo IN ('DEMO-A01', 'DEMO-A02', 'DEMO-A03') THEN 'Sala Demo Medio Mayor'
    WHEN al.codigo IN ('DEMO-A04', 'DEMO-A05') THEN 'Sala Demo Transición'
    WHEN al.codigo = 'DEMO-A06' THEN 'Sala Demo TEL'
END
ON CONFLICT ON CONSTRAINT uq_matricula_alumno_anio DO NOTHING;

-- ---------- Comunicados demo ----------
-- Fechas relativas al momento de cargar la semilla, para que los casos sigan siendo
-- válidos: vigentes, uno vencido, uno programado (futuro) y un borrador.
WITH autores AS (
    SELECT
        (SELECT id FROM usuarios WHERE email = 'direccion.demo@ejemplo.cl') AS direccion,
        (SELECT id FROM usuarios WHERE email = 'educadora.demo@ejemplo.cl') AS educadora
),
demo (titulo, cuerpo, nivel, alcance, categoria, es_urgente, publicado, desplazamiento, dias_vigencia, autor) AS (
    VALUES
    ('Suspensión de clases por alerta meteorológica',
     'Por el sistema frontal previsto para mañana, el jardín no abrirá. Las actividades se retoman el jueves en el horario habitual.',
     'General', 'Todo el jardín', 'Suspensión', TRUE, TRUE, interval '-2 days', 2, 'direccion'),
    ('Reunión de apoderados nivel medio mayor',
     'La reunión será el próximo miércoles a las 18:30 en la sala de actividades. Se tratará el calendario del último trimestre.',
     'Preescolar', 'Nivel medio mayor', 'Reunión', FALSE, TRUE, interval '-5 days', NULL, 'direccion'),
    ('Campaña de vacunación escolar',
     'El consultorio vacunará en el jardín. Envíe la autorización firmada en la agenda antes del lunes.',
     'General', 'Todo el jardín', 'Salud', TRUE, TRUE, interval '-10 days', 15, 'direccion'),
    ('Material para la semana de la lectura',
     'Cada niño puede traer un cuento favorito, con su nombre en la tapa, desde el lunes.',
     'Preescolar', 'Nivel transición', 'Actividades', FALSE, TRUE, interval '-20 days', NULL, 'educadora'),
    ('Taller de estimulación del lenguaje para familias',
     'Las fonoaudiólogas invitan a las familias de las salas TEL a un taller práctico de juegos para estimular el lenguaje en casa.',
     'Salas TEL', 'Salas TEL', 'Actividades', FALSE, TRUE, interval '-3 days', NULL, 'educadora'),
    -- VENCIDO: su vigencia terminó ayer, no debe aparecer en los vigentes.
    ('Horario de invierno vigente',
     'El horario de ingreso se mantiene a las 8:30 y la salida a las 16:00 mientras no se informe otra cosa.',
     'General', 'Todo el jardín', 'Horarios', FALSE, TRUE, interval '-60 days', -1, 'direccion'),
    -- PROGRAMADO: se publica en 3 días, aún no debe aparecer.
    ('Nuevo horario de verano',
     'Desde la próxima semana, la salida será a las 15:30.',
     'General', 'Todo el jardín', 'Horarios', FALSE, TRUE, interval '3 days', NULL, 'direccion'),
    -- BORRADOR: no publicado, no debe aparecer.
    ('Borrador: fiesta de fin de año',
     'Texto en preparación.',
     'General', 'Todo el jardín', 'Actividades', FALSE, FALSE, interval '-1 days', NULL, 'direccion')
)
INSERT INTO comunicados (titulo, cuerpo, nivel, alcance, categoria, es_urgente, publicado,
                         fecha_publicacion, vigente_hasta, autor_usuario_id)
SELECT d.titulo, d.cuerpo, d.nivel, d.alcance, d.categoria, d.es_urgente, d.publicado,
       now() + d.desplazamiento,
       CASE WHEN d.dias_vigencia IS NULL THEN NULL
            ELSE (now() AT TIME ZONE 'America/Santiago')::date + d.dias_vigencia END,
       CASE d.autor WHEN 'direccion' THEN a.direccion ELSE a.educadora END
FROM demo d CROSS JOIN autores a
WHERE NOT EXISTS (SELECT 1 FROM comunicados c WHERE c.titulo = d.titulo);
