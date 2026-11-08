"""HU-25 · Pre-matrícula con seguimiento (contra la API y PostgreSQL reales).

CP-HU-25-01 (caso exitoso + lectura tras reinicio):
    docker compose exec api python -m scripts.prueba_hu25 crear
    docker compose restart api postgres
    docker compose exec api python -m scripts.prueba_hu25 verificar

CP-HU-25-02 (casos negativos):
    docker compose exec api python -m scripts.prueba_hu25 negativos

Datos ficticios: nombres "[TEST-HU25] ...", correo @ejemplo.cl. Se borran al final.
"""

import sys

from sqlalchemy import delete, select

from app.db.models import SolicitudPrematricula, Usuario
from app.db.postgres import SessionLocal
from scripts.utilidades import esperar_api, llamar, terminar, verificar

PREFIJO = "[TEST-HU25] "
CORREO = "familia.prueba.hu25@ejemplo.cl"
SOLICITUD = {
    "nombre_apoderado": PREFIJO + "Familia Prueba",
    "rut": "12.345.678-5",
    "correo": CORREO,
    "telefono": "+56 9 1234 5678",
    "nombre_parvulo": PREFIJO + "Párvulo Prueba",
    "nivel": "medio-mayor",
    "comentario": "Solicitud ficticia de prueba",
    "consentimiento": True,
}


def limpiar(db):
    db.execute(delete(SolicitudPrematricula).where(SolicitudPrematricula.nombre_apoderado.like(PREFIJO + "%")))
    db.commit()


def fase_crear(db, direccion):
    limpiar(db)
    st, c = llamar("POST", "/api/v1/prematriculas", SOLICITUD)
    verificar("C.1", "POST crea la solicitud -> 201 con id, código y estado 'recibida'",
              st == 201 and c["id"] and c["codigo"].startswith("PM-") and c["estado"] == "recibida", str(c))
    fila = db.get(SolicitudPrematricula, c["id"])
    verificar("C.2", "Quedó en PostgreSQL con RUT y teléfono normalizados",
              fila.rut == "12345678-5" and fila.telefono == "912345678", f"rut={fila.rut} telefono={fila.telefono}")
    st, c = llamar("PATCH", f"/api/v1/prematriculas/{c['id']}/estado",
                   {"estado": "en_revision", "mensaje_familia": "Estamos revisando tu solicitud."}, usuario=direccion)
    verificar("C.3", "Dirección la pasa a 'en_revision'", st == 200 and c["estado"] == "en_revision")
    print(f"\nCódigo: {c['codigo']}. Ahora reinicia y verifica:")
    print("  docker compose restart api postgres\n  docker compose exec api python -m scripts.prueba_hu25 verificar")


def fase_verificar(db, direccion):
    fila = db.scalar(select(SolicitudPrematricula).where(SolicitudPrematricula.nombre_apoderado.like(PREFIJO + "%")))
    if fila is None:
        print("No se encontró la solicitud de prueba. ¿Ejecutaste primero la fase 'crear'?")
        sys.exit(2)
    st, c = llamar("POST", "/api/v1/prematriculas/seguimiento", {"codigo": fila.codigo.lower(), "correo": CORREO.upper()})
    verificar("V.1", "Tras el reinicio, la familia consulta su estado (código en minúsculas, correo en mayúsculas)",
              st == 200 and c["estado"] == "en_revision" and c["mensaje_familia"] == "Estamos revisando tu solicitud.", f"HTTP {st}")
    verificar("V.2", "El seguimiento no muestra datos de contacto ni RUT", st == 200 and not {"correo", "telefono", "rut"} & set(c))
    st, lista = llamar("GET", "/api/v1/prematriculas?estado=en_revision", usuario=direccion)
    verificar("V.3", "Dirección la ve en el listado filtrado", st == 200 and fila.codigo in [s["codigo"] for s in lista])
    llamar("PATCH", f"/api/v1/prematriculas/{fila.id}/estado", {"estado": "aceptada", "mensaje_familia": "¡Bienvenidos!"}, usuario=direccion)
    st, c = llamar("POST", "/api/v1/prematriculas/seguimiento", {"codigo": fila.codigo, "correo": CORREO})
    verificar("V.4", "La familia ve el estado nuevo 'aceptada'", st == 200 and c["estado"] == "aceptada")
    limpiar(db)


def fase_negativos(db, direccion, educadora):
    limpiar(db)
    casos_400 = [
        ("N.1", "RUT con dígito verificador incorrecto", {"rut": "12.345.678-9"}, "rut"),
        ("N.2", "Correo sin dominio", {"correo": "familia@ejemplo"}, "correo"),
        ("N.3", "Teléfono de 8 dígitos", {"telefono": "12345678"}, "telefono"),
        ("N.4", "Nivel que no existe", {"nivel": "kinder-z"}, "nivel"),
        ("N.5", "Sin consentimiento", {"consentimiento": False}, "consentimiento"),
        ("N.6", "Nombre del párvulo vacío", {"nombre_parvulo": "   "}, "nombre_parvulo"),
    ]
    for caso, descripcion, cambio, campo in casos_400:
        st, c = llamar("POST", "/api/v1/prematriculas", SOLICITUD | cambio)
        mensajes = {e["campo"]: e["mensaje"] for e in c.get("errores", [])}
        verificar(caso, f"400: {descripcion}", st == 400 and f"body.{campo}" in mensajes, mensajes.get(f"body.{campo}", f"HTTP {st}"))
    verificar("N.7", "Ninguna solicitud inválida quedó guardada",
              db.scalar(select(SolicitudPrematricula).where(SolicitudPrematricula.nombre_apoderado.like(PREFIJO + "%"))) is None)

    st1, creada = llamar("POST", "/api/v1/prematriculas", SOLICITUD)
    st2, c = llamar("POST", "/api/v1/prematriculas", SOLICITUD)
    verificar("N.8", "409: segunda solicitud en curso para el mismo párvulo y nivel", st1 == 201 and st2 == 409, c.get("detail"))
    st, c = llamar("POST", "/api/v1/prematriculas/seguimiento", {"codigo": creada["codigo"], "correo": "otra@ejemplo.cl"})
    verificar("N.9", "404: código correcto con otro correo", st == 404, c.get("detail"))
    st, _ = llamar("GET", "/api/v1/prematriculas")
    verificar("N.10", "401: listar sin identificarse", st == 401)
    st, _ = llamar("GET", "/api/v1/prematriculas", usuario=educadora)
    verificar("N.11", "403: el personal (educadora) no ve las solicitudes", st == 403)
    st, _ = llamar("PATCH", f"/api/v1/prematriculas/{creada['id']}/estado", {"estado": "pausada"}, usuario=direccion)
    verificar("N.12", "400: estado que no existe", st == 400)
    st, _ = llamar("PATCH", "/api/v1/prematriculas/999999/estado", {"estado": "aceptada"}, usuario=direccion)
    verificar("N.13", "404: solicitud inexistente", st == 404)
    limpiar(db)


fase = sys.argv[1] if len(sys.argv) == 2 else ""
if fase not in ("crear", "verificar", "negativos"):
    print("Uso: python -m scripts.prueba_hu25 crear|verificar|negativos")
    sys.exit(2)
esperar_api()
with SessionLocal() as db:
    direccion = db.scalar(select(Usuario.id).where(Usuario.email == "direccion.demo@ejemplo.cl"))
    educadora = db.scalar(select(Usuario.id).where(Usuario.email == "educadora.demo@ejemplo.cl"))
    if fase == "crear":
        fase_crear(db, direccion)
    elif fase == "verificar":
        fase_verificar(db, direccion)
    else:
        fase_negativos(db, direccion, educadora)
terminar()
