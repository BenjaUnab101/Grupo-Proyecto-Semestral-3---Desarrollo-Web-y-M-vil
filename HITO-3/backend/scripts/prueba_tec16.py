"""TEC-16 · Migraciones, CRUD de actividades, pagos ficticios y lectura tras reinicio.

Son dos fases, con un reinicio entre medio:
    docker compose exec api python -m scripts.prueba_tec16 crear
    docker compose restart
    docker compose exec api python -m scripts.prueba_tec16 verificar

Datos ficticios (TEST-TEC16-*, @ejemplo.cl). La fase 'verificar' los borra al final.
"""

import sys
import time
from datetime import timedelta

from sqlalchemy import delete, select, text

from app.db.models import Actividad, Alumno, Apoderado, Categoria, Inscripcion, Organizador, Pago
from app.db.postgres import SessionLocal
from scripts.utilidades import esperar_api, identidad_por_defecto, llamar, terminar, verificar

CODIGO = "TEST-TEC16-REINICIO"
TITULO = "Actividad de control para el reinicio (TEC-16)"


def limpiar(db):
    ids = db.scalars(select(Actividad.id).where(Actividad.codigo.like("TEST-TEC16-%"))).all()
    inscripciones = db.scalars(select(Inscripcion.id).where(Inscripcion.actividad_id.in_(ids))).all()
    db.execute(delete(Pago).where(Pago.inscripcion_id.in_(inscripciones)))
    db.execute(delete(Inscripcion).where(Inscripcion.id.in_(inscripciones)))
    db.execute(delete(Actividad).where(Actividad.id.in_(ids)))
    db.execute(delete(Categoria).where(Categoria.nombre.like("Prueba TEC-16%")))
    db.commit()


def fase_crear(db):
    limpiar(db)  # por si quedaron datos de una ejecución anterior
    ap1 = db.scalar(select(Apoderado.id).where(Apoderado.email == "apoderado.demo1@ejemplo.cl"))
    ap2 = db.scalar(select(Apoderado.id).where(Apoderado.email == "apoderado.demo2@ejemplo.cl"))
    al = {a.codigo: a.id for a in db.scalars(select(Alumno).where(Alumno.codigo.like("DEMO-A0%")))}
    hoy = db.scalar(text("SELECT (now() AT TIME ZONE 'America/Santiago')::date"))
    marca = int(time.time())

    print("== Migraciones y datos institucionales ==")
    versiones = db.scalars(text("SELECT version FROM schema_migraciones ORDER BY version")).all()
    verificar("M.1", "Las migraciones quedaron registradas en schema_migraciones", len(versiones) >= 3, ", ".join(versiones))
    st, c = llamar("GET", "/api/v1/institucion")
    verificar("M.2", "GET /institucion devuelve los datos ficticios del jardín", st == 200 and "(demo)" in c["nombre"], c.get("nombre"))

    print("\n== CP-TEC-16-01 · CRUD: crear, leer, modificar, eliminar ==")
    st, categoria = llamar("POST", "/api/v1/categorias", {"nombre": f"Prueba TEC-16 {marca}"})
    verificar("C.1", "Crear categoría -> 201", st == 201)
    # Organizador demo (tabla de HU-17), para asociarlo a la actividad.
    organizador = db.scalar(select(Organizador.id).where(Organizador.email == "educadora.demo@ejemplo.cl"))
    verificar("C.2", "Existe el organizador demo para asociarlo", organizador is not None)
    datos = {"codigo": CODIGO, "titulo": "Título inicial", "fecha": str(hoy + timedelta(days=5)), "hora": "10:30",
             "cupo_maximo": 3, "costo": 2000, "categoria_id": categoria["id"], "organizador_id": organizador}
    st, actividad = llamar("POST", "/api/v1/eventos", datos)
    verificar("C.3", "Crear actividad con categoría, organizador y costo -> 201", st == 201, f"HTTP {st}")
    a = actividad["id"]
    st, c = llamar("GET", f"/api/v1/eventos/{a}")
    verificar("C.4", "Leerla -> 200 con 3 cupos", st == 200 and c["cupos_disponibles"] == 3)
    st, c = llamar("PATCH", f"/api/v1/eventos/{a}", {"titulo": TITULO, "cupo_maximo": 4})
    verificar("C.5", "Modificar título y cupo -> 200", st == 200 and c["titulo"] == TITULO and c["cupo_maximo"] == 4)
    _, temporal = llamar("POST", "/api/v1/eventos", dict(datos, codigo=f"TEST-TEC16-{marca}-BORRAR"))
    st, _ = llamar("DELETE", f"/api/v1/eventos/{temporal['id']}")
    st2, _ = llamar("GET", f"/api/v1/eventos/{temporal['id']}")
    verificar("C.6", "Eliminar actividad sin inscripciones -> 204 y luego 404", st == 204 and st2 == 404)

    print("\n== Pago simulado y cancelación en una sola transacción ==")
    _, i1 = llamar("POST", f"/api/v1/eventos/{a}/inscripciones", {"alumno_id": al["DEMO-A01"], "apoderado_id": ap1})
    st, pago = llamar("POST", f"/api/v1/inscripciones/{i1['id']}/pagos", {"apoderado_id": ap1})
    verificar("T.1", "Pago SIMULADO -> 201 por el costo de la actividad",
              st == 201 and pago["monto"] == 2000 and pago["referencia"].startswith("SIM-"), pago.get("referencia"))
    _, i2 = llamar("POST", f"/api/v1/eventos/{a}/inscripciones", {"alumno_id": al["DEMO-A02"], "apoderado_id": ap1})
    st, _ = llamar("POST", f"/api/v1/inscripciones/{i2['id']}/pagos", {"apoderado_id": ap1})
    verificar("T.2", "Inscribir y pagar A02 (queda para la fase verificar)", st == 201)
    st, _ = llamar("POST", f"/api/v1/inscripciones/{i1['id']}/cancelar", {"apoderado_id": ap1})
    _, pagos = llamar("GET", f"/api/v1/inscripciones/{i1['id']}/pagos")
    verificar("T.3", "Cancelar A01 -> su pago pasa a 'reembolsado'", st == 200 and [p["estado"] for p in pagos] == ["reembolsado"])

    print("\n== CP-TEC-16-02 · Datos inválidos y reglas ==")
    casos = [
        ("E.1", "Categoría repetida -> 409", "POST", "/api/v1/categorias", {"nombre": f"Prueba TEC-16 {marca}"}, 409),
        ("E.2", "Organizador inexistente -> 404", "POST", "/api/v1/eventos", dict(datos, codigo=f"TEST-TEC16-{marca}-SO", organizador_id=999999), 404),
        ("E.3", "Código de actividad repetido -> 409", "POST", "/api/v1/eventos", datos, 409),
        ("E.4", "Cupo 0 -> 400", "POST", "/api/v1/eventos", dict(datos, codigo=f"TEST-TEC16-{marca}-C0", cupo_maximo=0), 400),
        ("E.5", "Categoría inexistente -> 404", "POST", "/api/v1/eventos", dict(datos, codigo=f"TEST-TEC16-{marca}-SC", categoria_id=999999), 404),
        ("E.6", "Eliminar actividad con inscripciones -> 409", "DELETE", f"/api/v1/eventos/{a}", None, 409),
        ("E.7", "Pagar dos veces -> 409", "POST", f"/api/v1/inscripciones/{i2['id']}/pagos", {"apoderado_id": ap1}, 409),
        ("E.8", "Pagar la inscripción de un alumno ajeno -> 403", "POST", f"/api/v1/inscripciones/{i2['id']}/pagos", {"apoderado_id": ap2}, 403),
    ]
    for caso, descripcion, metodo, ruta, cuerpo, esperado in casos:
        st, c = llamar(metodo, ruta, cuerpo)
        verificar(caso, descripcion, st == esperado, f"HTTP {st}")
    llamar("POST", f"/api/v1/eventos/{a}/inscripciones", {"alumno_id": al["DEMO-A03"], "apoderado_id": ap1})
    st, c = llamar("PATCH", f"/api/v1/eventos/{a}", {"cupo_maximo": 1})
    verificar("E.9", "Bajar el cupo por debajo de los inscritos -> 409", st == 409, f"HTTP {st}")

    print("\nAhora reinicia y verifica:\n  docker compose restart\n  docker compose exec api python -m scripts.prueba_tec16 verificar")


def fase_verificar(db):
    print("== CA4 · Lectura tras reinicio ==")
    _, lista = llamar("GET", "/api/v1/eventos?proximas=false")
    actividad = next((a for a in lista if a["codigo"] == CODIGO), None)
    verificar("R.1", "La actividad de prueba sigue existiendo", actividad is not None)
    if actividad is None:
        print("¿Ejecutaste primero la fase 'crear'?")
        return
    verificar("R.2", "Conserva el título, el cupo 4 y el costo", actividad["titulo"] == TITULO and actividad["cupo_maximo"] == 4 and actividad["costo"] == 2000)
    _, c = llamar("GET", f"/api/v1/eventos/{actividad['id']}/asistentes?estado=todas")
    estados = {x["alumno_codigo"]: x["estado"] for x in c["asistentes"]}
    verificar("R.3", "Asistentes intactos (A01 cancelada, A02 y A03 inscritas)",
              estados == {"DEMO-A01": "cancelada", "DEMO-A02": "inscrita", "DEMO-A03": "inscrita"}, str(estados))
    pagos = {x["alumno_codigo"]: [p["estado"] for p in llamar("GET", f"/api/v1/inscripciones/{x['inscripcion_id']}/pagos")[1]]
             for x in c["asistentes"]}
    verificar("R.4", "Pagos intactos (A01 reembolsado, A02 aprobado, A03 sin pago)",
              pagos == {"DEMO-A01": ["reembolsado"], "DEMO-A02": ["aprobado"], "DEMO-A03": []}, str(pagos))
    limpiar(db)
    print("\nSe borraron los datos de prueba.")


if len(sys.argv) != 2 or sys.argv[1] not in ("crear", "verificar"):
    print("Uso: python -m scripts.prueba_tec16 crear|verificar")
    sys.exit(2)
esperar_api()
# Cierre H-02: escrituras de eventos, inscripciones y pagos exigen sesión (dirección demo).
identidad_por_defecto("direccion.demo@ejemplo.cl")
with SessionLocal() as db:
    fase_crear(db) if sys.argv[1] == "crear" else fase_verificar(db)
terminar()
