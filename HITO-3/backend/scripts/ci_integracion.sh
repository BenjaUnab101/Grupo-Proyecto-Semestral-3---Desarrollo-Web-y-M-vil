#!/usr/bin/env bash
# CI · Integración real con Docker Compose (PostgreSQL 16 + MongoDB 7 + API + React).
#
#   bash scripts/ci_integracion.sh            # desde HITO-3/backend
#
# Usa SOLO credenciales ficticias de CI (se generan aquí si no existe .env). Nunca borra
# volúmenes de otro proyecto: trabaja con el proyecto Compose COMPOSE_PROJECT_NAME (por defecto
# "pr_ci") y al final ejecuta `down -v` SOLO si CI_LIMPIAR_VOLUMENES=si (en GitHub Actions).
#
# Fases: config sin APP_ENV (debe fallar) -> up con volúmenes nuevos -> migraciones V001-V007 ->
# seguridad (sonda H-02, rol/propiedad, identidad) -> regresiones -> down SIN -v + up ->
# persistencia -> transición a producción con el mismo volumen.
set -uo pipefail
cd "$(dirname "$0")/.."

export COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-pr_ci}"
export APP_ENV=development
export PERMITIR_IDENTIDAD_DEMO=false
# Contraseña FICTICIA y fija de CI para las cuentas @ejemplo.cl (solo development/test). Es fija para
# que una segunda ejecución sobre los mismos volúmenes siga pudiendo iniciar sesión.
export DEMO_PASSWORD="${DEMO_PASSWORD:-ci-demo-clave-ficticia}"
export MSYS_NO_PATHCONV=1

if [ ! -f .env ]; then
  # Credenciales ficticias solo para CI (archivo ignorado por Git).
  cat > .env <<EOF
POSTGRES_DB=pequenos_reyes_ci
POSTGRES_USER=ci_usuario
POSTGRES_PASSWORD=ci-clave-ficticia-$(date +%s)
MONGO_ROOT_USER=ci_root
MONGO_ROOT_PASSWORD=ci-root-ficticia-$(date +%s)
MONGO_APP_USER=ci_api
MONGO_APP_PASSWORD=ci-app-ficticia-$(date +%s)
EOF
fi

FALLAS=0
paso() { echo; echo "=================== $* ==================="; }
corre() {  # corre <descripción> <comando...>
  local d="$1"; shift
  if "$@"; then echo "[GATE PASS] $d"; else echo "[GATE FAIL] $d"; FALLAS=$((FALLAS + 1)); fi
}
dc() { docker compose "$@"; }
api() { dc exec -T api python -m "scripts.$1" "${@:2}"; }
esperar_sanos() {
  for _ in $(seq 1 60); do
    [ "$(dc ps --format '{{.Status}}' | grep -c healthy)" = "4" ] && return 0
    sleep 5
  done
  dc ps; return 1
}
api_sana() {
  for _ in $(seq 1 40); do dc ps api --format '{{.Status}}' | grep -q healthy && return 0; sleep 3; done
  return 1
}

paso "1. APP_ENV es obligatorio (R4 · Matiz A)"
corre "docker compose config sin APP_ENV falla" bash -c '! env -u APP_ENV docker compose config --quiet 2>/dev/null'
corre "docker compose config con APP_ENV=development" dc config --quiet

paso "2. Arranque con volúmenes nuevos"
# Solo se recrean los volúmenes del proyecto de CI (pr_ci*), nunca los de otro proyecto.
case "$COMPOSE_PROJECT_NAME" in pr_ci*) dc down -v --remove-orphans >/dev/null 2>&1 ;; *) echo "Proyecto no es de CI: no se recrean volúmenes"; exit 1 ;; esac
corre "docker compose up --build" dc up --build -d
corre "4 servicios healthy" esperar_sanos
dc ps --format '{{.Service}} | {{.Status}} | {{.Ports}}'

paso "3. Migraciones V001-V007"
MIGS=$(dc exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -A -t -c "SELECT version FROM schema_migraciones ORDER BY 1"' | tr -d '\r')
echo "$MIGS"
corre "schema_migraciones registra V001..V007" test "$(echo "$MIGS" | grep -c '^V00[1-7]__')" = "7"

paso "3b. Autenticación de bases de datos (volumen nuevo)"
corre "PostgreSQL y MongoDB exigen credenciales; cuenta Mongo de la API con privilegios mínimos" bash scripts/verificar_auth_bd.sh

paso "4. Seguridad H-01/H-02/H-03 (modo estricto: sin identidad demo)"
corre "sonda H-02: 0/12 rutas abiertas" api sonda_rutas_abiertas_s3
corre "rol y propiedad (aislamiento entre familias)" api prueba_cierre_h02
corre "identidad: X-Usuario-Id y X-Rol" api prueba_remediacion_s3 estricto

paso "5. Integración y regresiones del equipo (modo estricto)"
corre "Sprint 3 Daniel (crear)" api prueba_s3_daniel crear
corre "TEC-17" api prueba_tec17
corre "HU-19" api prueba_hu19
corre "HU-21" api prueba_hu21
corre "HU-25 (crear)" api prueba_hu25 crear
corre "TEC-16 (crear)" api prueba_tec16 crear
# Estado entre fases: ruta RELATIVA (funciona igual en Linux y en Docker Desktop de Windows).
ESTADO=.ci_estado; mkdir -p "$ESTADO"
corre "guardar estado de la fase crear" dc cp api:/tmp/prueba_s3_daniel.json "$ESTADO/s3.json"

paso "6. Persistencia: down SIN -v y up"
dc down
corre "volúmenes conservados" bash -c "docker volume ls --format '{{.Name}}' | grep -q '${COMPOSE_PROJECT_NAME}_postgres_data'"
dc up -d
corre "4 servicios healthy tras reinicio" esperar_sanos
corre "restaurar estado tras el reinicio" dc cp "$ESTADO/s3.json" api:/tmp/prueba_s3_daniel.json
corre "Sprint 3 Daniel (verificar)" api prueba_s3_daniel verificar
corre "TEC-16 (verificar)" api prueba_tec16 verificar
corre "HU-25 (verificar)" api prueba_hu25 verificar
corre "HU-25 (negativos)" api prueba_hu25 negativos

paso "7. Transición a producción con el mismo volumen (R4 · Matiz B)"
corre "preparar en desarrollo" api prueba_transicion_entorno_r4 preparar
corre "guardar estado de la transición" dc cp api:/tmp/transicion_r4.json "$ESTADO/tr.json"
env -u DEMO_PASSWORD APP_ENV=production PERMITIR_IDENTIDAD_DEMO=false docker compose up -d --no-deps api
corre "API sana en producción" api_sana
corre "restaurar estado en producción" env APP_ENV=production docker compose cp "$ESTADO/tr.json" api:/tmp/transicion_r4.json
corre "verificar en producción (demo bloqueada, legítimo funciona)" env APP_ENV=production docker compose exec -T api python -m scripts.prueba_transicion_entorno_r4 verificar
corre "sonda H-02 en producción" env APP_ENV=production docker compose exec -T api python -m scripts.sonda_rutas_abiertas_s3
corre "producción no inicia con identidad demo" bash -c '! env APP_ENV=production PERMITIR_IDENTIDAD_DEMO=true docker compose run --rm --no-deps -T api python -c "import app.main" >/dev/null 2>&1'
rm -rf "$ESTADO"

if [ "${CI_REMEDIACION_BD:-no}" = "si" ]; then
  # Solo en GitHub Actions (cambia credenciales del .env ficticio de CI).
  paso "8. Rotación de PostgreSQL en el volumen existente"
  APP_ENV=development docker compose up -d >/dev/null 2>&1
  corre "rotación con clave generada (anterior rechazada, nueva aceptada)" env APP_ENV=development ROTAR_GENERAR=si bash scripts/rotar_clave_postgres.sh
  corre "autenticación tras la rotación" env APP_ENV=development bash scripts/verificar_auth_bd.sh
  corre "datos conservados tras la rotación (TEC-16 verificar)" env APP_ENV=development docker compose exec -T api python -m scripts.prueba_tec16 verificar

  paso "9. MongoDB existente sin autenticación -> habilitar sin perder documentos"
  APP_ENV=development docker compose stop >/dev/null 2>&1   # libera los puertos de pr_ci
  PROYECTO_CI="$COMPOSE_PROJECT_NAME"; export COMPOSE_PROJECT_NAME="${PROYECTO_CI}_legado"
  docker volume rm -f ${COMPOSE_PROJECT_NAME}_mongo_data >/dev/null 2>&1
  docker volume create ${COMPOSE_PROJECT_NAME}_mongo_data >/dev/null
  docker run -d --name ${COMPOSE_PROJECT_NAME}_sin_auth -v ${COMPOSE_PROJECT_NAME}_mongo_data:/data/db mongo:7 >/dev/null
  for _ in $(seq 1 30); do docker exec ${COMPOSE_PROJECT_NAME}_sin_auth mongosh --quiet --eval 'db.adminCommand("ping").ok' >/dev/null 2>&1 && break; sleep 2; done
  docker exec ${COMPOSE_PROJECT_NAME}_sin_auth mongosh --quiet --eval 'const d=db.getSiblingDB("pequenos_reyes"); for (let i=0;i<25;i++) d.auditoria_eventos.insertOne({tipo:"legado",i:i,fecha:new Date()})' >/dev/null
  docker rm -f ${COMPOSE_PROJECT_NAME}_sin_auth >/dev/null
  cat > docker-compose.legado.yml <<'YML'
volumes:
  mongo_data:
    external: true
    name: ${COMPOSE_PROJECT_NAME}_mongo_data
YML
  dcl() { APP_ENV=development docker compose -f docker-compose.yml -f docker-compose.legado.yml "$@"; }
  corre "habilitar_auth_mongo.sh sobre el volumen existente" env APP_ENV=development COMPOSE_FILE=docker-compose.yml:docker-compose.legado.yml bash scripts/habilitar_auth_mongo.sh
  corre "documentos conservados (25)" test "$(dcl exec -T mongo mongosh --quiet --eval 'const d=db.getSiblingDB("pequenos_reyes"); d.auth(process.env.MONGO_APP_USER,process.env.MONGO_APP_PASSWORD); print(d.auditoria_eventos.countDocuments({tipo:"legado"}))' | tr -d '\r' | tail -n 1)" = 25
  corre "sin credenciales no se consultan datos" test "$(dcl exec -T mongo mongosh --quiet --eval 'try{db.getSiblingDB("pequenos_reyes").auditoria_eventos.findOne();print("LEE")}catch(e){print("DENEGADO")}' | tr -d '\r' | tail -n 1)" = DENEGADO
  dcl down >/dev/null 2>&1; docker volume rm -f ${COMPOSE_PROJECT_NAME}_mongo_data >/dev/null 2>&1; rm -f docker-compose.legado.yml
  export COMPOSE_PROJECT_NAME="$PROYECTO_CI"
fi

if [ "${CI_LIMPIAR_VOLUMENES:-no}" = "si" ]; then
  APP_ENV=development docker compose down -v
fi

echo
echo "=================== RESULTADO: $FALLAS fallas ==================="
exit $((FALLAS > 0))
