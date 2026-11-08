from fastapi import APIRouter, Depends, Path
from sqlalchemy.orm import Session

from app.core.permisos import direccion_requerida
from app.db.postgres import get_db
from app.schemas.prematricula import (
    CambioEstadoIn,
    Estado,
    SeguimientoIn,
    SeguimientoOut,
    SolicitudCreadaOut,
    SolicitudIn,
    SolicitudOut,
)
from app.services import prematricula as servicio

# HU-25: solicitudes de pre-matrícula con seguimiento.
router = APIRouter(prefix="/prematriculas", tags=["prematricula"])


@router.post("", response_model=SolicitudCreadaOut, status_code=201, summary="Enviar una pre-matrícula (familia)")
def crear_solicitud(datos: SolicitudIn, db: Session = Depends(get_db)):
    return servicio.crear_solicitud(db, datos)


# POST (y no GET) para que el correo no quede escrito en la URL.
@router.post("/seguimiento", response_model=SeguimientoOut, summary="Consultar el estado con código + correo (familia)")
def consultar_seguimiento(datos: SeguimientoIn, db: Session = Depends(get_db)):
    return servicio.consultar_seguimiento(db, datos)


@router.get("", response_model=list[SolicitudOut], summary="Listar solicitudes (dirección)")
def listar_solicitudes(estado: Estado | None = None, usuario=Depends(direccion_requerida), db: Session = Depends(get_db)):
    return servicio.listar_solicitudes(db, estado)


@router.patch("/{solicitud_id}/estado", response_model=SolicitudOut, summary="Cambiar el estado (dirección)")
def cambiar_estado(
    datos: CambioEstadoIn,
    solicitud_id: int = Path(gt=0),
    usuario=Depends(direccion_requerida),
    db: Session = Depends(get_db),
):
    return servicio.cambiar_estado(db, solicitud_id, datos)
