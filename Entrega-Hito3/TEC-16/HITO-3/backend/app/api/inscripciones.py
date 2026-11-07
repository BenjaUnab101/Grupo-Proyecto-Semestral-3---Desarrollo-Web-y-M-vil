from typing import Literal

from fastapi import APIRouter, Depends, Path, Response
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

# HU-19: eventos (actividades con inscripción), inscripciones, cupos y asistentes.
# TEC-16: CRUD de eventos y pagos ficticios.
# Las rutas usan /eventos porque /actividades es de las actividades escolares (HU-18).
router = APIRouter(tags=["inscripciones"])


# ---------- Eventos ----------


@router.get("/eventos", response_model=list[ActividadOut], summary="Listar eventos con sus cupos")
def listar_actividades(proximas: bool = True, db: Session = Depends(get_db)):
    return servicio.listar_actividades(db, proximas)


@router.get("/eventos/{actividad_id}", response_model=ActividadOut, summary="Ver un evento")
def obtener_actividad(actividad_id: int = Path(gt=0), db: Session = Depends(get_db)):
    return servicio.obtener_actividad(db, actividad_id)


@router.post("/eventos", response_model=ActividadOut, status_code=201, summary="Crear un evento")
def crear_actividad(datos: ActividadIn, db: Session = Depends(get_db)):
    return servicio.crear_actividad(db, datos)


@router.patch("/eventos/{actividad_id}", response_model=ActividadOut, summary="Modificar un evento")
def actualizar_actividad(datos: ActividadUpdate, actividad_id: int = Path(gt=0), db: Session = Depends(get_db)):
    return servicio.actualizar_actividad(db, actividad_id, datos)


@router.delete("/eventos/{actividad_id}", status_code=204, summary="Eliminar un evento sin inscripciones")
def eliminar_actividad(actividad_id: int = Path(gt=0), db: Session = Depends(get_db)):
    servicio.eliminar_actividad(db, actividad_id)
    return Response(status_code=204)


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


# ---------- Pagos ficticios ----------


@router.post("/inscripciones/{inscripcion_id}/pagos", response_model=PagoOut, status_code=201, summary="Pago SIMULADO")
def crear_pago(datos: PagoIn, inscripcion_id: int = Path(gt=0), db: Session = Depends(get_db)):
    return servicio.crear_pago(db, inscripcion_id, datos)


@router.get("/inscripciones/{inscripcion_id}/pagos", response_model=list[PagoOut], summary="Pagos de una inscripción")
def listar_pagos(inscripcion_id: int = Path(gt=0), db: Session = Depends(get_db)):
    return servicio.listar_pagos(db, inscripcion_id)
