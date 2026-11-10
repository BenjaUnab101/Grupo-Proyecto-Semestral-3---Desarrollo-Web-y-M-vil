#!/usr/bin/env bash
# Remediación BD · comprobaciones de autenticación (no imprime secretos). Sale con 1 si alguna falla.
#   bash scripts/verificar_auth_bd.sh
#   CLAVE_ANTERIOR_PG=<clave vieja> bash scripts/verificar_auth_bd.sh   # además, que la vieja no sirva
set -uo pipefail
source "$(dirname "$0")/_bd_comun.sh"
F=0
chk() { local d="$1"; shift; if "$@"; then echo "[AUTH PASS] $d"; else echo "[AUTH FAIL] $d"; F=$((F + 1)); fi; }
mq() { dc exec -T mongo mongosh --quiet --eval "$1" 2>&1 | tr -d '\r' | tail -n 1; }

chk "Mongo: sin credenciales no puede leer auditoria_eventos" test "$(mq '
try { db.getSiblingDB("pequenos_reyes").auditoria_eventos.findOne(); print("LEE") } catch (e) { print("DENEGADO") }')" = DENEGADO
chk "Mongo: sin credenciales no puede listar bases" test "$(mq '
try { db.adminCommand({ listDatabases: 1 }); print("LEE") } catch (e) { print("DENEGADO") }')" = DENEGADO
chk "Mongo: la cuenta de la API lee y escribe en pequenos_reyes" test "$(mq '
const d = db.getSiblingDB("pequenos_reyes"); d.auth(process.env.MONGO_APP_USER, process.env.MONGO_APP_PASSWORD);
d.verificacion_auth.insertOne({ t: new Date() }); d.verificacion_auth.drop(); d.auditoria_eventos.countDocuments({}); print("OK")')" = OK
chk "Mongo: la cuenta de la API no accede a admin, a otras bases ni crea usuarios" test "$(mq '
const d = db.getSiblingDB("pequenos_reyes"); d.auth(process.env.MONGO_APP_USER, process.env.MONGO_APP_PASSWORD);
let n = 0;
try { db.getSiblingDB("admin").system.users.findOne() } catch (e) { n++ }
try { db.getSiblingDB("otra_base").x.insertOne({ a: 1 }) } catch (e) { n++ }
try { d.runCommand({ createUser: "intruso", pwd: "clave-intruso-123", roles: [] }).ok === 1 || n++ } catch (e) { n++ }
print(n === 3 ? "OK" : "EXPUESTO")')" = OK
chk "Mongo: clave incorrecta rechazada" test "$(mq '
try { print(db.getSiblingDB("pequenos_reyes").auth(process.env.MONGO_APP_USER, "clave-incorrecta").ok === 1 ? "ENTRA" : "DENEGADO") } catch (e) { print("DENEGADO") }')" = DENEGADO
chk "PostgreSQL: la clave configurada funciona y una incorrecta se rechaza (TCP)" dc exec -T api python -c '
import os, sys, psycopg
from urllib.parse import urlsplit
u = urlsplit(os.environ["DATABASE_URL"].replace("+psycopg", ""))
def entra(c):
    try:
        psycopg.connect(host=u.hostname, port=u.port or 5432, dbname=u.path.lstrip("/"), user=u.username, password=c, connect_timeout=5).close(); return True
    except psycopg.OperationalError:
        return False
sys.exit(0 if entra(u.password) and not entra("clave-incorrecta-x") else 1)'
if [ -n "${CLAVE_ANTERIOR_PG:-}" ]; then
  chk "PostgreSQL: la clave anterior ya no autentica" dc exec -T -e CLAVE_ANTERIOR_PG api python -c '
import os, sys, psycopg
from urllib.parse import urlsplit
u = urlsplit(os.environ["DATABASE_URL"].replace("+psycopg", ""))
try:
    psycopg.connect(host=u.hostname, port=u.port or 5432, dbname=u.path.lstrip("/"), user=u.username, password=os.environ["CLAVE_ANTERIOR_PG"], connect_timeout=5).close()
    sys.exit(1)
except psycopg.OperationalError:
    sys.exit(0)'
fi
chk "API sana (/health)" esperar_servicio api
exit $((F > 0))
