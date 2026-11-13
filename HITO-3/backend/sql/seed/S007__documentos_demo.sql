-- S007: documentos y protocolos institucionales iniciales en PostgreSQL (idempotente).

INSERT INTO documentos_institucionales (
    titulo, categoria, descripcion, url_archivo, vigente, fecha_actualizacion
)
VALUES
    (
        'Reglamento Interno y de Convivencia Escolar 2026',
        'Reglamentos',
        'Normativa oficial de funcionamiento, horarios de ingreso y retiro, derechos y deberes de la comunidad educativa.',
        NULL,
        TRUE,
        CURRENT_DATE
    ),
    (
        'Protocolo de Salud, Alergias e Inasistencias',
        'Protocolos',
        'Directrices para la administración de medicamentos con receta médica, manejo de alergias alimentarias y aviso de inasistencias.',
        NULL,
        TRUE,
        CURRENT_DATE
    ),
    (
        'Plan Integral de Seguridad Escolar (PISE)',
        'Protocolos',
        'Zonas de seguridad, vías de evacuación y procedimientos de actuación ante sismos, emergencias sanitarias y retiro anticipado.',
        NULL,
        TRUE,
        CURRENT_DATE
    ),
    (
        'Ficha de Antecedentes de Salud y Autorización de Retiro',
        'Formularios',
        'Formulario obligatorio para declarar contactos de emergencia, personas autorizadas para el retiro y observaciones de salud del párvulo.',
        NULL,
        TRUE,
        CURRENT_DATE
    )
ON CONFLICT (titulo) DO UPDATE
SET categoria = EXCLUDED.categoria,
    descripcion = EXCLUDED.descripcion,
    vigente = EXCLUDED.vigente;