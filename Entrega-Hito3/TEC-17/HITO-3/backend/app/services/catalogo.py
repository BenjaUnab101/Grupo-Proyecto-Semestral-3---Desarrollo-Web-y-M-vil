from fastapi import HTTPException
from sqlalchemy import extract, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.models import Categoria, Institucion, Matricula, Sala
from app.schemas.catalogo import CategoriaIn


# TEC-16: categorías de eventos y datos institucionales del jardín. TEC-17: cupos por sala.


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


# ---------- TEC-17: cupos por sala (HU-09) ----------


def cupos_por_sala(db: Session, anio: int | None):
    # Matriculados = matrículas no anuladas del año escolar (por defecto, el año actual en Chile).
    if anio is None:
        anio = db.scalar(select(extract("year", func.timezone("America/Santiago", func.now()))))
    resultado = []
    for sala in db.scalars(select(Sala).where(Sala.activa.is_(True)).order_by(Sala.nombre)):
        matriculados = db.scalar(
            select(func.count()).where(
                Matricula.sala_id == sala.id, Matricula.anio_escolar == anio, Matricula.estado != "anulada"
            )
        )
        resultado.append({
            "id": sala.id,
            "nombre": sala.nombre,
            "nivel": sala.nivel,
            "grupo_comunicados": sala.grupo_comunicados,
            "capacidad": sala.capacidad,
            "matriculados": matriculados,
            "cupos_disponibles": max(sala.capacidad - matriculados, 0),
        })
    return resultado
