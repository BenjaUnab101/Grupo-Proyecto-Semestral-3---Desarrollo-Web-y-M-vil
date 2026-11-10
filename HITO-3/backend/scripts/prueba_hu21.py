"""HU-21 · Comunicados en PostgreSQL con bitácora en MongoDB (contra la API real).

    docker compose exec api python -m scripts.prueba_hu21

Los comunicados de prueba llevan el prefijo "[TEST-HU21]" y se borran al final.
"""

from datetime import timedelta

from sqlalchemy import delete, select, text

from app.db.models import Apoderado, Comunicado, Usuario
from app.db.mongo import get_bitacora_comunicados_collection
from app.db.postgres import SessionLocal
from scripts.utilidades import esperar_api, llamar, terminar, verificar

PREFIJO = "[TEST-HU21] "
esperar_api()
db = SessionLocal()


def usuario(email):
    return db.scalar(select(Usuario.id).where(Usuario.email == email))


direccion, educadora, apoderado = usuario("direccion.demo@ejemplo.cl"), usuario("educadora.demo@ejemplo.cl"), usuario("apoderado.demo1@ejemplo.cl")
ap1 = db.scalar(select(Apoderado.id).where(Apoderado.email == "apoderado.demo1@ejemplo.cl"))  # hijos en Preescolar
ap2 = db.scalar(select(Apoderado.id).where(Apoderado.email == "apoderado.demo2@ejemplo.cl"))  # hijo en Sala TEL
hoy = db.scalar(text("SELECT (now() AT TIME ZONE 'America/Santiago')::date"))
nuevo = {"titulo": PREFIJO + "Taller TEL", "cuerpo": "Comunicado de prueba.", "nivel": "Salas TEL", "es_urgente": True}


def titulos(lista):
    return [c["titulo"] for c in lista]


print("== CP-HU-21-01 · Publicar, leer, modificar (CA1) ==")
st, c = llamar("POST", "/api/v1/comunicados", nuevo, usuario=direccion)
cid = c.get("id")
verificar("01.1", "Dirección publica -> 201", st == 201, f"HTTP {st}")
verificar("01.2", "Quedó en la tabla comunicados de PostgreSQL", db.get(Comunicado, cid) is not None)
st, c = llamar("GET", f"/api/v1/comunicados/{cid}")
verificar("01.3", "Se lee por id sin identificarse", st == 200 and c["titulo"] == nuevo["titulo"])
st, c = llamar("PATCH", f"/api/v1/comunicados/{cid}", {"titulo": PREFIJO + "Taller TEL (editado)", "es_urgente": False}, usuario=direccion)
verificar("01.4", "Dirección lo modifica -> 200", st == 200 and c["es_urgente"] is False)
st, c = llamar("POST", "/api/v1/comunicados", dict(nuevo, titulo=PREFIJO + "De la educadora", nivel="Preescolar"), usuario=educadora)
cid_educadora = c.get("id")
verificar("01.5", "La educadora publica su propio comunicado -> 201", st == 201)

print("\n== CA2 · Listas y filtros ==")
st, lista = llamar("GET", "/api/v1/comunicados")
verificar("02.1", "Por defecto solo vigentes (sin el vencido, el programado ni el borrador)",
          st == 200 and "Horario de invierno vigente" not in titulos(lista) and "Borrador: fiesta de fin de año" not in titulos(lista))
st, lista = llamar("GET", "/api/v1/comunicados?nivel=Preescolar")
verificar("02.2", "Filtro nivel=Preescolar", st == 200 and lista and all(c["nivel"] == "Preescolar" for c in lista))
st, lista = llamar("GET", "/api/v1/comunicados?urgente=true")
verificar("02.3", "Filtro urgente=true", st == 200 and all(c["es_urgente"] for c in lista))
st, lista = llamar("GET", f"/api/v1/comunicados?desde={hoy}&hasta={hoy}")
verificar("02.4", "Filtro por fecha (hoy) incluye los de la prueba", PREFIJO + "Taller TEL (editado)" in titulos(lista))
_, c1 = llamar("GET", f"/api/v1/apoderados/{ap1}/comunicados", usuario=direccion)  # H-02: exige sesión
_, c2 = llamar("GET", f"/api/v1/apoderados/{ap2}/comunicados", usuario=direccion)
verificar("02.5", "Pertinentes: el apoderado de Sala TEL ve el comunicado TEL; el de Preescolar no",
          c1["niveles"] == ["General", "Preescolar"] and c2["niveles"] == ["General", "Salas TEL"]
          and PREFIJO + "Taller TEL (editado)" in titulos(c2["comunicados"]) and PREFIJO + "Taller TEL (editado)" not in titulos(c1["comunicados"]))
st, _ = llamar("GET", "/api/v1/comunicados?vigentes=false")
st2, _ = llamar("GET", "/api/v1/comunicados?vigentes=false", usuario=direccion)
verificar("02.6", "vigentes=false: sin cuenta 403, dirección 200", st == 403 and st2 == 200)

print("\n== CA3 · Permisos ==")
casos = [
    ("03.1", "Publicar sin identificarse -> 401", "POST", "/api/v1/comunicados", nuevo, None, 401),
    ("03.2", "Publicar como apoderado -> 403", "POST", "/api/v1/comunicados", nuevo, apoderado, 403),
    ("03.3", "La educadora edita uno de dirección -> 403", "PATCH", f"/api/v1/comunicados/{cid}", {"titulo": "Intento"}, educadora, 403),
    ("03.4", "Dirección edita el de la educadora -> 200", "PATCH", f"/api/v1/comunicados/{cid_educadora}", {"es_urgente": True}, direccion, 200),
    ("03.5", "Ver la bitácora como apoderado -> 403", "GET", f"/api/v1/comunicados/{cid}/bitacora", None, apoderado, 403),
]
for caso, descripcion, metodo, ruta, cuerpo, quien, esperado in casos:
    st, c = llamar(metodo, ruta, cuerpo, usuario=quien)
    verificar(caso, descripcion, st == esperado, f"HTTP {st}")

print("\n== CP-HU-21-02 · Datos inválidos ==")
casos = [
    ("04.1", "Nivel inexistente -> 400", "POST", "/api/v1/comunicados", dict(nuevo, nivel="Primaria"), direccion, 400),
    ("04.2", "Título de 2 letras (con espacios) -> 400", "POST", "/api/v1/comunicados", dict(nuevo, titulo="  ab  "), direccion, 400),
    ("04.3", "Vigencia que termina antes de publicarse -> 400", "POST", "/api/v1/comunicados",
     dict(nuevo, vigente_hasta=str(hoy - timedelta(days=3))), direccion, 400),
    ("04.4", "Filtro desde posterior a hasta -> 400", "GET", f"/api/v1/comunicados?desde={hoy}&hasta={hoy - timedelta(days=1)}", None, None, 400),
    ("04.5", "Comunicado inexistente -> 404", "GET", "/api/v1/comunicados/999999", None, None, 404),
]
for caso, descripcion, metodo, ruta, cuerpo, quien, esperado in casos:
    st, c = llamar(metodo, ruta, cuerpo, usuario=quien)
    verificar(caso, descripcion, st == esperado, f"HTTP {st}")

print("\n== Eliminar y bitácora en MongoDB ==")
st, _ = llamar("DELETE", f"/api/v1/comunicados/{cid}", usuario=direccion)
st2, _ = llamar("GET", f"/api/v1/comunicados/{cid}", usuario=direccion)
verificar("05.1", "Eliminar -> 204 y luego 404", st == 204 and st2 == 404)
st, bitacora = llamar("GET", f"/api/v1/comunicados/{cid}/bitacora", usuario=direccion)
verificar("05.2", "La bitácora guarda crear -> editar -> eliminar", st == 200 and [e["accion"] for e in bitacora] == ["crear", "editar", "eliminar"])

# Limpieza
ids = db.scalars(select(Comunicado.id).where(Comunicado.titulo.like(PREFIJO + "%"))).all() + [cid]
get_bitacora_comunicados_collection().delete_many({"comunicado_id": {"$in": ids}})
db.execute(delete(Comunicado).where(Comunicado.titulo.like(PREFIJO + "%")))
db.commit()
terminar()
