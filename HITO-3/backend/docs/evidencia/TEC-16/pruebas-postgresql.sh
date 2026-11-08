#!/bin/bash
# TEC-16 · Pruebas del modelo y las migraciones directamente en PostgreSQL.
# Uso con Docker (Git Bash, desde HITO-3/backend):
#   bash docs/evidencia/TEC-16/pruebas-postgresql.sh
# Crea bases temporales (tec16_*), las prueba y las borra. No toca la base pequenos_reyes.
# Variables opcionales: PSQL_BASE (psql sin -d) y MIGRAR_LOCAL (para ejecutarlo sin Docker).
set -u
PSQL_BASE=${PSQL_BASE:-"docker compose exec -T postgres psql -U pequenos_reyes"}
# MIGRAR_LOCAL: solo para ejecutar sin Docker (ruta a sql/migrar.sh); con Docker se deja vacío.
MIGRAR_LOCAL=${MIGRAR_LOCAL:-}
q() { $PSQL_BASE -d "$1" -X -q -t -A -c "$2" 2>&1 | tr -d '\r'; }
crear_bd() { q postgres "DROP DATABASE IF EXISTS $1" >/dev/null; q postgres "CREATE DATABASE $1" >/dev/null; }
migrar() {
    if [ -n "$MIGRAR_LOCAL" ]; then
        PSQL_CMD="psql --username=pequenos_reyes --dbname=$1" CARGAR_SEED=${2:-si} sh "$MIGRAR_LOCAL"
    else
        docker compose exec -T -e "PSQL_CMD=psql --username=pequenos_reyes --dbname=$1" -e "CARGAR_SEED=${2:-si}" \
            postgres sh /sql/migrar.sh
    fi
}

echo "=== CA1 · Migraciones desde una base VACÍA ==="
crear_bd tec16_vacia
migrar tec16_vacia
echo "--- segunda ejecución (no debe aplicar nada nuevo ni duplicar datos)"
migrar tec16_vacia | grep -E "aplicada|ERROR"
q tec16_vacia "SELECT 'schema_migraciones: ' || string_agg(version, ', ' ORDER BY version) FROM schema_migraciones"
q tec16_vacia "SELECT 'filas: institucion=' || (SELECT count(*) FROM institucion) || ' categorias=' || (SELECT count(*) FROM categorias) || ' usuarios=' || (SELECT count(*) FROM usuarios) || ' organizadores=' || (SELECT count(*) FROM organizadores) || ' apoderados=' || (SELECT count(*) FROM apoderados) || ' alumnos=' || (SELECT count(*) FROM alumnos) || ' actividades=' || (SELECT count(*) FROM actividades)"

echo; echo "=== CA2 · Restricciones (cada caso debe ser RECHAZADO por PostgreSQL) ==="
D=tec16_vacia
I=$(q $D "INSERT INTO inscripciones (actividad_id, alumno_id, apoderado_id) SELECT a.id, al.id, ap.id FROM actividades a, alumnos al, apoderados ap WHERE a.codigo='DEMO-SALIDA-GRANJA' AND al.codigo='DEMO-A01' AND ap.email='apoderado.demo1@ejemplo.cl' RETURNING id")
ok() { out=$(q $D "$2"); case "$out" in *ERROR*) echo "FALLA    $1 ($out)";; *) echo "OK       $1";; esac; }
ok "pago simulado válido aceptado" "INSERT INTO pagos (inscripcion_id, monto, referencia) VALUES ($I, 3500, 'SIM-0001')"
t() { out=$(q $D "$2"); r=$(echo "$out" | grep -oE 'violates [a-z ]+constraint "[a-z_]+"' | head -1); if [ -n "$r" ]; then echo "RECHAZA  $1 ($r)"; else echo "FALLA    $1 (${out:-se aceptó})"; fi; }
t "2º pago aprobado de la misma inscripción" "INSERT INTO pagos (inscripcion_id, monto, referencia) VALUES ($I, 3500, 'SIM-0002')"
t "pago con método tarjeta" "INSERT INTO pagos (inscripcion_id, monto, metodo, referencia) VALUES ($I, 3500, 'tarjeta', 'SIM-0003')"
t "pago con referencia no simulada" "INSERT INTO pagos (inscripcion_id, monto, referencia) VALUES ($I, 3500, 'TX-998877')"
t "pago con monto 0" "INSERT INTO pagos (inscripcion_id, monto, referencia) VALUES ($I, 0, 'SIM-0004')"
t "pago de inscripción inexistente" "INSERT INTO pagos (inscripcion_id, monto, referencia) VALUES (999999, 100, 'SIM-0005')"
t "segunda fila de institución" "INSERT INTO institucion (id,nombre,tipo,direccion,comuna,region) VALUES (2,'x','x','x','x','x')"
t "usuario con rol inventado" "INSERT INTO usuarios (email,password_hash,rol) VALUES ('a@ejemplo.cl','x','superadmin')"
t "usuario apoderado sin apoderado_id" "INSERT INTO usuarios (email,password_hash,rol) VALUES ('b@ejemplo.cl','x','apoderado')"
t "usuario con email en mayúsculas" "INSERT INTO usuarios (email,password_hash,rol) VALUES ('C@Ejemplo.cl','x','administrador')"
t "usuario con email repetido" "INSERT INTO usuarios (email,password_hash,rol) VALUES ('direccion.demo@ejemplo.cl','x','administrador')"
t "categoría repetida" "INSERT INTO categorias (nombre) VALUES ('Taller')"
t "actividad con costo negativo" "UPDATE actividades SET costo=-1 WHERE codigo='DEMO-CUPO-REDUCIDO'"
t "actividad con categoría inexistente" "UPDATE actividades SET categoria_id=999 WHERE codigo='DEMO-CUPO-REDUCIDO'"
t "inscripción duplicada" "INSERT INTO inscripciones (actividad_id, alumno_id, apoderado_id) SELECT actividad_id, alumno_id, apoderado_id FROM inscripciones WHERE id=$I"
t "borrar categoría usada por actividades" "DELETE FROM categorias WHERE nombre='Taller'"
t "borrar inscripción que tiene pagos" "DELETE FROM inscripciones WHERE id=$I"
t "borrar alumno con inscripciones" "DELETE FROM alumnos WHERE codigo='DEMO-A01'"
ok "nuevo pago aceptado tras reembolsar el anterior (índice único parcial)" "UPDATE pagos SET estado='reembolsado' WHERE referencia='SIM-0001'; INSERT INTO pagos (inscripcion_id, monto, referencia) VALUES ($I, 3500, 'SIM-0006')"

echo; echo "=== Migración que falla: se deshace completa ==="
crear_bd tec16_falla
r=$( { echo "CREATE TABLE tabla_a_medias (id int);"; echo "SELECT * FROM tabla_que_no_existe;"; } | $PSQL_BASE -d tec16_falla -X -q -v ON_ERROR_STOP=1 --single-transaction -f - 2>&1 | tr -d '\r' | grep ERROR)
echo "error: $r"
q tec16_falla "SELECT 'tabla_a_medias existe después del error? ' || (to_regclass('tabla_a_medias') IS NOT NULL)"

echo; echo "=== CA5 · Solo datos de demostración en la semilla ==="
q $D "SELECT 'datos fuera de @ejemplo.cl / DEMO-*: ' || count(*) FROM (SELECT email FROM apoderados WHERE email NOT LIKE '%@ejemplo.cl' UNION ALL SELECT email FROM usuarios WHERE email NOT LIKE '%@ejemplo.cl' UNION ALL SELECT email FROM organizadores WHERE email NOT LIKE '%@ejemplo.cl' UNION ALL SELECT codigo FROM alumnos WHERE codigo NOT LIKE 'DEMO-%') x"
q $D "SELECT 'alumnos con fecha de nacimiento guardada: ' || count(*) FROM alumnos WHERE fecha_nacimiento IS NOT NULL"

for b in tec16_vacia tec16_falla; do q postgres "DROP DATABASE IF EXISTS $b" >/dev/null; done
echo; echo "Bases temporales borradas."
