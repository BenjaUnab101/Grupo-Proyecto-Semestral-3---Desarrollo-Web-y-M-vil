from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.permisos import rol_heredado
from app.db.postgres import get_db
from app.schemas.documento import DocumentoIn, DocumentoOut, DocumentoUpdate
from app.services import documentos as servicio

router = APIRouter(tags=["documentos"])


@router.get("/documentos", response_model=list[DocumentoOut])
def listar_documentos(
    solo_vigentes: bool = True,
    categoria: str | None = Query(default=None, max_length=40),
    db: Session = Depends(get_db),
):
    return servicio.listar_documentos(db, solo_vigentes, categoria)


@router.post(
    "/documentos",
    response_model=DocumentoOut,
    status_code=status.HTTP_201_CREATED,
)
def crear_documento(
    payload: DocumentoIn,
    x_rol: str = Depends(rol_heredado),  # H-01/H-03: rol desde la sesión, no del navegador
    db: Session = Depends(get_db),
):
    return servicio.crear_documento(db, payload, x_rol)


@router.patch(
    "/documentos/{documento_id}",
    response_model=DocumentoOut,
)
def actualizar_documento(
    documento_id: int,
    payload: DocumentoUpdate,
    x_rol: str = Depends(rol_heredado),  # H-01/H-03: rol desde la sesión, no del navegador
    db: Session = Depends(get_db),
):
    return servicio.actualizar_documento(db, documento_id, payload, x_rol)
