from typing import Literal

from fastapi import APIRouter, Depends, Path, Query, Response, status
from sqlalchemy.orm import Session

from app.db.postgres import get_db
from app.schemas.inscripciones import (
    ActividadIn,
    ActividadOut,
    ActividadUpdate,
    AsistentesOut,
    CancelacionIn,
    InscripcionIn,
    InscripcionOut,
    PagoIn,
    PagoOut,
)
from app.services import inscripciones as servicio

# HU-19: inscripciones a actividades, cupos, cancelaciones y asistentes.
router = APIRouter(tags=["inscripciones"])


@router.get(
    "/actividades",
    response_model=list[ActividadOut],
    summary="Listar actividades con sus cupos",
)
def listar_actividades(
    proximas: bool = Query(default=True, description="Solo actividades de hoy en adelante (hora de Chile)"),
    db: Session = Depends(get_db),
):
    return servicio.listar_actividades(db, proximas)


@router.get(
    "/actividades/{actividad_id}",
    response_model=ActividadOut,
    summary="Ver una actividad y sus cupos disponibles",
)
def obtener_actividad(
    actividad_id: int = Path(gt=0),
    db: Session = Depends(get_db),
):
    return servicio.obtener_actividad(db, actividad_id)


# ---------- TEC-16: CRUD de actividades (eventos) ----------


@router.post(
    "/actividades",
    response_model=ActividadOut,
    status_code=status.HTTP_201_CREATED,
    summary="Crear una actividad (organizador)",
)
def crear_actividad(payload: ActividadIn, db: Session = Depends(get_db)):
    return servicio.crear_actividad(db, payload)


@router.patch(
    "/actividades/{actividad_id}",
    response_model=ActividadOut,
    summary="Modificar una actividad (organizador)",
)
def actualizar_actividad(
    payload: ActividadUpdate,
    actividad_id: int = Path(gt=0),
    db: Session = Depends(get_db),
):
    return servicio.actualizar_actividad(db, actividad_id, payload)


@router.delete(
    "/actividades/{actividad_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Eliminar una actividad sin inscripciones (organizador)",
)
def eliminar_actividad(actividad_id: int = Path(gt=0), db: Session = Depends(get_db)):
    servicio.eliminar_actividad(db, actividad_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get(
    "/actividades/{actividad_id}/asistentes",
    response_model=AsistentesOut,
    summary="Lista de asistentes y su estado (organizador)",
)
def listar_asistentes(
    actividad_id: int = Path(gt=0),
    estado: Literal["inscrita", "cancelada", "todas"] = Query(default="inscrita"),
    db: Session = Depends(get_db),
):
    return servicio.listar_asistentes(db, actividad_id, estado)


@router.post(
    "/actividades/{actividad_id}/inscripciones",
    response_model=InscripcionOut,
    status_code=status.HTTP_201_CREATED,
    summary="Inscribir a un alumno en una actividad (apoderado)",
)
def crear_inscripcion(
    payload: InscripcionIn,
    actividad_id: int = Path(gt=0),
    db: Session = Depends(get_db),
):
    return servicio.crear_inscripcion(db, actividad_id, payload)


@router.post(
    "/inscripciones/{inscripcion_id}/cancelar",
    response_model=InscripcionOut,
    summary="Cancelar una inscripción (apoderado)",
)
def cancelar_inscripcion(
    payload: CancelacionIn,
    inscripcion_id: int = Path(gt=0),
    db: Session = Depends(get_db),
):
    return servicio.cancelar_inscripcion(db, inscripcion_id, payload)


# ---------- TEC-16: pagos FICTICIOS ----------


@router.post(
    "/inscripciones/{inscripcion_id}/pagos",
    response_model=PagoOut,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar un pago SIMULADO de una inscripción (apoderado)",
)
def crear_pago(
    payload: PagoIn,
    inscripcion_id: int = Path(gt=0),
    db: Session = Depends(get_db),
):
    return servicio.crear_pago(db, inscripcion_id, payload)


@router.get(
    "/inscripciones/{inscripcion_id}/pagos",
    response_model=list[PagoOut],
    summary="Ver los pagos simulados de una inscripción",
)
def listar_pagos(inscripcion_id: int = Path(gt=0), db: Session = Depends(get_db)):
    return servicio.listar_pagos(db, inscripcion_id)
