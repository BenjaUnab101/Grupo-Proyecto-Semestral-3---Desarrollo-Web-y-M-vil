#!/bin/sh
# TEC-16 · Aplica las migraciones de PostgreSQL y carga los datos de demostración.
#
# Uso (desde HITO-3/backend, con docker compose levantado):
#   docker compose exec postgres sh /sql/migrar.sh
# Con una base NUEVA se ejecuta solo la primera vez (sql/initdb/00_migrar.sh).
#
# 1. Aplica, en orden, las migraciones sql/migraciones/V###__nombre.sql que todavía no están
#    en la tabla schema_migraciones. Cada una va en UNA transacción: si falla, no queda a medias.
# 2. Carga sql/seed/*.sql (datos ficticios; se pueden cargar varias veces sin duplicar).
#    Para omitirlos: CARGAR_SEED=no
# Nunca edites una migración ya aplicada: crea una nueva con el número siguiente.

set -eu
SQL_DIR="${SQL_DIR:-/sql}"
PSQL_CMD="${PSQL_CMD:-psql --username=${POSTGRES_USER} --dbname=${POSTGRES_DB}}"
PSQL="$PSQL_CMD -X -q -v ON_ERROR_STOP=1"
export PGOPTIONS="-c client_min_messages=warning"   # oculta los avisos NOTICE

$PSQL -c "CREATE TABLE IF NOT EXISTS schema_migraciones (
    version VARCHAR(200) PRIMARY KEY,
    aplicada_en TIMESTAMPTZ NOT NULL DEFAULT now()
);"

echo "== Migraciones =="
for archivo in $(ls "$SQL_DIR"/migraciones/V*.sql | sort); do
    version=$(basename "$archivo" .sql)
    if [ -n "$($PSQL -t -A -c "SELECT 1 FROM schema_migraciones WHERE version = '$version'")" ]; then
        echo "  = $version (ya aplicada)"
        continue
    fi
    # tr quita los \r por si el archivo se guardó en Windows.
    { tr -d '\r' < "$archivo"; echo; echo "INSERT INTO schema_migraciones (version) VALUES ('$version');"; } \
        | $PSQL --single-transaction -f -
    echo "  + $version aplicada"
done

if [ "${CARGAR_SEED:-si}" = "si" ]; then
    echo "== Datos de demostración =="
    for archivo in $(ls "$SQL_DIR"/seed/*.sql | sort); do
        tr -d '\r' < "$archivo" | $PSQL --single-transaction -f - >/dev/null
        echo "  + $(basename "$archivo") cargado"
    done
fi
echo "Listo."
