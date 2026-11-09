"""HU-19 · Inscripciones, cupos, cancelaciones y asistentes (contra la API y PostgreSQL reales).

    docker compose exec api python -m scripts.prueba_hu19

Crea actividades de prueba (TEST-HU19-*) y las borra al final. Datos ficticios (DEMO-*).
"""

import threading
import time
from datetime import timedelta

from sqlalchemy import delete, func, select, text

from app.db.models import Actividad, Alumno, Apoderado, Inscripcion
from app.db.postgres import SessionLocal
from scripts.utilidades import esperar_api, identidad_por_defecto, llamar, terminar, verificar

esperar_api()
# Cierre H-02: las inscripciones exigen sesión; el script actúa como dirección demo en nombre del apoderado.
identidad_por_defecto("direccion.demo@ejemplo.cl")
db = SessionLocal()
ap1 = db.scalar(select(Apoderado.id).where(Apoderado.email == "apoderado.demo1@ejemplo.cl"))  # A01 a A05
ap2 = db.scalar(select(Apoderado.id).where(Apoderado.email == "apoderado.demo2@ejemplo.cl"))  # A06
al = {a.codigo: a.id for a in db.scalars(select(Alumno).where(Alumno.codigo.like("DEMO-A0%")))}
hoy = db.scalar(text("SELECT (now() AT TIME ZONE 'America/Santiago')::date"))
marca = int(time.time())


def nueva_actividad(nombre, cupo, dias):
    actividad = Actividad(codigo=f"TEST-HU19-{marca}-{nombre}", titulo=f"Prueba HU-19 {nombre}",
                          fecha=hoy + timedelta(days=dias), cupo_maximo=cupo)
    db.add(actividad)
    db.commit()
    return actividad.id


def inscribir(actividad, alumno, apoderado=ap1):
    return llamar("POST", f"/api/v1/eventos/{actividad}/inscripciones", {"alumno_id": al[alumno], "apoderado_id": apoderado})


a = nueva_actividad("CUPO2", 2, 3)

print("== CP-HU-19-01 · Inscribir, ver asistentes y cancelar ==")
st, c = llamar("GET", f"/api/v1/eventos/{a}")
verificar("01.1", "La actividad muestra 2 cupos", st == 200 and c["cupos_disponibles"] == 2)
st, i1 = inscribir(a, "DEMO-A01")
verificar("01.2", "Inscribir A01 -> 201, queda 1 cupo", st == 201 and i1["cupos_disponibles"] == 1, f"HTTP {st}")
st, c = inscribir(a, "DEMO-A02")
verificar("01.3", "Inscribir A02 -> 201, quedan 0 cupos", st == 201 and c["cupos_disponibles"] == 0, f"HTTP {st}")
st, c = llamar("POST", f"/api/v1/inscripciones/{i1['id']}/cancelar", {"apoderado_id": ap1})
verificar("01.4", "Cancelar A01 -> 200, se libera 1 cupo", st == 200 and c["estado"] == "cancelada" and c["cupos_disponibles"] == 1)
st, c = inscribir(a, "DEMO-A03")
verificar("01.5", "El cupo liberado se usa: inscribir A03 -> 201", st == 201, f"HTTP {st}")
st, c = llamar("GET", f"/api/v1/eventos/{a}/asistentes?estado=todas")
estados = {x["alumno_codigo"]: x["estado"] for x in c["asistentes"]}
verificar("01.6", "Asistentes: A01 cancelada, A02 y A03 inscritas",
          estados == {"DEMO-A01": "cancelada", "DEMO-A02": "inscrita", "DEMO-A03": "inscrita"}, str(estados))

print("\n== CA3 / CA5 · Duplicados y actividad llena ==")
st, c = inscribir(a, "DEMO-A02")
verificar("03.1", "Inscribir de nuevo a A02 -> 409", st == 409, c["detail"])
st, c = llamar("POST", f"/api/v1/inscripciones/{i1['id']}/cancelar", {"apoderado_id": ap1})
verificar("03.2", "Cancelar dos veces -> 409", st == 409, c["detail"])
st, c = inscribir(a, "DEMO-A04")
verificar("05.1", "Actividad llena: inscribir A04 -> 409 sin cupos", st == 409 and "cupos" in c["detail"], c["detail"])

print("\n== CP-HU-19-02 · Datos inválidos y permisos ==")
casos = [
    ("02.1", "alumno_id = 0 -> 400", "POST", f"/api/v1/eventos/{a}/inscripciones", {"alumno_id": 0, "apoderado_id": ap1}, 400),
    ("02.2", "Falta apoderado_id -> 400", "POST", f"/api/v1/eventos/{a}/inscripciones", {"alumno_id": al["DEMO-A04"]}, 400),
    ("02.3", "Actividad inexistente -> 404", "POST", "/api/v1/eventos/999999/inscripciones", {"alumno_id": al["DEMO-A04"], "apoderado_id": ap1}, 404),
    ("02.4", "Alumno de otro apoderado -> 403", "POST", f"/api/v1/eventos/{a}/inscripciones", {"alumno_id": al["DEMO-A06"], "apoderado_id": ap1}, 403),
    ("02.5", "Cancelar inscripción inexistente -> 404", "POST", "/api/v1/inscripciones/999999/cancelar", {"apoderado_id": ap1}, 404),
]
for caso, descripcion, metodo, ruta, cuerpo, esperado in casos:
    st, c = llamar(metodo, ruta, cuerpo)
    verificar(caso, descripcion, st == esperado, f"HTTP {st}")
st, c = inscribir(nueva_actividad("PASADA", 5, -1), "DEMO-A04")
verificar("02.6", "Actividad que ya ocurrió -> 409 inscripciones cerradas", st == 409, c["detail"])

print("\n== CA2 · 6 inscripciones SIMULTÁNEAS en una actividad con cupo 3 ==")
for ronda in range(1, 4):
    actividad = nueva_actividad(f"CONC{ronda}", 3, 3)
    alumnos = [("DEMO-A01", ap1), ("DEMO-A02", ap1), ("DEMO-A03", ap1), ("DEMO-A04", ap1), ("DEMO-A05", ap1), ("DEMO-A06", ap2)]
    barrera = threading.Barrier(len(alumnos))
    codigos = []

    def intentar(alumno, apoderado):
        barrera.wait()  # todas salen al mismo tiempo
        codigos.append(inscribir(actividad, alumno, apoderado)[0])

    hilos = [threading.Thread(target=intentar, args=par) for par in alumnos]
    for h in hilos:
        h.start()
    for h in hilos:
        h.join()
    en_base = db.scalar(select(func.count()).where(Inscripcion.actividad_id == actividad, Inscripcion.estado == "inscrita"))
    verificar(f"02-CONC.{ronda}", "3 aceptadas, 3 rechazadas y 3 inscritas en PostgreSQL",
              codigos.count(201) == 3 and codigos.count(409) == 3 and en_base == 3,
              f"201={codigos.count(201)} 409={codigos.count(409)} en la base={en_base}")

# Limpieza
pruebas = db.scalars(select(Actividad.id).where(Actividad.codigo.like("TEST-HU19-%"))).all()
db.execute(delete(Inscripcion).where(Inscripcion.actividad_id.in_(pruebas)))
db.execute(delete(Actividad).where(Actividad.id.in_(pruebas)))
db.commit()
terminar()
