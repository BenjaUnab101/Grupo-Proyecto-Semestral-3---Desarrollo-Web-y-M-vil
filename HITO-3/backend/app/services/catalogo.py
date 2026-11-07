from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.models import Categoria, Institucion, Organizador
from app.schemas.catalogo import CategoriaIn, OrganizadorIn


# TEC-16: categorías, organizadores y datos institucionales del jardín.


def listar_categorias(db: Session):
    return db.scalars(select(Categoria).order_by(Categoria.nombre)).all()


def crear_categoria(db: Session, payload: CategoriaIn):
    categoria = Categoria(**payload.model_dump())
    db.add(categoria)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Ya existe una categoría con ese nombre")
    db.refresh(categoria)
    return categoria


def listar_organizadores(db: Session, activos: bool):
    consulta = select(Organizador)
    if activos:
        consulta = consulta.where(Organizador.activo.is_(True))
    return db.scalars(consulta.order_by(Organizador.nombre)).all()


def crear_organizador(db: Session, payload: OrganizadorIn):
    organizador = Organizador(**payload.model_dump())
    db.add(organizador)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Ya existe un organizador con ese correo")
    db.refresh(organizador)
    return organizador


def obtener_institucion(db: Session):
    institucion = db.get(Institucion, 1)
    if not institucion:
        raise HTTPException(
            status_code=404,
            detail="Los datos institucionales no están cargados (ejecuta sql/migrar.sh)",
        )
    return institucion
