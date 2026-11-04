from datetime import datetime, timezone
from fastapi import HTTPException
from pymongo.errors import PyMongoError
from app.db.mongo import get_comunicados_collection
from app.schemas.comunicado import ComunicadoIn, ComunicadoOut

def serializar(documento: dict) -> dict:
    return {
        "id": str(documento["_id"]),
        "titulo": documento["titulo"],
        "cuerpo": documento["cuerpo"],
        "emisor_id": documento["emisor_id"],
        "alcance": documento.get("alcance", "General"),
        "nivel": documento.get("nivel", "General"),
        "categoria": documento.get("categoria", "Aviso"),
        "es_urgente": documento.get("es_urgente", False),
        "publicado": documento.get("publicado", True),
        "fecha_publicacion": documento.get("fecha_publicacion", datetime.now(timezone.utc)),
    }

def listar_comunicados(nivel: str | None, solo_publicados: bool):
    filtros = {"publicado": True} if solo_publicados else {}
    if nivel and nivel != "Todos":
        filtros["nivel"] = nivel
    try:
        documentos = get_comunicados_collection().find(filtros).sort("fecha_publicacion", -1).limit(100)
        return [serializar(doc) for doc in documentos]
    except PyMongoError:
        raise HTTPException(status_code=503, detail="Servicio de comunicados temporalmente no disponible")

def crear_comunicado(payload: ComunicadoIn):
    documento = payload.model_dump()
    documento["fecha_publicacion"] = documento["fecha_publicacion"] or datetime.now(timezone.utc)
    try:
        resultado = get_comunicados_collection().insert_one(documento)
        documento["_id"] = resultado.inserted_id
        return serializar(documento)
    except PyMongoError:
        raise HTTPException(status_code=503, detail="Servicio de comunicados temporalmente no disponible")
