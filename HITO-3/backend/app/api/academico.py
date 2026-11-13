from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.permisos import PERSONAL, requiere_roles
from app.db.postgres import get_db
from app.schemas.academico import (
    AlumnoOut,
    MatriculaIn,
    MatriculaOut,
    SalaOut,
)
from app.services import academico as servicio

router = APIRouter(tags=["academico"])


@router.get("/alumnos", response_model=list[AlumnoOut])
def listar_alumnos(
    activos: bool = True,
    usuario=Depends(requiere_roles(*PERSONAL)),  # H-02: datos de alumnos solo para el personal
    db: Session = Depends(get_db),
):
    return servicio.listar_alumnos(db, activos)


@router.get("/salas", response_model=list[SalaOut])
def listar_salas(
    activa: bool = True,
    db: Session = Depends(get_db),
):
    return servicio.listar_salas(db, activa)


@router.get("/matriculas", response_model=list[MatriculaOut])
def listar_matriculas(
    anio_escolar: int | None = Query(default=None, ge=2020, le=2100),
    usuario=Depends(requiere_roles(*PERSONAL)),  # H-02
    db: Session = Depends(get_db),
):
    return servicio.listar_matriculas(db, anio_escolar)


@router.post(
    "/matriculas",
    response_model=MatriculaOut,
    status_code=status.HTTP_201_CREATED,
)
def crear_matricula(
    payload: MatriculaIn,
    usuario=Depends(requiere_roles("administrador")),  # H-02: solo dirección matricula
    db: Session = Depends(get_db),
):
    return servicio.crear_matricula(db, payload)