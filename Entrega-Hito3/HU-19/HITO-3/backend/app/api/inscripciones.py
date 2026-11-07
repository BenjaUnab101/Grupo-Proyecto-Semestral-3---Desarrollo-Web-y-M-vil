from typing import Literal

from fastapi import APIRouter, Depends, Path
from sqlalchemy.orm import Session

from app.db.postgres import get_db
from app.schemas.inscripciones import (
    ActividadOut,
    AsistentesOut,
    CancelacionIn,
    InscripcionIn,
    InscripcionOut,
)
from app.services import inscripciones as servicio

# HU-19: eventos (actividades con inscripción), inscripciones, cupos y asistentes.
# Las rutas usan /eventos porque /actividades es de las actividades escolares (HU-18).
router = APIRouter(tags=["inscripciones"])


# ---------- Eventos ----------


@router.get("/eventos", response_model=list[ActividadOut], summary="Listar eventos con sus cupos")
def listar_actividades(proximas: bool = True, db: Session = Depends(get_db)):
    return servicio.listar_actividades(db, proximas)


@router.get("/eventos/{actividad_id}", response_model=ActividadOut, summary="Ver un evento")
def obtener_actividad(actividad_id: int = Path(gt=0), db: Session = Depends(get_db)):
    return servicio.obtener_actividad(db, actividad_id)


@router.get("/eventos/{actividad_id}/asistentes", response_model=AsistentesOut, summary="Asistentes y su estado")
def listar_asistentes(
    actividad_id: int = Path(gt=0),
    estado: Literal["inscrita", "cancelada", "todas"] = "inscrita",
    db: Session = Depends(get_db),
):
    return servicio.listar_asistentes(db, actividad_id, estado)


# ---------- Inscripciones ----------


@router.post(
    "/eventos/{actividad_id}/inscripciones",
    response_model=InscripcionOut,
    status_code=201,
    summary="Inscribir a un alumno (apoderado)",
)
def crear_inscripcion(datos: InscripcionIn, actividad_id: int = Path(gt=0), db: Session = Depends(get_db)):
    return servicio.crear_inscripcion(db, actividad_id, datos)


@router.post("/inscripciones/{inscripcion_id}/cancelar", response_model=InscripcionOut, summary="Cancelar una inscripción")
def cancelar_inscripcion(datos: CancelacionIn, inscripcion_id: int = Path(gt=0), db: Session = Depends(get_db)):
    return servicio.cancelar_inscripcion(db, inscripcion_id, datos)
