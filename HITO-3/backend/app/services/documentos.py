from datetime import date
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.models import DocumentoInstitucional
from app.schemas.documento import DocumentoIn, DocumentoUpdate


def verificar_permiso_direccion(rol: str | None):
    if not rol or rol.strip().lower() not in ("direccion", "dirección"):
        raise HTTPException(
            status_code=403,
            detail="Permiso denegado: solo la dirección puede gestionar documentos y protocolos",
        )


def listar_documentos(
    db: Session,
    solo_vigentes: bool = True,
    categoria: str | None = None,
):
    stmt = select(DocumentoInstitucional)
    if solo_vigentes:
        stmt = stmt.where(DocumentoInstitucional.vigente.is_(True))
    if categoria and categoria != "Todos":
        stmt = stmt.where(DocumentoInstitucional.categoria == categoria)
    return db.scalars(
        stmt.order_by(DocumentoInstitucional.categoria.asc(), DocumentoInstitucional.titulo.asc())
    ).all()


def crear_documento(db: Session, payload: DocumentoIn, rol: str | None):
    verificar_permiso_direccion(rol)
    nuevo = DocumentoInstitucional(
        titulo=payload.titulo.strip(),
        categoria=payload.categoria,
        descripcion=payload.descripcion.strip(),
        url_archivo=payload.url_archivo.strip() if payload.url_archivo else None,
        vigente=payload.vigente,
        fecha_actualizacion=date.today(),
    )
    db.add(nuevo)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Ya existe un documento o protocolo registrado con ese título",
        )
    db.refresh(nuevo)
    return nuevo


def actualizar_documento(
    db: Session, documento_id: int, payload: DocumentoUpdate, rol: str | None
):
    verificar_permiso_direccion(rol)
    doc = db.get(DocumentoInstitucional, documento_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Documento institucional no encontrado")

    datos = payload.model_dump(exclude_unset=True)
    if "titulo" in datos and datos["titulo"]:
        datos["titulo"] = datos["titulo"].strip()
    if "descripcion" in datos and datos["descripcion"]:
        datos["descripcion"] = datos["descripcion"].strip()

    for campo, valor in datos.items():
        setattr(doc, campo, valor)
    doc.fecha_actualizacion = date.today()

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Conflicto: ya existe otro documento con ese título",
        )
    db.refresh(doc)
    return doc
