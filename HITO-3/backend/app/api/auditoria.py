from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends, Query

from app.core.permisos import roles_requeridos
from app.schemas.auditoria import PaginaAuditoriaOut
from app.services import auditoria as servicio

# HU-22 (Sprint 3 · Daniel): consulta de la bitácora de accesos y participación (MongoDB).
router = APIRouter(prefix="/auditoria", tags=["auditoria"])

TipoEvento = Literal[servicio.TIPOS]


@router.get("/eventos", response_model=PaginaAuditoriaOut, summary="Bitácora filtrada y paginada (solo dirección)")
def listar_eventos(
    tipo: list[TipoEvento] | None = Query(default=None, description="Uno o varios tipos de evento"),
    actor_id: int | None = Query(default=None, gt=0),
    recurso_tipo: Literal["alumno", "actividad", "inscripcion", "contacto"] | None = None,
    recurso_id: int | None = Query(default=None, gt=0),
    resultado: Literal["exito", "fallido", "denegado"] | None = None,
    desde: date | None = None,
    hasta: date | None = None,
    pagina: int = Query(default=1, ge=1, le=10_000),
    tamano: int = Query(default=20, ge=1, le=100),
    usuario=Depends(roles_requeridos("administrador")),
):
    return servicio.consultar(tipo, actor_id, recurso_tipo, recurso_id, resultado, desde, hasta, pagina, tamano)
