from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from app.db.postgres import get_db
from app.db.models import Alumno, Matricula, Sala
from app.schemas.academico import AlumnoOut, MatriculaIn, MatriculaOut, SalaOut

router = APIRouter(tags=["academico"])


@router.get("/alumnos", response_model=list[AlumnoOut])
def listar_alumnos(activos: bool = True, db: Session = Depends(get_db)):
    stmt = select(Alumno)
    if activos:
        stmt = stmt.where(Alumno.activo.is_(True))
    return db.scalars(stmt.order_by(Alumno.nombre)).all()


@router.get("/salas", response_model=list[SalaOut])
def listar_salas(activa: bool = True, db: Session = Depends(get_db)):
    stmt = select(Sala)
    if activa:
        stmt = stmt.where(Sala.activa.is_(True))
    return db.scalars(stmt.order_by(Sala.nombre)).all()


@router.get("/matriculas", response_model=list[MatriculaOut])
def listar_matriculas(anio_escolar: int | None = Query(default=None, ge=2020, le=2100), db: Session = Depends(get_db)):
    stmt = select(Matricula)
    if anio_escolar is not None:
        stmt = stmt.where(Matricula.anio_escolar == anio_escolar)
    return db.scalars(stmt.order_by(Matricula.anio_escolar.desc(), Matricula.id)).all()


@router.post("/matriculas", response_model=MatriculaOut, status_code=status.HTTP_201_CREATED)
def crear_matricula(payload: MatriculaIn, db: Session = Depends(get_db)):
    if payload.estado not in {"pendiente", "vigente", "anulada"}:
        raise HTTPException(status_code=422, detail="Estado de matrícula no válido")
    alumno = db.get(Alumno, payload.alumno_id)
    sala = db.get(Sala, payload.sala_id)
    if not alumno or not alumno.activo:
        raise HTTPException(status_code=404, detail="Alumno no encontrado o inactivo")
    if not sala or not sala.activa:
        raise HTTPException(status_code=404, detail="Sala no encontrada o inactiva")
    matricula = Matricula(**payload.model_dump())
    db.add(matricula)
    try:
        db.commit()
        db.refresh(matricula)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="El alumno ya tiene matrícula para ese año escolar")
    return matricula
