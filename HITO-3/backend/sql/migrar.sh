#!/bin/sh
# TEC-16 · Ejecutor de migraciones de PostgreSQL de Pequeños Reyes.
#
# Uso (desde HITO-3/backend, con docker compose levantado):
#   docker compose exec postgres sh /sql/migrar.sh
#
# En una base NUEVA (volumen vacío) se ejecuta solo, desde
# /docker-entrypoint-initdb.d/00_migrar.sh, la primera vez que arranca PostgreSQL.
#
# Qué hace:
#   1. Crea la tabla schema_migraciones si no existe.
#   2. Aplica en orden las migraciones /sql/migraciones/V###__descripcion.sql que falten.
#      Cada migración y su registro se aplican en UNA transacción: si algo falla, no queda
#      nada a medias y el script se detiene.
#   3. Si una migración ya aplicada fue MODIFICADA (otra suma SHA-256), se detiene con error:
#      los cambios de esquema se hacen siempre con una migración nueva.
#   4. Carga los datos de demostración de /sql/seed/*.sql (idempotentes, solo ficticios).
#      Para omitirlos: CARGAR_SEED=no
#
# Variables opcionales:
#   SQL_DIR      carpeta base (por defecto /sql)
#   PSQL_CMD     comando psql completo (por defecto usa POSTGRES_USER y POSTGRES_DB)
#   CARGAR_SEED  si | no (por defecto si)

set -eu

SQL_DIR="${SQL_DIR:-/sql}"
PSQL_CMD="${PSQL_CMD:-psql --username=${POSTGRES_USER} --dbname=${POSTGRES_DB}}"
CARGAR_SEED="${CARGAR_SEED:-si}"

# Oculta los avisos NOTICE (por ejemplo "already exists, skipping"); los errores sí se muestran.
PGOPTIONS="${PGOPTIONS:-} -c client_min_messages=warning"
export PGOPTIONS

psql_q() {
    # -X: no lee .psqlrc · ON_ERROR_STOP: cualquier error detiene el archivo
    $PSQL_CMD -X -q -v ON_ERROR_STOP=1 "$@"
}

echo "== Migraciones de PostgreSQL (${SQL_DIR}/migraciones) =="

psql_q -c "CREATE TABLE IF NOT EXISTS schema_migraciones (
    version VARCHAR(10) PRIMARY KEY,
    descripcion VARCHAR(200) NOT NULL,
    checksum CHAR(64) NOT NULL,
    aplicada_en TIMESTAMPTZ NOT NULL DEFAULT now()
);" >/dev/null

aplicadas=0
for archivo in $(ls "${SQL_DIR}"/migraciones/V*__*.sql | sort); do
    nombre=$(basename "$archivo" .sql)
    version=${nombre%%__*}
    descripcion=${nombre#*__}

    # Se quitan los \r para que Windows (CRLF) y Linux (LF) calculen la misma suma.
    suma=$(tr -d '\r' < "$archivo" | sha256sum | cut -d ' ' -f 1)
    registrada=$(psql_q -t -A -c "SELECT checksum FROM schema_migraciones WHERE version = '${version}'")

    if [ -n "$registrada" ]; then
        if [ "$registrada" != "$suma" ]; then
            echo "ERROR: ${nombre} ya estaba aplicada, pero el archivo cambió."
            echo "       No edites migraciones aplicadas: crea una nueva (V### siguiente)."
            exit 1
        fi
        echo "  = ${nombre} (ya aplicada)"
        continue
    fi

    {
        tr -d '\r' < "$archivo"
        printf '\nINSERT INTO schema_migraciones (version, descripcion, checksum) VALUES (%s, %s, %s);\n' \
            "'${version}'" "'${descripcion}'" "'${suma}'"
    } | psql_q --single-transaction -f - 2>&1 | grep -v -E "NOTICE:|^$" || true

    if [ "$(psql_q -t -A -c "SELECT count(*) FROM schema_migraciones WHERE version = '${version}'")" != "1" ]; then
        echo "ERROR: ${nombre} falló y se deshizo completa (no quedó nada a medias)."
        exit 1
    fi
    echo "  + ${nombre} aplicada"
    aplicadas=$((aplicadas + 1))
done
echo "Migraciones nuevas aplicadas: ${aplicadas}"

if [ "$CARGAR_SEED" = "si" ]; then
    echo "== Datos de demostración (${SQL_DIR}/seed) =="
    for archivo in $(ls "${SQL_DIR}"/seed/*.sql 2>/dev/null | sort); do
        tr -d '\r' < "$archivo" | psql_q --single-transaction -f - >/dev/null
        echo "  + $(basename "$archivo") cargado"
    done
fi

echo "Listo."
