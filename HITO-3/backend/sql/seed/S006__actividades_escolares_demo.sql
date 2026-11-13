-- S006: organizadores, 4 categorías y 4 actividades escolares con fechas relativas (idempotente).

INSERT INTO organizadores (nombre, email, rol_perfil, telefono, activo)
VALUES
    ('Educadora Demo', 'educadora.demo@ejemplo.cl', 'Educadora', '+56987654321', TRUE),
    ('Dirección Pequeños Reyes', 'direccion.demo@ejemplo.cl', 'Dirección', '+56322960500', TRUE),
    ('Equipo Fonoaudiológico', 'fonoaudiologia.demo@ejemplo.cl', 'Fonoaudióloga', '+56912345678', TRUE)
ON CONFLICT (email) DO UPDATE
SET nombre = EXCLUDED.nombre,
    rol_perfil = EXCLUDED.rol_perfil,
    telefono = EXCLUDED.telefono,
    activo = TRUE;

INSERT INTO categorias_actividad (nombre, descripcion, activa)
VALUES
    ('Pedagógica y Lenguaje', 'Talleres de estimulación fonoaudiológica y expresión oral.', TRUE),
    ('Comunidad y Familia', 'Reuniones de apoderados, muestras artísticas y convivencia.', TRUE),
    ('Deporte y Psicomotricidad', 'Circuitos motrices, jornadas recreativas y patio activo.', TRUE),
    ('Salidas y Visitas', 'Actividades guiadas y experiencias educativas del entorno.', TRUE)
ON CONFLICT (nombre) DO UPDATE
SET descripcion = EXCLUDED.descripcion,
    activa = TRUE;

INSERT INTO actividades_escolares (
    titulo, fecha, hora, lugar, preparar, capacidad, cupos_ocupados, estado, categoria_id, organizador_id
)
SELECT
    v.titulo,
    v.fecha,
    v.hora,
    v.lugar,
    v.preparar,
    v.capacidad,
    v.cupos_ocupados,
    v.estado,
    c.id,
    o.id
FROM (
    VALUES
        (
            'Taller Familiar de Estimulación del Lenguaje',
            CURRENT_DATE + 3,
            '10:30',
            'Sala Multiuso TEL',
            'Traer cuaderno de fonoaudiología y botella de agua marcada.',
            15,
            2,
            'publicada',
            'Pedagógica y Lenguaje',
            'fonoaudiologia.demo@ejemplo.cl'
        ),
        (
            'Muestra Artística y Convivencia dePrimavera',
            CURRENT_DATE + 6,
            '11:00',
            'Patio Central Cubierto',
            'Asistir con gorro para el sol, bloqueador y colación saludable.',
            25,
            5,
            'publicada',
            'Comunidad y Familia',
            'educadora.demo@ejemplo.cl'
        ),
        (
            'Jornada de Psicomotricidad y Juegos Cooperativos',
            CURRENT_DATE + 12,
            '09:30',
            'Patio Activo',
            'Venir con buzo institucional, zapatillas cómodas y muda de ropa.',
            20,
            0,
            'publicada',
            'Deporte y Psicomotricidad',
            'educadora.demo@ejemplo.cl'
        ),
        (
            'Reunión General de Apoderados y Cierre Semestral',
            CURRENT_DATE + 18,
            '18:00',
            'Salón Principal',
            'Revisión de avances pedagógicos (reunión exclusiva para adultos).',
            30,
            4,
            'publicada',
            'Comunidad y Familia',
            'direccion.demo@ejemplo.cl'
        )
) AS v(titulo, fecha, hora, lugar, preparar, capacidad, cupos_ocupados, estado, cat_nombre, org_email)
JOIN categorias_actividad c ON c.nombre = v.cat_nombre
JOIN organizadores o ON o.email = v.org_email
WHERE NOT EXISTS (
    SELECT 1 FROM actividades_escolares a WHERE a.titulo = v.titulo
);