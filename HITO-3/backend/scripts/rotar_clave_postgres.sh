#!/usr/bin/env bash
# Remediación BD · PostgreSQL: rotación controlada de la contraseña del usuario de la aplicación.
#
#   bash scripts/rotar_clave_postgres.sh                    # pide la nueva clave (no se muestra)
#   ROTAR_GENERAR=si bash scripts/rotar_clave_postgres.sh   # genera una clave aleatoria
#
# Conserva el volumen, las tablas y los registros: solo ejecuta ALTER ROLE ... PASSWORD.
# La clave nueva llega a psql por la entrada estándar (no aparece en la línea de comandos) y se
# guarda únicamente en .env (ignorado por Git). Después recrea postgres y la API y comprueba por
# TCP, con el mismo controlador de la API, que la clave anterior ya no sirve y la nueva sí.
# Varios proyectos Compose que comparten este .env: rotar el primero normalmente y los demás con
# ROTAR_CLAVE_ANTERIOR (la clave vieja) para aplicar a sus volúmenes la clave ya guardada en .env.
set -euo pipefail
source "$(dirname "$0")/_bd_comun.sh"

USUARIO="$(valor_env POSTGRES_USER)"
if [ -n "${ROTAR_CLAVE_ANTERIOR:-}" ]; then
  # Volumen adicional: la clave nueva ya está en .env.
  CLAVE_VIEJA="$ROTAR_CLAVE_ANTERIOR"; NUEVA="$(valor_env POSTGRES_PASSWORD)"
else
  CLAVE_VIEJA="$(valor_env POSTGRES_PASSWORD)"
  if [ "${ROTAR_GENERAR:-no}" = "si" ]; then
    NUEVA="$(generar_clave)"
  else
    read -rsp "Nueva contraseña de PostgreSQL (16+ caracteres: letras, números, - o _): " NUEVA; echo
    read -rsp "Repítela: " NUEVA2; echo
    [ "$NUEVA" = "$NUEVA2" ] || { echo "No coinciden."; exit 1; }
  fi
fi
clave_valida "$NUEVA" || { echo "Clave no válida: 16-128 caracteres, solo letras, números, - y _."; exit 1; }
[ "$NUEVA" != "$CLAVE_VIEJA" ] || { echo "La clave nueva es igual a la anterior."; exit 1; }

echo "Proyecto: ${COMPOSE_PROJECT_NAME:-(carpeta)} · usuario de la aplicación: $USUARIO"
dc up -d --no-deps postgres
esperar_servicio postgres
printf '\\set nueva %s\nALTER ROLE "%s" WITH PASSWORD :'"'"'nueva'"'"';\n' "$NUEVA" "$USUARIO" \
  | dc exec -T postgres sh -c 'psql -v ON_ERROR_STOP=1 -q -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
echo "ALTER ROLE aplicado."

if [ -z "${ROTAR_CLAVE_ANTERIOR:-}" ]; then
  fijar_env POSTGRES_PASSWORD "$NUEVA"
  URL="$(valor_env DATABASE_URL)"
  if [ -n "$URL" ]; then fijar_env DATABASE_URL "${URL/$CLAVE_VIEJA/$NUEVA}"; fi
  echo ".env actualizado (POSTGRES_PASSWORD y DATABASE_URL)."
fi

dc up -d
esperar_servicio api
export CLAVE_VIEJA CLAVE_NUEVA="$NUEVA"
dc exec -T -e CLAVE_VIEJA -e CLAVE_NUEVA api python -c '
import os, sys, psycopg
from urllib.parse import urlsplit
u = urlsplit(os.environ["DATABASE_URL"].replace("+psycopg", ""))
def entra(clave):
    try:
        psycopg.connect(host=u.hostname, port=u.port or 5432, dbname=u.path.lstrip("/"), user=u.username, password=clave, connect_timeout=5).close()
        return True
    except psycopg.OperationalError:
        return False
vieja, nueva = entra(os.environ["CLAVE_VIEJA"]), entra(os.environ["CLAVE_NUEVA"])
print(f"clave anterior acepta: {vieja} · clave nueva acepta: {nueva}")
sys.exit(0 if (not vieja and nueva) else 1)
'
echo "Rotación completada."
