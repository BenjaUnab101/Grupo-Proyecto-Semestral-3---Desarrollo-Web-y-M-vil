from fastapi import APIRouter, Depends, Path
from sqlalchemy.orm import Session

from app.core.permisos import roles_requeridos, usuario_autenticado, usuario_autenticado_opcional
from app.db.postgres import get_db
from app.schemas.contacto import (
    CambioEstadoContactoIn,
    ConsultaCreadaOut,
    ConsultaIn,
    ConsultaOut,
    EstadoContacto,
    SeguimientoContactoIn,
    SeguimientoContactoOut,
)
from app.services import contacto as servicio

# HU-26 (Sprint 3 · Daniel): contacto con dirección persistido en PostgreSQL.
router = APIRouter(prefix="/contacto", tags=["contacto"])


@router.post("", response_model=ConsultaCreadaOut, status_code=201, summary="Enviar una consulta a dirección")
def crear_consulta(datos: ConsultaIn, usuario=Depends(usuario_autenticado_opcional), db: Session = Depends(get_db)):
    return servicio.crear_consulta(db, datos, usuario)


# POST (y no GET) para que el correo no quede escrito en la URL.
@router.post("/seguimiento", response_model=SeguimientoContactoOut, summary="Estado de una consulta con código + correo")
def seguimiento(datos: SeguimientoContactoIn, db: Session = Depends(get_db)):
    return servicio.consultar_seguimiento(db, datos)


@router.get("/mias", response_model=list[SeguimientoContactoOut], summary="Mis consultas (sesión iniciada)")
def mis_consultas(usuario=Depends(usuario_autenticado), db: Session = Depends(get_db)):
    return servicio.mis_consultas(db, usuario)


@router.get("", response_model=list[ConsultaOut], summary="Listar consultas (solo dirección)")
def listar(estado: EstadoContacto | None = None, usuario=Depends(roles_requeridos("administrador")), db: Session = Depends(get_db)):
    return servicio.listar_consultas(db, estado)


@router.patch("/{consulta_id}/estado", response_model=ConsultaOut, summary="Cambiar el estado de atención (solo dirección)")
def cambiar_estado(
    datos: CambioEstadoContactoIn,
    consulta_id: int = Path(gt=0),
    usuario=Depends(roles_requeridos("administrador")),
    db: Session = Depends(get_db),
):
    return servicio.cambiar_estado(db, consulta_id, datos, usuario)
