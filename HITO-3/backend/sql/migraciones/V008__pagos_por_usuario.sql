-- V008: vincula cada comprobante de pago simulado con el usuario autenticado que lo emitió.
-- Permite consultar "Mis comprobantes" (GET /api/v1/pagos/mios) de forma segura.

ALTER TABLE inscripciones_pagos
    ADD COLUMN IF NOT EXISTS usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS ix_inscripciones_pagos_usuario_id
    ON inscripciones_pagos(usuario_id);