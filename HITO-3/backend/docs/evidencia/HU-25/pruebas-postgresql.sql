-- HU-25 · Reglas de la tabla solicitudes_prematricula. Todo va dentro de una transacción que
-- se deshace al final (ROLLBACK): no deja datos.
-- Uso (desde HITO-3/backend, con docker compose levantado):
--   docker compose exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < docs/evidencia/HU-25/pruebas-postgresql.sql
\set ON_ERROR_STOP 0
\echo '== Solicitudes demo (S004) =='
SELECT codigo, estado, nivel, correo FROM solicitudes_prematricula WHERE codigo LIKE 'PM-DEM%' ORDER BY codigo;
BEGIN;
\echo '== 1. Solicitud válida (se guarda) =='
INSERT INTO solicitudes_prematricula (codigo, nombre_apoderado, rut, correo, telefono, nombre_parvulo, nivel)
VALUES ('PM-TSTAA2', 'Familia Test', '12345678-5', 'familia.test@ejemplo.cl', '912345678', 'Párvulo Test', 'medio-mayor');
SAVEPOINT s;
\echo '== 2. Otra solicitud en curso para el mismo párvulo y nivel -> rechazada =='
INSERT INTO solicitudes_prematricula (codigo, nombre_apoderado, rut, correo, telefono, nombre_parvulo, nivel)
VALUES ('PM-TSTBB3', 'Familia Test', '12345678-5', 'familia.test@ejemplo.cl', '912345678', 'Párvulo Test', 'medio-mayor');
ROLLBACK TO SAVEPOINT s;
\echo '== 3. Nivel que no existe -> rechazado =='
INSERT INTO solicitudes_prematricula (codigo, nombre_apoderado, rut, correo, telefono, nombre_parvulo, nivel)
VALUES ('PM-TSTCC4', 'Familia Test', '12345678-5', 'familia.test@ejemplo.cl', '912345678', 'Otro', 'kinder-z');
ROLLBACK TO SAVEPOINT s;
\echo '== 4. Estado que no existe -> rechazado =='
UPDATE solicitudes_prematricula SET estado = 'aprobada' WHERE codigo = 'PM-TSTAA2';
ROLLBACK TO SAVEPOINT s;
\echo '== 5. Código repetido -> rechazado =='
INSERT INTO solicitudes_prematricula (codigo, nombre_apoderado, rut, correo, telefono, nombre_parvulo, nivel)
VALUES ('PM-TSTAA2', 'Otra Familia', '11111111-1', 'otra@ejemplo.cl', '911111111', 'Otro', 'sala-tel');
ROLLBACK TO SAVEPOINT s;
\echo '== 6. Si la anterior fue rechazada, la familia puede volver a postular =='
UPDATE solicitudes_prematricula SET estado = 'rechazada' WHERE codigo = 'PM-TSTAA2';
INSERT INTO solicitudes_prematricula (codigo, nombre_apoderado, rut, correo, telefono, nombre_parvulo, nivel)
VALUES ('PM-TSTDD5', 'Familia Test', '12345678-5', 'familia.test@ejemplo.cl', '912345678', 'Párvulo Test', 'medio-mayor');
ROLLBACK;
\echo '== Fin (ROLLBACK: no quedó ningún dato de prueba) =='
SELECT count(*) AS solicitudes_test FROM solicitudes_prematricula WHERE codigo LIKE 'PM-TST%';
