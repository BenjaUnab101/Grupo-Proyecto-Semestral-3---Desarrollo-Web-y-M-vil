from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.models import Categoria, Institucion
from app.schemas.catalogo import CategoriaIn


# TEC-16: categorías de eventos y datos institucionales del jardín.


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


def obtener_institucion(db: Session):
    institucion = db.get(Institucion, 1)
    if not institucion:
        raise HTTPException(
            status_code=404,
            detail="Los datos institucionales no están cargados (ejecuta sql/migrar.sh)",
        )
    return institucion
