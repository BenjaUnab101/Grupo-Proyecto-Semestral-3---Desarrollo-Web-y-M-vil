-- S003 · TEC-17: salas de HU-09 en PostgreSQL, con matrículas FICTICIAS para los cupos.
--
-- Antes, los cupos venían de frontend-react/src/data/salas.json (números escritos a mano).
-- Ahora el frontend los pide a GET /api/v1/salas/cupos, que CUENTA las matrículas en SQL.
-- Para que la demo muestre los mismos números de HU-09, aquí se crean alumnos y matrículas
-- ficticios (códigos DEMO-S<sala>-<n>, nombres "Alumno Demo S<sala>-<n>"). Idempotente.

INSERT INTO salas (nombre, nivel, capacidad, grupo_comunicados)
VALUES
    ('Sala Naranja (Medio Mayor A)', 'Medio mayor', 15, 'Preescolar'),
    ('Sala Azul (Medio Mayor B)', 'Medio mayor', 15, 'Preescolar'),
    ('Sala Verde (Pre-Kínder A)', 'Pre-kínder', 15, 'Preescolar'),
    ('Sala Amarilla (Pre-Kínder B)', 'Pre-kínder', 15, 'Preescolar'),
    ('Sala Roja (Kínder A)', 'Kínder', 15, 'Preescolar'),
    ('Sala Morada (Kínder B)', 'Kínder', 15, 'Preescolar'),
    ('Sala Fonoaudiología 1', 'Escuela de lenguaje (TEL)', 15, 'Salas TEL'),
    ('Sala Fonoaudiología 2', 'Escuela de lenguaje (TEL)', 15, 'Salas TEL')
ON CONFLICT (nombre) DO NOTHING;

-- Cuántos matriculados ficticios tiene cada sala (los mismos números que tenía HU-09).
WITH ocupacion (orden, sala, cantidad) AS (
    VALUES
        (1, 'Sala Naranja (Medio Mayor A)', 15),
        (2, 'Sala Azul (Medio Mayor B)', 13),
        (3, 'Sala Verde (Pre-Kínder A)', 14),
        (4, 'Sala Amarilla (Pre-Kínder B)', 8),
        (5, 'Sala Roja (Kínder A)', 15),
        (6, 'Sala Morada (Kínder B)', 10),
        (7, 'Sala Fonoaudiología 1', 12),
        (8, 'Sala Fonoaudiología 2', 14)
),
ficticios AS (
    SELECT o.sala,
           'DEMO-S' || o.orden || '-' || lpad(n::text, 2, '0') AS codigo,
           'Alumno Demo S' || o.orden || '-' || lpad(n::text, 2, '0') AS nombre
    FROM ocupacion o
    CROSS JOIN LATERAL generate_series(1, o.cantidad) AS n
),
alumnos_nuevos AS (
    INSERT INTO alumnos (codigo, nombre)
    SELECT codigo, nombre FROM ficticios
    ON CONFLICT (codigo) DO NOTHING
    RETURNING id, codigo
)
SELECT count(*) FROM alumnos_nuevos;

INSERT INTO matriculas (alumno_id, sala_id, anio_escolar, estado)
SELECT al.id, s.id, extract(year FROM now() AT TIME ZONE 'America/Santiago')::int, 'vigente'
FROM alumnos al
JOIN salas s ON s.nombre = CASE split_part(al.codigo, '-', 2)
    WHEN 'S1' THEN 'Sala Naranja (Medio Mayor A)'
    WHEN 'S2' THEN 'Sala Azul (Medio Mayor B)'
    WHEN 'S3' THEN 'Sala Verde (Pre-Kínder A)'
    WHEN 'S4' THEN 'Sala Amarilla (Pre-Kínder B)'
    WHEN 'S5' THEN 'Sala Roja (Kínder A)'
    WHEN 'S6' THEN 'Sala Morada (Kínder B)'
    WHEN 'S7' THEN 'Sala Fonoaudiología 1'
    WHEN 'S8' THEN 'Sala Fonoaudiología 2'
END
WHERE al.codigo LIKE 'DEMO-S%'
ON CONFLICT ON CONSTRAINT uq_matricula_alumno_anio DO NOTHING;
