"""Segunda auditoría · H-02 · sonda HTTP de rutas heredadas SIN autenticación (solo stack de prueba).

    docker compose exec api python -m scripts.sonda_rutas_abiertas_s3

Se ejecuta idealmente con PERMITIR_IDENTIDAD_DEMO=false para demostrar que el modo estricto NO las
protege. Ninguna petición envía token, X-Usuario-Id ni X-Rol. Las escrituras usan datos ficticios
y se deshacen cuando la API lo permite (el evento creado se elimina; la categoría queda con el
prefijo "Sonda H-02"). Un resultado "ABIERTA" significa que la ruta respondió algo distinto de 401/403.
"""

import json
import sys
import time
import urllib.error
import urllib.request

from scripts.utilidades import URL, esperar_api

API = "/api/v1"
abiertas = []


def llamar(metodo, ruta, cuerpo=None):
    datos = json.dumps(cuerpo).encode() if cuerpo is not None else None
    req = urllib.request.Request(URL + API + ruta, data=datos, method=metodo, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return r.status, json.loads(r.read() or b"null")
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read() or b"null")


def sonda(id_, descripcion, metodo, ruta, cuerpo=None, detalle=lambda c: ""):
    st, cuerpo_resp = llamar(metodo, ruta, cuerpo)
    estado = "PROTEGIDA" if st in (401, 403) else "ABIERTA"
    if estado == "ABIERTA":
        abiertas.append(id_)
    print(f"[{estado}] {id_} {metodo} {ruta} -> HTTP {st}  {descripcion}{('  · ' + detalle(cuerpo_resp)) if st < 300 else ''}")
    return st, cuerpo_resp


esperar_api()
st, eventos = llamar("GET", "/eventos?proximas=false")
taller = next(e for e in eventos if e["codigo"] == "DEMO-TALLER-RECICLAJE")

print("== Lecturas con datos de alumnos/apoderados/pagos ==")
sonda("H02-01", "lista de alumnos", "GET", "/alumnos", detalle=lambda c: f"{len(c)} alumnos (nombres incluidos)")
sonda("H02-02", "asistentes de un evento", "GET", f"/eventos/{taller['id']}/asistentes", detalle=lambda c: f"{len(c['asistentes'])} asistentes con nombre")
sonda("H02-03", "inscripciones de un apoderado por id", "GET", "/apoderados/1/inscripciones", detalle=lambda c: f"{len(c)} inscripciones")
sonda("H02-04", "pagos HU-20 (RUT y nombre de párvulo)", "GET", "/pagos", detalle=lambda c: f"{len(c)} pagos")
sonda("H02-05", "matrículas", "GET", "/matriculas", detalle=lambda c: f"{len(c)} matrículas")

print("\n== Escrituras ==")
codigo = f"SONDA-{time.time_ns() % 10**8}"
st, creado = sonda("H02-06", "crear evento", "POST", "/eventos",
                   {"codigo": codigo, "titulo": "Sonda H-02 (ficticio)", "fecha": "2030-01-01", "cupo_maximo": 5})
if st == 201:
    sonda("H02-07", "modificar evento", "PATCH", f"/eventos/{creado['id']}", {"titulo": "Sonda H-02 modificada"})
    sonda("H02-08", "eliminar evento (limpieza)", "DELETE", f"/eventos/{creado['id']}")
sonda("H02-09", "crear categoría (TEC-16)", "POST", "/categorias", {"nombre": f"Sonda H-02 {time.time_ns() % 10**6}"})
sonda("H02-10", "cambiar estado de un pago inexistente (llega a la lógica: 404, no 401)", "PATCH", "/pagos/999999/estado", {"estado_pago": "confirmado"})
sonda("H02-11", "crear matrícula con ids inexistentes (llega a la lógica)", "POST", "/matriculas", {"alumno_id": 999999, "sala_id": 999999, "anio_escolar": 2030})
sonda("H02-12", "cancelar inscripción ajena con apoderado_id inventado (llega a la lógica)", "POST", "/inscripciones/999999/cancelar", {"apoderado_id": 1})

print(f"\nRutas ABIERTAS sin autenticación: {len(abiertas)} de 12 sondeadas -> {', '.join(abiertas)}")
# CI: cualquier ruta abierta hace fallar el gate de seguridad (H-02).
sys.exit(1 if abiertas else 0)
