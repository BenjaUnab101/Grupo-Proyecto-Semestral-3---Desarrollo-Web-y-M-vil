from datetime import datetime, timezone
from bson import ObjectId
from fastapi import APIRouter, HTTPException, Query, status
from pymongo.errors import PyMongoError
from app.db.mongo import get_comunicados_collection
from app.schemas.comunicado import ComunicadoIn, ComunicadoOut

router = APIRouter(tags=["comunicados"])


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


@router.get("/comunicados", response_model=list[ComunicadoOut])
def listar_comunicados(nivel: str | None = Query(default=None, max_length=50), solo_publicados: bool = True):
    filtros = {"publicado": True} if solo_publicados else {}
    if nivel and nivel != "Todos":
        filtros["nivel"] = nivel
    try:
        documentos = get_comunicados_collection().find(filtros).sort("fecha_publicacion", -1).limit(100)
        return [serializar(doc) for doc in documentos]
    except PyMongoError:
        raise HTTPException(status_code=503, detail="Servicio de comunicados temporalmente no disponible")


@router.post("/comunicados", response_model=ComunicadoOut, status_code=status.HTTP_201_CREATED)
def crear_comunicado(payload: ComunicadoIn):
    documento = payload.model_dump()
    documento["fecha_publicacion"] = documento["fecha_publicacion"] or datetime.now(timezone.utc)
    try:
        resultado = get_comunicados_collection().insert_one(documento)
        documento["_id"] = resultado.inserted_id
        return serializar(documento)
    except PyMongoError:
        raise HTTPException(status_code=503, detail="Servicio de comunicados temporalmente no disponible")
