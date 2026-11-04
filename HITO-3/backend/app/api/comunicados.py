from fastapi import APIRouter, Query, status

from app.schemas.comunicado import ComunicadoIn, ComunicadoOut
from app.services import comunicados as servicio

router = APIRouter(tags=["comunicados"])

@router.get("/comunicados", response_model=list[ComunicadoOut])
def listar_comunicados(
    nivel: str | None = Query(default=None, max_length=50),
    solo_publicados: bool = True,
):
    return servicio.listar_comunicados(nivel, solo_publicados)

@router.post(
    "/comunicados",
    response_model=ComunicadoOut,
    status_code=status.HTTP_201_CREATED,
)
def crear_comunicado(payload: ComunicadoIn):
    return servicio.crear_comunicado(payload)
