"""TEC-16 · Prueba de punta a punta del modelo PostgreSQL, CRUD transaccional y persistencia.

Se ejecuta DENTRO del contenedor de la API, contra la API real y PostgreSQL real.
Son dos fases, con un reinicio entre medio para comprobar la lectura tras reinicio (CA4):

    docker compose exec api python -m scripts.prueba_tec16 crear
    docker compose restart
    docker compose exec api python -m scripts.prueba_tec16 verificar

Opciones:
    --conservar   en "verificar", no borra los datos de prueba al terminar.
    --url URL     URL base de la API (por defecto http://localhost:8000).

Todos los datos que crea son ficticios (TEST-TEC16-*, @ejemplo.cl) y se borran al final.
"""

import argparse
import json
import sys
import time
import urllib.error
import urllib.request
from datetime import timedelta

from sqlalchemy import delete, select, text

from app.db.models import Actividad, Alumno, Apoderado, Categoria, Inscripcion, Organizador, Pago
from app.db.postgres import SessionLocal

PREFIJO = "TEST-TEC16-"
CODIGO_REINICIO = "TEST-TEC16-REINICIO"
TITULO_REINICIO = "Actividad de control para el reinicio (TEC-16)"
resultados = []


# ---------- Utilidades ----------


def llamar(base, metodo, ruta, cuerpo=None):
    datos = json.dumps(cuerpo).encode("utf-8") if cuerpo is not None else None
    solicitud = urllib.request.Request(
        base + ruta, data=datos, method=metodo, headers={"Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(solicitud, timeout=15) as respuesta:
            contenido = respuesta.read()
            return respuesta.status, json.loads(contenido) if contenido else None
    except urllib.error.HTTPError as error:
        contenido = error.read()
        try:
            return error.code, json.loads(contenido)
        except ValueError:
            return error.code, contenido.decode("utf-8", "replace")


def verificar(caso, descripcion, condicion, detalle=""):
    estado = "PASS" if condicion else "FAIL"
    resultados.append((caso, estado))
    print(f"[{estado}] {caso} {descripcion}" + (f"  ->  {detalle}" if detalle else ""))


def det(cuerpo):
    if isinstance(cuerpo, dict) and "detail" in cuerpo:
        return f'detail="{cuerpo["detail"]}"'
    return ""


def campo(cuerpo, nombre):
    return cuerpo.get(nombre) if isinstance(cuerpo, dict) else None


def esperar_api(base, intentos=30):
    for _ in range(intentos):
        try:
            if llamar(base, "GET", "/health")[0] == 200:
                return True
        except OSError:
            pass
        time.sleep(1)
    return False


def ids_demo(db):
    ap1 = db.scalar(select(Apoderado.id).where(Apoderado.email == "apoderado.demo1@ejemplo.cl"))
    ap2 = db.scalar(select(Apoderado.id).where(Apoderado.email == "apoderado.demo2@ejemplo.cl"))
    alumnos = {a.codigo: a.id for a in db.scalars(select(Alumno).where(Alumno.codigo.like("DEMO-A0%"))).all()}
    if not ap1 or not ap2 or len(alumnos) < 6:
        print("Faltan los datos demo. Ejecuta primero, desde HITO-3/backend:")
        print("  docker compose exec postgres sh /sql/migrar.sh")
        sys.exit(2)
    hoy = db.scalar(text("SELECT (now() AT TIME ZONE 'America/Santiago')::date"))
    return ap1, ap2, alumnos, hoy


def limpiar(db, incluir_reinicio):
    consulta = select(Actividad.id).where(Actividad.codigo.like(f"{PREFIJO}%"))
    if not incluir_reinicio:
        consulta = consulta.where(Actividad.codigo != CODIGO_REINICIO)
    actividades = db.scalars(consulta).all()
    if actividades:
        inscripciones = db.scalars(select(Inscripcion.id).where(Inscripcion.actividad_id.in_(actividades))).all()
        if inscripciones:
            db.execute(delete(Pago).where(Pago.inscripcion_id.in_(inscripciones)))
            db.execute(delete(Inscripcion).where(Inscripcion.id.in_(inscripciones)))
        db.execute(delete(Actividad).where(Actividad.id.in_(actividades)))
    if incluir_reinicio:
        db.execute(delete(Categoria).where(Categoria.nombre.like("Prueba TEC-16%")))
        db.execute(delete(Organizador).where(Organizador.email.like("prueba.tec16.%@ejemplo.cl")))
    db.commit()
    return len(actividades)


# ---------- Fase 1: crear ----------


def fase_crear(base):
    with SessionLocal() as db:
        ap1, ap2, al, hoy = ids_demo(db)
        limpiar(db, incluir_reinicio=True)  # deja la base sin restos de corridas anteriores
    marca = str(int(time.time()))
    futura = str(hoy + timedelta(days=5))

    print("\n== Migraciones y datos institucionales ==")
    with SessionLocal() as db:
        versiones = db.scalars(text("SELECT version FROM schema_migraciones ORDER BY version")).all()
    verificar("M.1", "Migraciones V001, V002 y V003 registradas en schema_migraciones",
              {"V001", "V002", "V003"} <= set(versiones), f"{', '.join(versiones)}")
    st, c = llamar(base, "GET", "/api/v1/institucion")
    verificar("M.2", "GET /institucion devuelve los datos (ficticios) del jardín",
              st == 200 and "(demo)" in (campo(c, "nombre") or ""), f"HTTP {st} nombre={campo(c, 'nombre')}")

    print("\n== CP-TEC-16-01 · CRUD exitoso: crear, leer, modificar, eliminar ==")
    st, c = llamar(base, "POST", "/api/v1/categorias", {"nombre": f"Prueba TEC-16 {marca}", "descripcion": "Categoría de prueba"})
    categoria_id = campo(c, "id")
    verificar("C.1", "Crear categoría -> 201", st == 201 and categoria_id, f"HTTP {st} id={categoria_id}")

    st, c = llamar(base, "POST", "/api/v1/organizadores",
                   {"nombre": "Organizadora Prueba", "cargo": "Educadora", "email": f"Prueba.TEC16.{marca}@Ejemplo.cl"})
    organizador_id = campo(c, "id")
    verificar("C.2", "Crear organizador -> 201 (correo guardado en minúsculas)",
              st == 201 and campo(c, "email") == f"prueba.tec16.{marca}@ejemplo.cl", f"HTTP {st} email={campo(c, 'email')}")

    actividad = {
        "codigo": CODIGO_REINICIO, "titulo": "Título inicial", "fecha": futura, "hora": "10:30",
        "lugar": "Sala de prueba", "cupo_maximo": 3, "costo": 2000,
        "categoria_id": categoria_id, "organizador_id": organizador_id,
    }
    st, c = llamar(base, "POST", "/api/v1/actividades", actividad)
    actividad_id = campo(c, "id")
    verificar("C.3", "Crear actividad con categoría, organizador y costo -> 201",
              st == 201 and campo(c, "categoria_id") == categoria_id and campo(c, "costo") == 2000, f"HTTP {st} id={actividad_id}")

    st, c = llamar(base, "GET", f"/api/v1/actividades/{actividad_id}")
    verificar("C.4", "Leer la actividad recién creada -> 200 con los mismos datos",
              st == 200 and campo(c, "titulo") == "Título inicial" and campo(c, "cupos_disponibles") == 3, f"HTTP {st}")

    st, c = llamar(base, "PATCH", f"/api/v1/actividades/{actividad_id}", {"titulo": TITULO_REINICIO, "cupo_maximo": 4})
    verificar("C.5", "Modificar título y cupo (PATCH) -> 200",
              st == 200 and campo(c, "titulo") == TITULO_REINICIO and campo(c, "cupo_maximo") == 4, f"HTTP {st}")

    temporal = dict(actividad, codigo=f"{PREFIJO}{marca}-BORRAR", titulo="Actividad para borrar")
    st, c = llamar(base, "POST", "/api/v1/actividades", temporal)
    id_borrar = campo(c, "id")
    st, _ = llamar(base, "DELETE", f"/api/v1/actividades/{id_borrar}")
    st2, _ = llamar(base, "GET", f"/api/v1/actividades/{id_borrar}")
    verificar("C.6", "Eliminar actividad sin inscripciones -> 204 y luego GET -> 404",
              st == 204 and st2 == 404, f"DELETE {st} · GET {st2}")

    print("\n== Inscripción, pago simulado y cancelación transaccional ==")
    st, c = llamar(base, "POST", f"/api/v1/actividades/{actividad_id}/inscripciones", {"alumno_id": al["DEMO-A01"], "apoderado_id": ap1})
    insc_a01 = campo(c, "id")
    verificar("T.1", "Inscribir DEMO-A01 -> 201", st == 201, f"HTTP {st}")

    st, c = llamar(base, "POST", f"/api/v1/inscripciones/{insc_a01}/pagos", {"apoderado_id": ap1})
    verificar("T.2", "Pago SIMULADO -> 201, monto = costo, método 'simulado', referencia SIM-",
              st == 201 and campo(c, "monto") == 2000 and campo(c, "metodo") == "simulado"
              and str(campo(c, "referencia")).startswith("SIM-"), f"HTTP {st} ref={campo(c, 'referencia')}")

    st, c = llamar(base, "POST", f"/api/v1/actividades/{actividad_id}/inscripciones", {"alumno_id": al["DEMO-A02"], "apoderado_id": ap1})
    insc_a02 = campo(c, "id")
    st, c = llamar(base, "POST", f"/api/v1/inscripciones/{insc_a02}/pagos", {"apoderado_id": ap1})
    verificar("T.3", "Inscribir y pagar DEMO-A02 (queda para la fase verificar)", st == 201, f"HTTP {st}")

    st, c = llamar(base, "POST", f"/api/v1/inscripciones/{insc_a01}/cancelar", {"apoderado_id": ap1})
    st2, pagos = llamar(base, "GET", f"/api/v1/inscripciones/{insc_a01}/pagos")
    estados = [p["estado"] for p in pagos] if isinstance(pagos, list) else pagos
    verificar("T.4", "Cancelar DEMO-A01 -> 200 y su pago pasa a 'reembolsado' en la misma transacción",
              st == 200 and estados == ["reembolsado"], f"HTTP {st} pagos={estados}")

    print("\n== CP-TEC-16-02 · Entradas inválidas y rechazos del dominio ==")
    casos = [
        ("E.1", "Categoría repetida -> 409", "POST", "/api/v1/categorias", {"nombre": f"Prueba TEC-16 {marca}"}, 409),
        ("E.2", "Organizador con correo repetido -> 409", "POST", "/api/v1/organizadores",
         {"nombre": "Otra", "cargo": "Educadora", "email": f"prueba.tec16.{marca}@ejemplo.cl"}, 409),
        ("E.3", "Organizador con correo inválido -> 400", "POST", "/api/v1/organizadores",
         {"nombre": "Otra", "cargo": "Educadora", "email": "no-es-correo"}, 400),
        ("E.4", "Actividad con código repetido -> 409", "POST", "/api/v1/actividades", actividad, 409),
        ("E.5", "Actividad con código en minúsculas -> 400", "POST", "/api/v1/actividades", dict(actividad, codigo="test-tec16-x"), 400),
        ("E.6", "Actividad con cupo 0 -> 400", "POST", "/api/v1/actividades", dict(actividad, codigo=f"{PREFIJO}{marca}-C0", cupo_maximo=0), 400),
        ("E.7", "Actividad con costo negativo -> 400", "POST", "/api/v1/actividades", dict(actividad, codigo=f"{PREFIJO}{marca}-CN", costo=-1), 400),
        ("E.8", "Actividad con categoría inexistente -> 404", "POST", "/api/v1/actividades",
         dict(actividad, codigo=f"{PREFIJO}{marca}-SC", categoria_id=999999), 404),
        ("E.9", "PATCH sin campos -> 400", "PATCH", f"/api/v1/actividades/{actividad_id}", {}, 400),
        ("E.10", "PATCH con título null -> 400", "PATCH", f"/api/v1/actividades/{actividad_id}", {"titulo": None}, 400),
        ("E.11", "Bajar el cupo por debajo de los inscritos -> 409", "PATCH", f"/api/v1/actividades/{actividad_id}", {"cupo_maximo": 1}, None),
        ("E.12", "Eliminar actividad con inscripciones -> 409", "DELETE", f"/api/v1/actividades/{actividad_id}", None, 409),
        ("E.13", "Pagar dos veces la misma inscripción -> 409", "POST", f"/api/v1/inscripciones/{insc_a02}/pagos", {"apoderado_id": ap1}, 409),
        ("E.14", "Pagar inscripción de un alumno ajeno -> 403", "POST", f"/api/v1/inscripciones/{insc_a02}/pagos", {"apoderado_id": ap2}, 403),
        ("E.15", "Pagar una inscripción cancelada -> 409", "POST", f"/api/v1/inscripciones/{insc_a01}/pagos", {"apoderado_id": ap1}, 409),
        ("E.16", "Modificar actividad inexistente -> 404", "PATCH", "/api/v1/actividades/999999", {"titulo": "Nada"}, 404),
    ]
    for caso, descripcion, metodo, ruta, cuerpo, esperado in casos:
        if caso == "E.11":
            # Hay 1 inscrita (A02). Se inscribe A03 para tener 2 y se intenta bajar el cupo a 1.
            llamar(base, "POST", f"/api/v1/actividades/{actividad_id}/inscripciones", {"alumno_id": al["DEMO-A03"], "apoderado_id": ap1})
            esperado = 409
        st, c = llamar(base, metodo, ruta, cuerpo)
        verificar(caso, descripcion, st == esperado, f"HTTP {st} {det(c)}")

    gratis = dict(actividad, codigo=f"{PREFIJO}{marca}-GRATIS", costo=0, titulo="Actividad gratuita")
    _, c = llamar(base, "POST", "/api/v1/actividades", gratis)
    _, i = llamar(base, "POST", f"/api/v1/actividades/{campo(c, 'id')}/inscripciones", {"alumno_id": al["DEMO-A04"], "apoderado_id": ap1})
    st, c = llamar(base, "POST", f"/api/v1/inscripciones/{campo(i, 'id')}/pagos", {"apoderado_id": ap1})
    verificar("E.17", "Pagar una actividad gratuita -> 409", st == 409, f"HTTP {st} {det(c)}")

    print("\n== CA3 / CA5 · Solo datos ficticios ==")
    with SessionLocal() as db:
        no_demo = db.execute(text("""
            SELECT 'apoderado: ' || email FROM apoderados WHERE email NOT LIKE '%@ejemplo.cl'
            UNION ALL SELECT 'usuario: ' || email FROM usuarios WHERE email NOT LIKE '%@ejemplo.cl'
            UNION ALL SELECT 'organizador: ' || email FROM organizadores WHERE email NOT LIKE '%@ejemplo.cl'
            UNION ALL SELECT 'alumno: ' || codigo FROM alumnos WHERE codigo NOT LIKE 'DEMO-%'
            UNION ALL SELECT 'pago no simulado: ' || referencia FROM pagos WHERE metodo <> 'simulado'
        """)).scalars().all()
    verificar("F.1", "Todos los apoderados, usuarios, organizadores y alumnos son de demostración",
              not no_demo, "ninguno fuera de @ejemplo.cl / DEMO-*" if not no_demo else "revisar: " + "; ".join(no_demo[:5]))

    with SessionLocal() as db:
        limpiar(db, incluir_reinicio=False)
    print(f"\nSe dejó la actividad {CODIGO_REINICIO} (id {actividad_id}) con DEMO-A02 y DEMO-A03 inscritos,")
    print("A02 con pago aprobado y A01 cancelado con pago reembolsado. Ahora reinicia y verifica:")
    print("  docker compose restart")
    print("  docker compose exec api python -m scripts.prueba_tec16 verificar")


# ---------- Fase 2: verificar tras reinicio ----------


def fase_verificar(base, conservar):
    print("== CA4 · Lectura tras reinicio ==")
    st, lista = llamar(base, "GET", "/api/v1/actividades?proximas=false")
    actividad = next((a for a in lista if a["codigo"] == CODIGO_REINICIO), None) if isinstance(lista, list) else None
    verificar("R.1", f"La actividad {CODIGO_REINICIO} sigue existiendo", actividad is not None, f"HTTP {st}")
    if not actividad:
        print("No se encontró. ¿Ejecutaste primero la fase 'crear'?")
        return

    verificar("R.2", "Conserva los cambios del PATCH (título y cupo 4) y su costo",
              actividad["titulo"] == TITULO_REINICIO and actividad["cupo_maximo"] == 4 and actividad["costo"] == 2000,
              f"titulo='{actividad['titulo']}' cupo={actividad['cupo_maximo']} costo={actividad['costo']}")

    st, c = llamar(base, "GET", f"/api/v1/actividades/{actividad['id']}/asistentes?estado=todas")
    estados = {a["alumno_codigo"]: a["estado"] for a in campo(c, "asistentes") or []}
    verificar("R.3", "Asistentes y estados intactos (A01 cancelada, A02 y A03 inscritas)",
              estados == {"DEMO-A01": "cancelada", "DEMO-A02": "inscrita", "DEMO-A03": "inscrita"}, f"{estados}")

    pagos = {}
    for a in campo(c, "asistentes") or []:
        _, p = llamar(base, "GET", f"/api/v1/inscripciones/{a['inscripcion_id']}/pagos")
        pagos[a["alumno_codigo"]] = [x["estado"] for x in p] if isinstance(p, list) else p
    verificar("R.4", "Pagos intactos (A01 reembolsado, A02 aprobado, A03 sin pago)",
              pagos == {"DEMO-A01": ["reembolsado"], "DEMO-A02": ["aprobado"], "DEMO-A03": []}, f"{pagos}")

    if conservar:
        print(f"\n(--conservar) Los datos de prueba {PREFIJO}* quedaron en la base.")
    else:
        with SessionLocal() as db:
            limpiar(db, incluir_reinicio=True)
        print(f"\nLimpieza: se borraron los datos de prueba {PREFIJO}*.")


# ---------- Principal ----------


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("fase", choices=["crear", "verificar"])
    parser.add_argument("--url", default="http://localhost:8000")
    parser.add_argument("--conservar", action="store_true")
    args = parser.parse_args()

    if not esperar_api(args.url):
        print(f"La API no responde en {args.url}. ¿Está levantado docker compose?")
        sys.exit(2)

    print(f"TEC-16 · fase '{args.fase}' contra {args.url}")
    if args.fase == "crear":
        fase_crear(args.url)
    else:
        fase_verificar(args.url, args.conservar)

    total = len(resultados)
    fallidas = [caso for caso, estado in resultados if estado == "FAIL"]
    print(f"\nResultado: {total - len(fallidas)}/{total} PASS" + (f" · FAIL: {', '.join(fallidas)}" if fallidas else ""))
    sys.exit(1 if fallidas else 0)


if __name__ == "__main__":
    main()
