from datetime import date

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.permisos import roles_requeridos
from app.db.postgres import get_db
from app.schemas.auditoria import PaginaAuditoriaOut
from app.services import panel as servicio

# HU-24 (Sprint 3 · Daniel): panel de participación para dirección y personal del jardín.
router = APIRouter(prefix="/panel", tags=["panel"])
puede_ver_panel = roles_requeridos("administrador", "organizador")


class FiltrosOut(BaseModel):
    actividad_id: int | None
    desde: date | None
    hasta: date | None


class TotalesOut(BaseModel):
    actividades: int
    sin_inscritos: int
    completas: int
    cupo_total: int
    inscritos: int
    cancelados: int
    ocupacion_pct: float


class ActividadPanelOut(BaseModel):
    id: int
    codigo: str
    titulo: str
    fecha: date
    cupo_maximo: int
    inscripciones_abiertas: bool
    inscritos: int
    cancelados: int
    cupos_disponibles: int
    ocupacion_pct: float
    estado_participacion: str


class PanelOut(BaseModel):
    filtros: FiltrosOut
    totales: TotalesOut
    actividades: list[ActividadPanelOut]


@router.get("/participacion", response_model=PanelOut, summary="Indicadores de inscritos y ocupación (SQL)")
def participacion(
    actividad_id: int | None = Query(default=None, gt=0),
    desde: date | None = None,
    hasta: date | None = None,
    usuario=Depends(puede_ver_panel),
    db: Session = Depends(get_db),
):
    return servicio.indicadores(db, actividad_id, desde, hasta)


@router.get("/participacion/historial", response_model=PaginaAuditoriaOut, summary="Historial de inscripciones (MongoDB)")
def historial(
    actividad_id: int | None = Query(default=None, gt=0),
    desde: date | None = None,
    hasta: date | None = None,
    pagina: int = Query(default=1, ge=1, le=10_000),
    tamano: int = Query(default=20, ge=1, le=100),
    usuario=Depends(puede_ver_panel),
    db: Session = Depends(get_db),
):
    return servicio.historial(db, actividad_id, desde, hasta, pagina, tamano)
