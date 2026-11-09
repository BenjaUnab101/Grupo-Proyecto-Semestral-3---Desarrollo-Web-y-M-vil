"""HU-22 (Sprint 3 · Daniel) · Bitácora de auditoría en MongoDB.

Por qué MongoDB: cada evento es un documento de solo-agregar, con campos que varían según
el tipo (login, inscripción, cambio de estado…). No es una transacción de negocio: la verdad
de inscripciones, consultas y usuarios sigue en PostgreSQL. Aquí solo queda el rastro de
QUIÉN hizo QUÉ y CUÁNDO, para que dirección pueda auditar.

Minimización de datos (CA4):
  - Nunca se guardan contraseñas, tokens, RUT, correos, teléfonos ni nombres de niños.
  - actor_id es el id interno de la cuenta (o null si es un visitante / login fallido).
  - recurso = {tipo, id} interno; `datos` solo lleva ids y estados.
  - Retención: índice TTL de AUDITORIA_RETENCION_DIAS días (365 por defecto).

Consistencia: el evento se escribe DESPUÉS del commit en PostgreSQL. Si MongoDB no responde,
la operación de negocio igual queda guardada y el evento se pierde (se registra un aviso en el
log). No hay transacción distribuida ni entrega garantizada.
"""

import logging
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from pymongo import DESCENDING
from pymongo.errors import PyMongoError

from app.core.config import settings
from app.db.mongo import get_mongo_client

log = logging.getLogger("pequenos_reyes.auditoria")

COLECCION = "auditoria_eventos"

TIPOS = (
    "acceso_login",          # resultado: exito | fallido
    "acceso_logout",
    "acceso_denegado",       # intento de ver un recurso ajeno (403)
    "inscripcion_creada",
    "inscripcion_cancelada",
    "contacto_creado",
    "contacto_estado_cambiado",
)
RESULTADOS = ("exito", "fallido", "denegado")
# Claves permitidas en `datos`: cualquier otra se descarta antes de guardar.
CLAVES_DATOS = {"apoderado_id", "alumno_id", "actividad_id", "estado_anterior", "estado_nuevo", "motivo", "cupos_disponibles"}


def coleccion():
    """Se puede reemplazar en las pruebas (ver tests_s3_daniel.py)."""
    return get_mongo_client()[settings.mongodb_database][COLECCION]


def asegurar_indices():
    """Índices de la bitácora. Provisionales hasta el diseño de SCRUM-116/118 (Benjamín)."""
    try:
        col = coleccion()
        col.create_index([("fecha", DESCENDING)], name="ttl_fecha", expireAfterSeconds=settings.auditoria_retencion_dias * 86400)
        col.create_index([("tipo", 1), ("fecha", DESCENDING)], name="tipo_fecha")
        col.create_index([("recurso.tipo", 1), ("recurso.id", 1), ("fecha", DESCENDING)], name="recurso_fecha")
        col.create_index([("actor_id", 1), ("fecha", DESCENDING)], name="actor_fecha")
    except PyMongoError as error:
        log.warning("No se pudieron crear los índices de auditoría: %s", type(error).__name__)


def registrar(tipo: str, resultado: str = "exito", actor=None, recurso_tipo: str | None = None,
              recurso_id: int | None = None, datos: dict | None = None) -> bool:
    """Guarda un evento. Devuelve False si MongoDB no respondió (nunca lanza error)."""
    if tipo not in TIPOS or resultado not in RESULTADOS:
        raise ValueError(f"Evento de auditoría no válido: {tipo}/{resultado}")
    documento = {
        "tipo": tipo,
        "resultado": resultado,
        "actor_id": getattr(actor, "id", None),
        "rol": getattr(actor, "rol", None),
        "recurso": {"tipo": recurso_tipo, "id": recurso_id} if recurso_tipo else None,
        "datos": {k: v for k, v in (datos or {}).items() if k in CLAVES_DATOS},
        "fecha": datetime.now(timezone.utc),
    }
    try:
        coleccion().insert_one(documento)
        return True
    except PyMongoError as error:
        log.warning("Evento de auditoría %s no guardado (MongoDB no disponible: %s)", tipo, type(error).__name__)
        return False


def _a_salida(doc: dict) -> dict:
    fecha = doc["fecha"]
    if fecha.tzinfo is None:  # pymongo devuelve UTC sin zona: se marca para que React la convierta bien
        fecha = fecha.replace(tzinfo=timezone.utc)
    return {
        "id": str(doc["_id"]),
        "tipo": doc["tipo"],
        "resultado": doc["resultado"],
        "actor_id": doc.get("actor_id"),
        "rol": doc.get("rol"),
        "recurso": doc.get("recurso"),
        "datos": doc.get("datos") or {},
        "fecha": fecha,
    }


def consultar(tipos=None, actor_id=None, recurso_tipo=None, recurso_id=None, resultado=None,
              desde=None, hasta=None, pagina: int = 1, tamano: int = 20) -> dict:
    """Bitácora filtrada, de la más nueva a la más antigua, paginada."""
    if desde and hasta and desde > hasta:
        raise HTTPException(400, "La fecha 'desde' no puede ser posterior a 'hasta'")
    filtro = {}
    if tipos:
        filtro["tipo"] = {"$in": list(tipos)}
    if actor_id is not None:
        filtro["actor_id"] = actor_id
    if resultado:
        filtro["resultado"] = resultado
    if recurso_tipo:
        filtro["recurso.tipo"] = recurso_tipo
    if recurso_id is not None:
        filtro["recurso.id"] = recurso_id
    if desde or hasta:
        filtro["fecha"] = {}
        if desde:
            filtro["fecha"]["$gte"] = datetime.combine(desde, datetime.min.time(), timezone.utc)
        if hasta:  # hasta es inclusivo: todo el día
            filtro["fecha"]["$lt"] = datetime.combine(hasta + timedelta(days=1), datetime.min.time(), timezone.utc)
    try:
        col = coleccion()
        total = col.count_documents(filtro)
        cursor = col.find(filtro).sort([("fecha", DESCENDING), ("_id", DESCENDING)]).skip((pagina - 1) * tamano).limit(tamano)
        items = [_a_salida(d) for d in cursor]
    except PyMongoError:
        raise HTTPException(503, "La bitácora de auditoría (MongoDB) no está disponible en este momento")
    return {"total": total, "pagina": pagina, "tamano": tamano, "items": items}
