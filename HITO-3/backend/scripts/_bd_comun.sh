# Funciones comunes de los scripts de credenciales (se carga con "source"). Nunca imprime secretos.
cd "$(dirname "${BASH_SOURCE[0]}")/.."
export APP_ENV="${APP_ENV:-development}"
export MSYS_NO_PATHCONV=1
# Archivo de credenciales del entorno (ignorado por Git). Uno por proyecto Compose, p. ej. .env.pr_cierre.
ENV_FILE="${ENV_FILE:-.env}"
[ -f "$ENV_FILE" ] || { echo "No existe $ENV_FILE"; exit 1; }
PY="$(command -v python3 >/dev/null 2>&1 && python3 -c 'import sys' 2>/dev/null && echo python3 || echo python)"
dc() { docker compose --env-file "$ENV_FILE" "$@"; }
valor_env() { { grep -m1 "^$1=" "$ENV_FILE" 2>/dev/null || true; } | cut -d= -f2- | tr -d '\r'; }
clave_valida() { [[ "$1" =~ ^[A-Za-z0-9_-]{16,128}$ ]]; }
generar_clave() { "$PY" -c "import secrets;print(secrets.token_urlsafe(32))"; }
# fijar_env NOMBRE VALOR: reemplaza o agrega la línea en .env sin mostrar el valor.
fijar_env() {
  VAR_ARCHIVO="$ENV_FILE" VAR_NOMBRE="$1" VAR_VALOR="$2" "$PY" -c '
import os
n, v = os.environ["VAR_NOMBRE"], os.environ["VAR_VALOR"]
lineas = open(os.environ["VAR_ARCHIVO"], encoding="utf-8").read().splitlines()
hecho = False
for i, l in enumerate(lineas):
    if l.split("=", 1)[0] == n:
        lineas[i] = n + "=" + v
        hecho = True
if not hecho:
    lineas.append(n + "=" + v)
open(os.environ["VAR_ARCHIVO"], "w", encoding="utf-8", newline="\n").write("\n".join(lineas) + "\n")
'
}
esperar_servicio() {  # esperar_servicio <servicio>
  for _ in $(seq 1 60); do dc ps "$1" --format '{{.Status}}' | grep -q healthy && return 0; sleep 3; done
  return 1
}
