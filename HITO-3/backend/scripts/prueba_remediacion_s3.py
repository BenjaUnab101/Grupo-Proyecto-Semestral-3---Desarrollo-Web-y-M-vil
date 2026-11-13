"""Remediación postauditoría · Sprint 3 · Daniel · pruebas NEGATIVAS de identidad contra el stack real.

    docker compose exec api python -m scripts.prueba_remediacion_s3 dev        # PERMITIR_IDENTIDAD_DEMO=true
    docker compose exec api python -m scripts.prueba_remediacion_s3 estricto   # PERMITIR_IDENTIDAD_DEMO=false

Comprueba la suplantación con X-Usuario-Id y la falsificación de rol con X-Rol, distinguiendo:
  - rutas NUEVAS (Bearer obligatorio): /portal, /auditoria, /panel, /contacto (gestión), /auth;
  - rutas HEREDADAS de otros integrantes: /categorias-actividad (X-Rol), /sesion/yo y
    /prematriculas (X-Usuario-Id).
Requiere DEMO_PASSWORD en el entorno. Solo datos ficticios (@ejemplo.cl). Las categorías de
prueba se crean con el prefijo "Prueba remediación" y quedan en la base de prueba.
"""

import json
import os
import sys
import time
import urllib.error
import urllib.request

from scripts.utilidades import URL, esperar_api, terminar, verificar

API = "/api/v1"
CLAVE = os.environ.get("DEMO_PASSWORD", "")


def llamar(metodo, ruta, cuerpo=None, cabeceras=None):
    datos = json.dumps(cuerpo).encode() if cuerpo is not None else None
    solicitud = urllib.request.Request(URL + API + ruta, data=datos, method=metodo,
                                       headers={"Content-Type": "application/json", **(cabeceras or {})})
    try:
        with urllib.request.urlopen(solicitud, timeout=15) as r:
            return r.status
    except urllib.error.HTTPError as e:
        return e.code


def bearer(email):
    solicitud = urllib.request.Request(URL + API + "/auth/login", method="POST", headers={"Content-Type": "application/json"},
                                       data=json.dumps({"email": email, "password": CLAVE}).encode())
    with urllib.request.urlopen(solicitud, timeout=15) as r:
        return {"Authorization": "Bearer " + json.loads(r.read())["token"]}


def id_demo(email):
    # Desde el cierre de H-02, /sesion/cuentas-demo solo existe con la identidad demo activa;
    # el id se lee directamente de la base (el script corre dentro del contenedor de la API).
    from sqlalchemy import select

    from app.db.models import Usuario
    from app.db.postgres import SessionLocal

    with SessionLocal() as db:
        return str(db.scalar(select(Usuario.id).where(Usuario.email == email)))


def categoria(cab):
    nombre = f"Prueba remediación {time.time_ns()}"
    return llamar("POST", "/categorias-actividad", {"nombre": nombre}, cab)


def comunes(ap, edu, dire):
    print("== Rutas NUEVAS: X-Usuario-Id nunca vale, solo Bearer ==")
    dir_demo = id_demo("direccion.demo@ejemplo.cl")
    verificar("R-01", "GET /portal/alumnos con X-Usuario-Id de dirección -> 401", llamar("GET", "/portal/alumnos", cabeceras={"X-Usuario-Id": dir_demo}) == 401)
    verificar("R-02", "GET /auditoria/eventos con X-Usuario-Id de dirección -> 401", llamar("GET", "/auditoria/eventos", cabeceras={"X-Usuario-Id": dir_demo}) == 401)
    verificar("R-03", "GET /panel/participacion con X-Usuario-Id de dirección -> 401", llamar("GET", "/panel/participacion", cabeceras={"X-Usuario-Id": dir_demo}) == 401)
    verificar("R-04", "GET /contacto con X-Usuario-Id de dirección -> 401", llamar("GET", "/contacto", cabeceras={"X-Usuario-Id": dir_demo}) == 401)
    verificar("R-05", "GET /contacto con Bearer de apoderado + X-Rol direccion -> 403",
              llamar("GET", "/contacto", cabeceras={**ap, "X-Rol": "direccion"}) == 403)
    verificar("R-06", "Token inventado -> 401", llamar("GET", "/auth/yo", cabeceras={"Authorization": "Bearer inventado"}) == 401)

    print("\n== Rutas HEREDADAS (HU-17): X-Rol contrastado con la sesión ==")
    verificar("R-07", "Bearer apoderado + X-Rol direccion -> 403", categoria({**ap, "X-Rol": "direccion"}) == 403)
    verificar("R-08", "Bearer educadora + X-Rol direccion -> 403", categoria({**edu, "X-Rol": "direccion"}) == 403)
    verificar("R-09", "Bearer dirección + X-Rol direccion -> 201", categoria({**dire, "X-Rol": "direccion"}) == 201)


def modo_dev():
    ap, edu, dire = bearer("apoderado.demo1@ejemplo.cl"), bearer("educadora.demo@ejemplo.cl"), bearer("direccion.demo@ejemplo.cl")
    comunes(ap, edu, dire)
    print("\n== Modo desarrollo (identidad demo activa, transitorio) ==")
    ap_id = id_demo("apoderado.demo1@ejemplo.cl")
    verificar("D-01", "X-Usuario-Id apoderado + X-Rol direccion -> 403", categoria({"X-Usuario-Id": ap_id, "X-Rol": "direccion"}) == 403)
    verificar("D-02", "X-Usuario-Id inexistente + X-Rol direccion -> 401", categoria({"X-Usuario-Id": "999999", "X-Rol": "direccion"}) == 401)
    verificar("D-03", "X-Rol direccion SIN identidad -> 401 (H-01 cerrado: el rol sale de la sesión)", categoria({"X-Rol": "direccion"}) == 401)
    verificar("D-04", "GET /sesion/yo con X-Usuario-Id demo -> 200 (barra demo TEC-17)", llamar("GET", "/sesion/yo", cabeceras={"X-Usuario-Id": ap_id}) == 200)


def modo_estricto():
    ap, edu, dire = bearer("apoderado.demo1@ejemplo.cl"), bearer("educadora.demo@ejemplo.cl"), bearer("direccion.demo@ejemplo.cl")
    comunes(ap, edu, dire)
    print("\n== Modo estricto (PERMITIR_IDENTIDAD_DEMO=false) ==")
    dir_id = id_demo("direccion.demo@ejemplo.cl")
    verificar("E-01", "X-Rol direccion SIN sesión -> 401", categoria({"X-Rol": "direccion"}) == 401)
    verificar("E-02", "X-Usuario-Id dirección + X-Rol direccion -> 401", categoria({"X-Usuario-Id": dir_id, "X-Rol": "direccion"}) == 401)
    verificar("E-03", "GET /sesion/yo con X-Usuario-Id -> 401", llamar("GET", "/sesion/yo", cabeceras={"X-Usuario-Id": dir_id}) == 401)
    verificar("E-04", "GET /prematriculas (heredada) con X-Usuario-Id dirección -> 401", llamar("GET", "/prematriculas", cabeceras={"X-Usuario-Id": dir_id}) == 401)
    verificar("E-05", "GET /prematriculas con Bearer dirección -> 200", llamar("GET", "/prematriculas", cabeceras=dire) == 200)
    verificar("E-06", "GET /prematriculas con Bearer apoderado -> 403", llamar("GET", "/prematriculas", cabeceras=ap) == 403)


if __name__ == "__main__":
    if not CLAVE:
        print("Falta DEMO_PASSWORD en el entorno del contenedor de la API.")
        sys.exit(2)
    esperar_api()
    {"dev": modo_dev, "estricto": modo_estricto}[sys.argv[1] if len(sys.argv) > 1 else "dev"]()
    terminar()
