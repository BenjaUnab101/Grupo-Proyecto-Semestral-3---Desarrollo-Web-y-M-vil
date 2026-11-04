from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.models import Alumno, Matricula, Sala
from app.schemas.academico import MatriculaIn


def listar_alumnos(db: Session, activos: bool):
    consulta = select(Alumno)

    if activos:
        consulta = consulta.where(Alumno.activo.is_(True))

    return db.scalars(consulta.order_by(Alumno.nombre)).all()


def listar_salas(db: Session, activa: bool):
    consulta = select(Sala)

    if activa:
        consulta = consulta.where(Sala.activa.is_(True))

    return db.scalars(consulta.order_by(Sala.nombre)).all()


def listar_matriculas(db: Session, anio_escolar: int | None):
    consulta = select(Matricula)

    if anio_escolar is not None:
        consulta = consulta.where(Matricula.anio_escolar == anio_escolar)

    return db.scalars(
        consulta.order_by(Matricula.anio_escolar.desc(), Matricula.id)
    ).all()


def crear_matricula(db: Session, payload: MatriculaIn):
    alumno = db.get(Alumno, payload.alumno_id)
    sala = db.get(Sala, payload.sala_id)

    if not alumno or not alumno.activo:
        raise HTTPException(
            status_code=404,
            detail="Alumno no encontrado o inactivo",
        )

    if not sala or not sala.activa:
        raise HTTPException(
            status_code=404,
            detail="Sala no encontrada o inactiva",
        )

    matricula = Matricula(**payload.model_dump())
    db.add(matricula)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="La matrícula entra en conflicto con los datos existentes",
        )

    db.refresh(matricula)
    return matricula