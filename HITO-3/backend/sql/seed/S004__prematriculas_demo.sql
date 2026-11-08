-- S004 · HU-25: solicitudes de pre-matrícula FICTICIAS para la demo. Se puede cargar varias veces.
-- Para probar el seguimiento sin llenar el formulario:
--     PM-DEMAA2 + familia.demo1@ejemplo.cl → En revisión
--     PM-DEMBB3 + familia.demo2@ejemplo.cl → Recibida
--     PM-DEMCC4 + familia.demo3@ejemplo.cl → Lista de espera

INSERT INTO solicitudes_prematricula
    (codigo, nombre_apoderado, rut, correo, telefono, nombre_parvulo, nivel, comentario, estado, mensaje_familia, creada_en)
VALUES
    ('PM-DEMAA2', 'Familia Demo Uno', '11111111-1', 'familia.demo1@ejemplo.cl', '911111111', 'Párvulo Demo Uno',
     'medio-mayor', 'Solicitud ficticia de demostración.', 'en_revision',
     'Estamos revisando tu solicitud. Te contactaremos por correo.', now() - interval '6 days'),
    ('PM-DEMBB3', 'Familia Demo Dos', '22222222-2', 'familia.demo2@ejemplo.cl', '922222222', 'Párvulo Demo Dos',
     'sala-tel', NULL, 'recibida', NULL, now() - interval '1 day'),
    ('PM-DEMCC4', 'Familia Demo Tres', '33333333-3', 'familia.demo3@ejemplo.cl', '933333333', 'Párvulo Demo Tres',
     'transicion-1', NULL, 'lista_espera', 'Por ahora no quedan cupos en este nivel. Quedaste en lista de espera.',
     now() - interval '10 days')
ON CONFLICT (codigo) DO NOTHING;
