"""R4 · Matiz B · Prueba OBLIGATORIA de transición de entorno sobre el MISMO volumen PostgreSQL.

    # 1) API en desarrollo (APP_ENV=development, DEMO_PASSWORD definida)
    docker compose exec api python -m scripts.prueba_transicion_entorno_r4 preparar
    #    copiar /tmp/transicion_r4.json fuera del contenedor (contiene tokens y una clave de prueba)
    # 2) recrear SOLO la API con APP_ENV=production (sin DEMO_PASSWORD, sin identidad demo),
    #    sin tocar volúmenes; volver a copiar el JSON al contenedor
    docker compose exec api python -m scripts.prueba_transicion_entorno_r4 verificar

'preparar' (desarrollo):
  - inicia sesión con cuentas demo (dirección y apoderado) -> tokens;
  - crea, si no existe, una cuenta LEGÍTIMA ficticia de otro dominio (direccion.r4@jardin-ficticio.cl)
    con una contraseña aleatoria, inicia sesión con ella -> token;
  - guarda tokens, la clave aleatoria y conteos/huellas de la base en /tmp/transicion_r4.json.
'verificar' (producción, mismo volumen):
  - login demo -> 401; tokens demo anteriores -> 401 (validación central);
  - token legítimo anterior -> 200; login legítimo nuevo -> 200;
  - no se borró nada: usuarios y hash demo idénticos; sesiones solo aumentan por el login legítimo.
No imprime tokens, contraseñas ni hashes (solo códigos HTTP, conteos y coincidencias).
"""

import hashlib
import json
import os
import secrets
import sys
import urllib.error
import urllib.request
from pathlib import Path

from sqlalchemy import func, select

from app.core.config import settings
from app.core.seguridad import hashear_password
from app.db.models import Sesion, Usuario
from app.db.postgres import SessionLocal
from scripts.utilidades import URL, esperar_api, terminar, verificar

API = "/api/v1"
ESTADO = Path("/tmp/transicion_r4.json")
LEGITIMO = "direccion.r4@jardin-ficticio.cl"


def llamar(metodo, ruta, cuerpo=None, token=None):
    cab = {"Content-Type": "application/json"}
    if token:
        cab["Authorization"] = f"Bearer {token}"
    datos = json.dumps(cuerpo).encode() if cuerpo is not None else None
    req = urllib.request.Request(URL + API + ruta, data=datos, method=metodo, headers=cab)
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return r.status, json.loads(r.read() or b"null")
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read() or b"null")


def login(email, clave):
    return llamar("POST", "/auth/login", {"email": email, "password": clave})


def foto():
    """Conteos y una huella (SHA-256 del hash, no el hash) para comprobar que nada se borró."""
    with SessionLocal() as db:
        hash_demo = db.scalar(select(Usuario.password_hash).where(Usuario.email == "direccion.demo@ejemplo.cl"))
        return {
            "usuarios": db.scalar(select(func.count()).select_from(Usuario)),
            "usuarios_demo": db.scalar(select(func.count()).select_from(Usuario).where(Usuario.email.like("%@ejemplo.cl"))),
            "sesiones": db.scalar(select(func.count()).select_from(Sesion)),
            "huella_hash_direccion_demo": hashlib.sha256((hash_demo or "").encode()).hexdigest(),
        }


def preparar():
    print(f"== PREPARAR en APP_ENV={settings.entorno} ==")
    clave_demo = os.environ.get("DEMO_PASSWORD", "")
    verificar("T-00", "La API corre en desarrollo/test", settings.es_entorno_de_desarrollo, settings.entorno)
    st_d, dir_demo = login("direccion.demo@ejemplo.cl", clave_demo)
    st_a, ap_demo = login("apoderado.demo1@ejemplo.cl", clave_demo)
    verificar("T-01", "Login demo de dirección y apoderado en desarrollo -> 200", st_d == 200 and st_a == 200)

    clave_legitima = secrets.token_urlsafe(18)
    with SessionLocal() as db:
        cuenta = db.scalar(select(Usuario).where(Usuario.email == LEGITIMO))
        if cuenta is None:
            cuenta = Usuario(email=LEGITIMO, rol="administrador", password_hash="")
            db.add(cuenta)
        cuenta.password_hash = hashear_password(clave_legitima)  # cuenta ficticia de prueba (otro dominio)
        cuenta.activo = True
        db.commit()
    st_l, legit = login(LEGITIMO, clave_legitima)
    verificar("T-02", "Login de la cuenta legítima (no demo) en desarrollo -> 200", st_l == 200)
    st, _ = llamar("GET", "/auth/yo", token=dir_demo["token"])
    verificar("T-03", "Token demo válido en desarrollo -> 200", st == 200)

    estado = {"tokens_demo": {"direccion": dir_demo["token"], "apoderado": ap_demo["token"]},
              "token_legitimo": legit["token"], "clave_legitima": clave_legitima, "clave_demo": clave_demo,
              "antes": foto()}
    ESTADO.write_text(json.dumps(estado))
    print(f"Base antes del cambio: {estado['antes']['usuarios']} usuarios ({estado['antes']['usuarios_demo']} demo), {estado['antes']['sesiones']} sesiones")


def verificar_produccion():
    e = json.loads(ESTADO.read_text())
    print(f"== VERIFICAR en APP_ENV={settings.entorno} (mismo volumen PostgreSQL) ==")
    verificar("P-00", "La API corre en producción y sin identidad demo",
              settings.entorno == "production" and not settings.identidad_demo_activa and not settings.demo_password)
    verificar("P-01", "Login demo dirección con su contraseña válida -> 401", login("direccion.demo@ejemplo.cl", e["clave_demo"])[0] == 401)
    verificar("P-02", "Login demo apoderado con su contraseña válida -> 401", login("apoderado.demo1@ejemplo.cl", e["clave_demo"])[0] == 401)
    td, ta = e["tokens_demo"]["direccion"], e["tokens_demo"]["apoderado"]
    verificar("P-03", "Token demo de dirección emitido en desarrollo: /auth/yo -> 401", llamar("GET", "/auth/yo", token=td)[0] == 401)
    verificar("P-04", "Token demo de dirección: /auditoria/eventos -> 401", llamar("GET", "/auditoria/eventos", token=td)[0] == 401)
    verificar("P-05", "Token demo de dirección: /contacto (gestión) -> 401", llamar("GET", "/contacto", token=td)[0] == 401)
    verificar("P-06", "Token demo de dirección: /prematriculas (ruta heredada con Bearer) -> 401", llamar("GET", "/prematriculas", token=td)[0] == 401)
    verificar("P-07", "Token demo de apoderado: /portal/alumnos -> 401", llamar("GET", "/portal/alumnos", token=ta)[0] == 401)
    st, _ = llamar("GET", "/auth/yo", token=e["token_legitimo"])
    verificar("P-08", "Token LEGÍTIMO emitido en desarrollo sigue válido -> 200", st == 200)
    verificar("P-09", "Token legítimo: /auditoria/eventos -> 200", llamar("GET", "/auditoria/eventos", token=e["token_legitimo"])[0] == 200)
    verificar("P-10", "Login legítimo nuevo en producción -> 200", login(LEGITIMO, e["clave_legitima"])[0] == 200)

    antes, despues = e["antes"], foto()
    verificar("P-11", "No se borraron usuarios", despues["usuarios"] == antes["usuarios"] and despues["usuarios_demo"] == antes["usuarios_demo"],
              f"{antes['usuarios']} -> {despues['usuarios']}")
    verificar("P-12", "El hash de la cuenta demo de dirección no se modificó", despues["huella_hash_direccion_demo"] == antes["huella_hash_direccion_demo"])
    verificar("P-13", "Sesiones: no se borraron; solo +1 por el login legítimo", despues["sesiones"] == antes["sesiones"] + 1,
              f"{antes['sesiones']} -> {despues['sesiones']}")


if __name__ == "__main__":
    esperar_api()
    {"preparar": preparar, "verificar": verificar_produccion}[sys.argv[1] if len(sys.argv) > 1 else ""]()
    terminar()
