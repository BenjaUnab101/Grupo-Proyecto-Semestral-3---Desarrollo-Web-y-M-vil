#!/usr/bin/env bash
# Remediación BD · MongoDB: habilita la autenticación en un volumen EXISTENTE sin borrar datos.
#
#   bash scripts/habilitar_auth_mongo.sh        # desde HITO-3/backend, con el proyecto Compose deseado
#
# Por qué hace falta: MONGO_INITDB_ROOT_* solo actúa con un volumen vacío. En un volumen que ya
# tiene datos, la imagen no crea ninguna cuenta. Este script:
#   1. Completa en .env las cuentas que falten (claves aleatorias, nunca se muestran).
#   2. Recrea solo el contenedor mongo con --auth (el volumen se conserva).
#   3. Crea la cuenta root mediante la excepción de localhost (solo posible mientras no hay
#      usuarios) o, si ya existe, se autentica con ella.
#   4. Crea o actualiza la cuenta de la API (readWrite solo en pequenos_reyes).
#   5. Recrea la API con la nueva MONGODB_URL, si estaba creada.
# Es idempotente. Hacer antes un respaldo (mongodump), según el informe de remediación.
set -euo pipefail
source "$(dirname "$0")/_bd_comun.sh"

[ -n "$(valor_env MONGO_ROOT_USER)" ] || fijar_env MONGO_ROOT_USER pr_root
[ -n "$(valor_env MONGO_APP_USER)" ] || fijar_env MONGO_APP_USER pr_api
clave_valida "$(valor_env MONGO_ROOT_PASSWORD)" || fijar_env MONGO_ROOT_PASSWORD "$(generar_clave)"
clave_valida "$(valor_env MONGO_APP_PASSWORD)" || fijar_env MONGO_APP_PASSWORD "$(generar_clave)"
# Para la API fuera de Docker (uvicorn local).
PUERTO="$(valor_env MONGO_PORT)"
fijar_env MONGODB_URL "mongodb://$(valor_env MONGO_APP_USER):$(valor_env MONGO_APP_PASSWORD)@localhost:${PUERTO:-27017}/pequenos_reyes?authSource=pequenos_reyes"

echo "Proyecto: ${COMPOSE_PROJECT_NAME:-(carpeta)} · recreando mongo con --auth (volumen conservado)"
dc up -d --no-deps mongo
esperar_servicio mongo

dc exec -T mongo mongosh --quiet --eval '
const R = process.env.MONGO_INITDB_ROOT_USERNAME, P = process.env.MONGO_INITDB_ROOT_PASSWORD;
const admin = db.getSiblingDB("admin");
let ok = false;
try { ok = admin.auth(R, P).ok === 1; } catch (e) { ok = false; }
if (!ok) {
  admin.createUser({ user: R, pwd: P, roles: [{ role: "root", db: "admin" }] });
  print("cuenta root creada (excepción de localhost)");
  admin.auth(R, P);
} else { print("cuenta root existente: autenticación correcta"); }
load("/mongo/usuario_app.js");
'
if [ -n "$(dc ps -a api -q)" ]; then
  echo "Recreando la API con la nueva MONGODB_URL"
  dc up -d --no-deps api
  esperar_servicio api
fi
echo "MongoDB con autenticación habilitada."
