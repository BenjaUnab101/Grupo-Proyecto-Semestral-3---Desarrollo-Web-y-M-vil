"""HU-19 · Prueba de punta a punta de inscripciones, cupos, cancelaciones y asistentes.

Se ejecuta DENTRO del contenedor de la API, contra la API real y PostgreSQL real:

    docker compose exec api python -m scripts.prueba_hu19

Opciones:
    --conservar   no borra las actividades de prueba al terminar (para capturas en Swagger).
    --url URL     URL base de la API (por defecto http://localhost:8000).

Solo usa la librería estándar de Python más el propio código de la app (para crear y
borrar las actividades de prueba). Todos los datos son ficticios (DEMO-*, TEST-HU19-*).
"""

import argparse
import json
import sys
import threading
import time
import urllib.error
import urllib.request
from datetime import timedelta

from sqlalchemy import delete, select, text

from app.db.models import Actividad, Alumno, Apoderado, Inscripcion
from app.db.postgres import SessionLocal

PREFIJO = "TEST-HU19-"
resultados = []


# ---------- Utilidades ----------


def llamar(base, metodo, ruta, cuerpo=None):
    datos = json.dumps(cuerpo).encode("utf-8") if cuerpo is not None else None
    solicitud = urllib.request.Request(
        base + ruta,
        data=datos,
        method=metodo,
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(solicitud, timeout=15) as respuesta:
            return respuesta.status, json.loads(respuesta.read() or b"null")
    except urllib.error.HTTPError as error:
        cuerpo_error = error.read()
        try:
            return error.code, json.loads(cuerpo_error)
        except ValueError:
            return error.code, cuerpo_error.decode("utf-8", "replace")


def verificar(caso, descripcion, condicion, detalle=""):
    estado = "PASS" if condicion else "FAIL"
    resultados.append((caso, estado))
    print(f"[{estado}] {caso} {descripcion}" + (f"  ->  {detalle}" if detalle else ""))


def detalle(cuerpo):
    if isinstance(cuerpo, dict) and "detail" in cuerpo:
        return f'detail="{cuerpo["detail"]}"'
    return ""


# ---------- Preparación de datos de prueba ----------


def preparar(db):
    apoderado_1 = db.scalar(select(Apoderado).where(Apoderado.email == "apoderado.demo1@ejemplo.cl"))
    apoderado_2 = db.scalar(select(Apoderado).where(Apoderado.email == "apoderado.demo2@ejemplo.cl"))
    alumnos = {
        a.codigo: a.id
        for a in db.scalars(select(Alumno).where(Alumno.codigo.like("DEMO-A0%"))).all()
    }
    if not apoderado_1 or not apoderado_2 or len(alumnos) < 6:
        print("Faltan los datos demo de HU-19. Ejecuta primero, desde HITO-3/backend:")
        print("  docker compose exec postgres sh /sql/migrar.sh")
        sys.exit(2)

    hoy = db.scalar(text("SELECT (now() AT TIME ZONE 'America/Santiago')::date"))
    marca = str(int(time.time() * 1000))

    def crear(sufijo, cupo, dias):
        actividad = Actividad(
            codigo=f"{PREFIJO}{marca}-{sufijo}",
            titulo=f"Actividad de prueba HU-19 ({sufijo})",
            fecha=hoy + timedelta(days=dias),
            cupo_maximo=cupo,
            inscripciones_abiertas=True,
        )
        db.add(actividad)
        db.flush()
        return actividad.id

    ids = {
        "cupo2": crear("CUPO2", 2, 3),
        "pasada": crear("PASADA", 5, -1),
        "permisos": crear("PERMISOS", 5, 3),
        "concurrencia": [crear(f"CONC{n}", 3, 3) for n in range(1, 6)],
    }
    db.commit()
    return apoderado_1.id, apoderado_2.id, alumnos, ids


def limpiar(db):
    ids = db.scalars(select(Actividad.id).where(Actividad.codigo.like(f"{PREFIJO}%"))).all()
    if ids:
        db.execute(delete(Inscripcion).where(Inscripcion.actividad_id.in_(ids)))
        db.execute(delete(Actividad).where(Actividad.id.in_(ids)))
        db.commit()
    return len(ids)


# ---------- Casos ----------


def pruebas(base, ap1, ap2, al, ids):
    a = ids["cupo2"]

    print("\n== CP-HU-19-01 · Flujo exitoso: inscribir, recuperar, cancelar ==")
    st, c = llamar(base, "GET", f"/api/v1/actividades/{a}")
    verificar("01.1", "GET actividad muestra 2 cupos disponibles", st == 200 and c["cupos_disponibles"] == 2,
              f"HTTP {st} cupos_disponibles={c.get('cupos_disponibles') if isinstance(c, dict) else c}")

    st, c = llamar(base, "POST", f"/api/v1/actividades/{a}/inscripciones", {"alumno_id": al["DEMO-A01"], "apoderado_id": ap1})
    insc_a01 = c.get("id") if isinstance(c, dict) else None
    verificar("01.2", "Inscribir DEMO-A01 -> 201, estado 'inscrita', queda 1 cupo",
              st == 201 and c["estado"] == "inscrita" and c["cupos_disponibles"] == 1,
              f"HTTP {st} id={insc_a01} cupos_disponibles={c.get('cupos_disponibles') if isinstance(c, dict) else ''}")

    st, c = llamar(base, "GET", f"/api/v1/actividades/{a}/asistentes")
    codigos = [x["alumno_codigo"] for x in c.get("asistentes", [])] if isinstance(c, dict) else []
    verificar("01.3", "La inscripción se guardó y se recupera en la lista de asistentes",
              st == 200 and codigos == ["DEMO-A01"] and c["total_inscritos"] == 1, f"HTTP {st} asistentes={codigos}")

    st, c = llamar(base, "POST", f"/api/v1/actividades/{a}/inscripciones", {"alumno_id": al["DEMO-A02"], "apoderado_id": ap1})
    verificar("01.4", "Inscribir DEMO-A02 -> 201, quedan 0 cupos", st == 201 and c["cupos_disponibles"] == 0, f"HTTP {st}")

    st, c = llamar(base, "POST", f"/api/v1/inscripciones/{insc_a01}/cancelar", {"apoderado_id": ap1})
    verificar("01.5", "Cancelar DEMO-A01 -> 200, estado 'cancelada', se libera 1 cupo",
              st == 200 and c["estado"] == "cancelada" and c["cancelada_en"] and c["cupos_disponibles"] == 1,
              f"HTTP {st} estado={c.get('estado') if isinstance(c, dict) else ''}")

    st, c = llamar(base, "POST", f"/api/v1/actividades/{a}/inscripciones", {"alumno_id": al["DEMO-A03"], "apoderado_id": ap1})
    verificar("01.6", "El cupo liberado se puede usar: inscribir DEMO-A03 -> 201", st == 201, f"HTTP {st}")

    st, c = llamar(base, "GET", f"/api/v1/actividades/{a}/asistentes?estado=todas")
    estados = {x["alumno_codigo"]: x["estado"] for x in c.get("asistentes", [])} if isinstance(c, dict) else {}
    verificar("01.7", "Asistentes (todas): A01 cancelada, A02 e A03 inscritas; totales 2/1",
              st == 200 and estados == {"DEMO-A01": "cancelada", "DEMO-A02": "inscrita", "DEMO-A03": "inscrita"}
              and c["total_inscritos"] == 2 and c["total_cancelados"] == 1, f"HTTP {st} {estados}")

    print("\n== CA3 · Duplicados ==")
    st, c = llamar(base, "POST", f"/api/v1/actividades/{a}/inscripciones", {"alumno_id": al["DEMO-A02"], "apoderado_id": ap1})
    verificar("03.1", "Inscribir de nuevo a DEMO-A02 -> 409 duplicado",
              st == 409 and "ya está inscrito" in c.get("detail", ""), f"HTTP {st} {detalle(c)}")

    st, c = llamar(base, "POST", f"/api/v1/inscripciones/{insc_a01}/cancelar", {"apoderado_id": ap1})
    verificar("03.2", "Cancelar dos veces -> 409", st == 409 and "ya estaba cancelada" in c.get("detail", ""),
              f"HTTP {st} {detalle(c)}")

    print("\n== CA5 · Sobrecupo ==")
    st, c = llamar(base, "POST", f"/api/v1/actividades/{a}/inscripciones", {"alumno_id": al["DEMO-A04"], "apoderado_id": ap1})
    verificar("05.1", "Actividad llena: inscribir DEMO-A04 -> 409 sin cupos",
              st == 409 and "No quedan cupos" in c.get("detail", ""), f"HTTP {st} {detalle(c)}")

    st, c = llamar(base, "POST", f"/api/v1/actividades/{a}/inscripciones", {"alumno_id": al["DEMO-A01"], "apoderado_id": ap1})
    verificar("05.2", "Reinscribir a DEMO-A01 (cancelado) con la actividad llena -> 409 sin cupos",
              st == 409 and "No quedan cupos" in c.get("detail", ""), f"HTTP {st} {detalle(c)}")

    print("\n== CP-HU-19-02 · Entradas inválidas y rechazos del dominio ==")
    st, c = llamar(base, "POST", f"/api/v1/actividades/{a}/inscripciones", {"alumno_id": 0, "apoderado_id": ap1})
    verificar("02.1", "alumno_id = 0 -> 400", st == 400, f"HTTP {st} {detalle(c)}")

    st, c = llamar(base, "POST", f"/api/v1/actividades/{a}/inscripciones", {"alumno_id": al["DEMO-A01"]})
    verificar("02.2", "Falta apoderado_id -> 400", st == 400, f"HTTP {st} {detalle(c)}")

    st, c = llamar(base, "GET", f"/api/v1/actividades/{a}/asistentes?estado=otro")
    verificar("02.3", "Filtro de estado inválido -> 400", st == 400, f"HTTP {st} {detalle(c)}")

    st, c = llamar(base, "POST", "/api/v1/actividades/999999/inscripciones", {"alumno_id": al["DEMO-A01"], "apoderado_id": ap1})
    verificar("02.4", "Actividad inexistente -> 404", st == 404, f"HTTP {st} {detalle(c)}")

    st, c = llamar(base, "POST", f"/api/v1/actividades/{a}/inscripciones", {"alumno_id": 999999, "apoderado_id": ap1})
    verificar("02.5", "Alumno inexistente -> 404", st == 404, f"HTTP {st} {detalle(c)}")

    st, c = llamar(base, "POST", "/api/v1/inscripciones/999999/cancelar", {"apoderado_id": ap1})
    verificar("02.6", "Cancelar inscripción inexistente -> 404", st == 404, f"HTTP {st} {detalle(c)}")

    p = ids["permisos"]
    st, c = llamar(base, "POST", f"/api/v1/actividades/{p}/inscripciones", {"alumno_id": al["DEMO-A01"], "apoderado_id": ap2})
    verificar("02.7", "Un apoderado no puede inscribir a un alumno que no es suyo -> 403", st == 403, f"HTTP {st} {detalle(c)}")

    st, c = llamar(base, "POST", f"/api/v1/actividades/{p}/inscripciones", {"alumno_id": al["DEMO-A06"], "apoderado_id": ap2})
    id_a06 = c.get("id") if isinstance(c, dict) else None
    st2, c2 = llamar(base, "POST", f"/api/v1/inscripciones/{id_a06}/cancelar", {"apoderado_id": ap1})
    verificar("02.8", "Un apoderado no puede cancelar la inscripción de otro -> 403", st == 201 and st2 == 403,
              f"HTTP {st2} {detalle(c2)}")

    st, c = llamar(base, "POST", f"/api/v1/actividades/{ids['pasada']}/inscripciones", {"alumno_id": al["DEMO-A01"], "apoderado_id": ap1})
    verificar("02.9", "Actividad que ya ocurrió -> 409 inscripciones cerradas",
              st == 409 and "cerradas" in c.get("detail", ""), f"HTTP {st} {detalle(c)}")


def prueba_concurrencia(base, ap1, ap2, al, actividades):
    print("\n== CA2 · Control de cupo con solicitudes SIMULTÁNEAS ==")
    alumnos = [(al[f"DEMO-A0{n}"], ap1) for n in range(1, 6)] + [(al["DEMO-A06"], ap2)]

    for ronda, actividad_id in enumerate(actividades, start=1):
        barrera = threading.Barrier(len(alumnos))
        codigos = []

        def inscribir(alumno_id, apoderado_id):
            barrera.wait()  # todas las solicitudes salen al mismo tiempo
            st, _ = llamar(base, "POST", f"/api/v1/actividades/{actividad_id}/inscripciones",
                           {"alumno_id": alumno_id, "apoderado_id": apoderado_id})
            codigos.append(st)

        hilos = [threading.Thread(target=inscribir, args=par) for par in alumnos]
        for h in hilos:
            h.start()
        for h in hilos:
            h.join()

        with SessionLocal() as db:
            en_base = db.scalar(text(
                "SELECT count(*) FROM v_asistentes_actividad WHERE actividad_id = :id AND estado = 'inscrita'"
            ), {"id": actividad_id})

        aceptadas, rechazadas = codigos.count(201), codigos.count(409)
        verificar(f"02-CONC.{ronda}", f"Ronda {ronda}: 6 solicitudes simultáneas, cupo 3",
                  aceptadas == 3 and rechazadas == 3 and en_base == 3,
                  f"201={aceptadas} 409={rechazadas} inscritas en PostgreSQL={en_base}")


# ---------- Principal ----------


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--url", default="http://localhost:8000")
    parser.add_argument("--conservar", action="store_true")
    args = parser.parse_args()

    st, _ = llamar(args.url, "GET", "/health")
    if st != 200:
        print(f"La API no responde en {args.url} (HTTP {st}). ¿Está levantado docker compose?")
        sys.exit(2)

    with SessionLocal() as db:
        ap1, ap2, al, ids = preparar(db)

    print(f"HU-19 · Prueba de punta a punta contra {args.url}")
    try:
        pruebas(args.url, ap1, ap2, al, ids)
        prueba_concurrencia(args.url, ap1, ap2, al, ids["concurrencia"])
    finally:
        if args.conservar:
            print("\n(--conservar) Las actividades TEST-HU19-* quedaron en la base para revisarlas.")
        else:
            with SessionLocal() as db:
                borradas = limpiar(db)
            print(f"\nLimpieza: se borraron {borradas} actividades de prueba TEST-HU19-* y sus inscripciones.")

    total = len(resultados)
    fallidas = [caso for caso, estado in resultados if estado == "FAIL"]
    print(f"\nResultado: {total - len(fallidas)}/{total} PASS" + (f" · FAIL: {', '.join(fallidas)}" if fallidas else ""))
    sys.exit(1 if fallidas else 0)


if __name__ == "__main__":
    main()
