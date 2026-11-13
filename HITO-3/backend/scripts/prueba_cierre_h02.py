"""Cierre H-01/H-02/H-03 · prueba de aceptación de AUTORIZACIÓN POR ROL Y PROPIEDAD (stack real).

    docker compose exec api python -m scripts.prueba_cierre_h02

Contrato: sin token -> 401 · token sin rol o sin propiedad -> 403 · token con permiso -> éxito.
Usa las cuentas ficticias (@ejemplo.cl) con DEMO_PASSWORD; corre en modo estricto o en desarrollo.
Los recursos de prueba (evento, categoría, inscripción) usan el prefijo "Cierre H-02" / CIERRE-.
"""

import json
import os
import sys
import time
import urllib.error
import urllib.request

from sqlalchemy import select

from app.db.models import Alumno, Apoderado
from app.db.postgres import SessionLocal
from scripts.utilidades import URL, esperar_api, terminar, verificar

API = "/api/v1"
CLAVE = os.environ.get("DEMO_PASSWORD", "")


def llamar(metodo, ruta, cuerpo=None, token=None):
    cab = {"Content-Type": "application/json"}
    if token:
        cab["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(URL + API + ruta, data=json.dumps(cuerpo).encode() if cuerpo is not None else None,
                                 method=metodo, headers=cab)
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return r.status, json.loads(r.read() or b"null")
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read() or b"null")


def token(email):
    st, c = llamar("POST", "/auth/login", {"email": email, "password": CLAVE})
    assert st == 200, f"login {email}: {st}"
    return c["token"]


if not CLAVE:
    print("Falta DEMO_PASSWORD en el entorno del contenedor de la API.")
    sys.exit(2)
esperar_api()
with SessionLocal() as db:
    ap1 = db.scalar(select(Apoderado.id).where(Apoderado.email == "apoderado.demo1@ejemplo.cl"))
    ap2 = db.scalar(select(Apoderado.id).where(Apoderado.email == "apoderado.demo2@ejemplo.cl"))
    al = {a.codigo: a.id for a in db.scalars(select(Alumno).where(Alumno.codigo.like("DEMO-A0%")))}
t_ap1, t_ap2 = token("apoderado.demo1@ejemplo.cl"), token("apoderado.demo2@ejemplo.cl")
t_edu, t_dir = token("educadora.demo@ejemplo.cl"), token("direccion.demo@ejemplo.cl")
marca = int(time.time())

print("== Eventos HU-19 (escritura solo personal) ==")
evento = {"codigo": f"CIERRE-{marca}", "titulo": "Cierre H-02 (ficticio)", "fecha": "2030-01-15", "cupo_maximo": 5}
verificar("C-01", "Apoderado crea evento -> 403", llamar("POST", "/eventos", evento, t_ap1)[0] == 403)
st, ev = llamar("POST", "/eventos", evento, t_edu)
verificar("C-02", "Educadora crea evento -> 201", st == 201)
eid = ev["id"]
verificar("C-03", "Apoderado modifica evento -> 403", llamar("PATCH", f"/eventos/{eid}", {"titulo": "X"}, t_ap1)[0] == 403)
verificar("C-04", "Apoderado ve asistentes -> 403", llamar("GET", f"/eventos/{eid}/asistentes", token=t_ap1)[0] == 403)
verificar("C-05", "Educadora ve asistentes -> 200", llamar("GET", f"/eventos/{eid}/asistentes", token=t_edu)[0] == 200)

print("\n== Inscripciones: el apoderado sale del token ==")
st, ins = llamar("POST", f"/eventos/{eid}/inscripciones", {"alumno_id": al["DEMO-A01"]}, t_ap1)
verificar("C-06", "Apoderado 1 inscribe a SU hijo sin enviar apoderado_id -> 201", st == 201 and ins["apoderado_id"] == ap1)
verificar("C-07", "Apoderado 1 inscribe al hijo del apoderado 2 -> 403",
          llamar("POST", f"/eventos/{eid}/inscripciones", {"alumno_id": al["DEMO-A06"]}, t_ap1)[0] == 403)
verificar("C-08", "Apoderado 1 se hace pasar por el apoderado 2 (apoderado_id en el cuerpo) -> 403",
          llamar("POST", f"/eventos/{eid}/inscripciones", {"alumno_id": al["DEMO-A06"], "apoderado_id": ap2}, t_ap1)[0] == 403)
verificar("C-09", "Apoderado 2 cancela la inscripción del apoderado 1 -> 403",
          llamar("POST", f"/inscripciones/{ins['id']}/cancelar", {}, t_ap2)[0] == 403)
verificar("C-10", "Apoderado 2 ve los pagos de esa inscripción -> 403", llamar("GET", f"/inscripciones/{ins['id']}/pagos", token=t_ap2)[0] == 403)
verificar("C-11", "Apoderado 1 ve los pagos de su inscripción -> 200", llamar("GET", f"/inscripciones/{ins['id']}/pagos", token=t_ap1)[0] == 200)
verificar("C-12", "Apoderado 1 ve inscripciones del apoderado 2 -> 403", llamar("GET", f"/apoderados/{ap2}/inscripciones", token=t_ap1)[0] == 403)
verificar("C-13", "Apoderado 1 ve sus inscripciones -> 200", llamar("GET", f"/apoderados/{ap1}/inscripciones", token=t_ap1)[0] == 200)
verificar("C-14", "Personal sin indicar apoderado_id al inscribir -> 400",
          llamar("POST", f"/eventos/{eid}/inscripciones", {"alumno_id": al["DEMO-A02"]}, t_edu)[0] == 400)
verificar("C-15", "Apoderado 1 cancela su inscripción -> 200", llamar("POST", f"/inscripciones/{ins['id']}/cancelar", {}, t_ap1)[0] == 200)

print("\n== Comunicados por apoderado (HU-21) ==")
verificar("C-16", "Apoderado 1 ve comunicados pertinentes del apoderado 2 -> 403", llamar("GET", f"/apoderados/{ap2}/comunicados", token=t_ap1)[0] == 403)
verificar("C-17", "Apoderado 1 ve los suyos -> 200", llamar("GET", f"/apoderados/{ap1}/comunicados", token=t_ap1)[0] == 200)

print("\n== Académico y catálogo (TEC-16) ==")
verificar("C-18", "Apoderado lista alumnos -> 403", llamar("GET", "/alumnos", token=t_ap1)[0] == 403)
verificar("C-19", "Educadora lista alumnos -> 200", llamar("GET", "/alumnos", token=t_edu)[0] == 200)
verificar("C-20", "Educadora crea matrícula -> 403", llamar("POST", "/matriculas", {"alumno_id": 1, "sala_id": 1, "anio_escolar": 2030}, t_edu)[0] == 403)
verificar("C-21", "Dirección crea matrícula con ids inexistentes -> 404 (llega a la lógica)",
          llamar("POST", "/matriculas", {"alumno_id": 999999, "sala_id": 999999, "anio_escolar": 2030}, t_dir)[0] == 404)
verificar("C-22", "Educadora crea categoría TEC-16 -> 403", llamar("POST", "/categorias", {"nombre": f"Cierre H-02 {marca}"}, t_edu)[0] == 403)
verificar("C-23", "Dirección crea categoría TEC-16 -> 201", llamar("POST", "/categorias", {"nombre": f"Cierre H-02 {marca}"}, t_dir)[0] == 201)

print("\n== Pagos HU-20 ==")
verificar("C-24", "Apoderado lista todos los pagos -> 403", llamar("GET", "/pagos", token=t_ap1)[0] == 403)
verificar("C-25", "Dirección lista pagos -> 200", llamar("GET", "/pagos", token=t_dir)[0] == 200)
verificar("C-26", "Educadora cambia estado de un pago -> 403", llamar("PATCH", "/pagos/999999/estado", {"estado_pago": "pagado"}, t_edu)[0] == 403)
verificar("C-27", "Dirección cambia estado de un pago inexistente -> 404 (llega a la lógica)",
          llamar("PATCH", "/pagos/999999/estado", {"estado_pago": "pagado"}, t_dir)[0] == 404)

print("\n== H-01/H-03: X-Rol no otorga permisos ==")
req = urllib.request.Request(URL + API + "/organizadores", data=json.dumps({"nombre": "Intruso"}).encode(), method="POST",
                             headers={"Content-Type": "application/json", "X-Rol": "direccion", "Authorization": f"Bearer {t_ap1}"})
try:
    urllib.request.urlopen(req, timeout=15)
    st = 200
except urllib.error.HTTPError as e:
    st = e.code
verificar("C-28", "Apoderado con X-Rol: direccion crea organizador -> 403", st == 403)

print("\n== Limpieza ==")
verificar("C-29", "El evento de prueba con inscripciones no se puede borrar (historial) -> 409",
          llamar("DELETE", f"/eventos/{eid}", token=t_edu)[0] == 409)
terminar()
