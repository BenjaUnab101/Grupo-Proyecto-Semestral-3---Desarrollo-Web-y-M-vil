from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Path, Response
from sqlalchemy.orm import Session

from app.core.permisos import (
    PERSONAL,
    apoderado_de_la_peticion,
    exigir_propietario_o_personal,
    requiere_roles,
    usuario_requerido,
)
from app.db.models import ApoderadoAlumno, Inscripcion
from app.db.postgres import get_db
from app.schemas.inscripciones import (
    ActividadIn,
    ActividadOut,
    ActividadUpdate,
    AsistentesOut,
    CancelacionIn,
    InscripcionApoderadoOut,
    InscripcionIn,
    InscripcionOut,
    PagoIn,
    PagoOut,
)
from app.services import inscripciones as servicio

# HU-19: eventos (actividades con inscripción), inscripciones, cupos y asistentes.
# TEC-16: CRUD de eventos y pagos ficticios.
# TEC-17: inscripciones de los hijos de un apoderado.
# Las rutas usan /eventos porque /actividades es de las actividades escolares (HU-18).
#
# Cierre H-02 (Sprint 3): toda escritura y toda lectura con datos de alumnos exige sesión.
# El apoderado de una inscripción, cancelación o pago sale del token (no del cuerpo).
router = APIRouter(tags=["inscripciones"])
solo_personal = requiere_roles(*PERSONAL)


# ---------- Eventos ----------


@router.get("/eventos", response_model=list[ActividadOut], summary="Listar eventos con sus cupos (público)")
def listar_actividades(proximas: bool = True, db: Session = Depends(get_db)):
    return servicio.listar_actividades(db, proximas)


@router.get("/eventos/{actividad_id}", response_model=ActividadOut, summary="Ver un evento (público)")
def obtener_actividad(actividad_id: int = Path(gt=0), db: Session = Depends(get_db)):
    return servicio.obtener_actividad(db, actividad_id)


@router.post("/eventos", response_model=ActividadOut, status_code=201, summary="Crear un evento (personal)")
def crear_actividad(datos: ActividadIn, usuario=Depends(solo_personal), db: Session = Depends(get_db)):
    return servicio.crear_actividad(db, datos)


@router.patch("/eventos/{actividad_id}", response_model=ActividadOut, summary="Modificar un evento (personal)")
def actualizar_actividad(
    datos: ActividadUpdate, actividad_id: int = Path(gt=0), usuario=Depends(solo_personal), db: Session = Depends(get_db)
):
    return servicio.actualizar_actividad(db, actividad_id, datos)


@router.delete("/eventos/{actividad_id}", status_code=204, summary="Eliminar un evento sin inscripciones (personal)")
def eliminar_actividad(actividad_id: int = Path(gt=0), usuario=Depends(solo_personal), db: Session = Depends(get_db)):
    servicio.eliminar_actividad(db, actividad_id)
    return Response(status_code=204)


@router.get("/eventos/{actividad_id}/asistentes", response_model=AsistentesOut, summary="Asistentes y su estado (personal)")
def listar_asistentes(
    actividad_id: int = Path(gt=0),
    estado: Literal["inscrita", "cancelada", "todas"] = "inscrita",
    usuario=Depends(solo_personal),
    db: Session = Depends(get_db),
):
    return servicio.listar_asistentes(db, actividad_id, estado)


# ---------- Inscripciones ----------


@router.post(
    "/eventos/{actividad_id}/inscripciones",
    response_model=InscripcionOut,
    status_code=201,
    summary="Inscribir a un hijo (apoderado de la sesión) o en su nombre (personal)",
)
def crear_inscripcion(
    datos: InscripcionIn, actividad_id: int = Path(gt=0), usuario=Depends(usuario_requerido), db: Session = Depends(get_db)
):
    datos = InscripcionIn(alumno_id=datos.alumno_id, apoderado_id=apoderado_de_la_peticion(usuario, datos.apoderado_id))
    return servicio.crear_inscripcion(db, actividad_id, datos)


@router.post("/inscripciones/{inscripcion_id}/cancelar", response_model=InscripcionOut, summary="Cancelar una inscripción")
def cancelar_inscripcion(
    datos: CancelacionIn, inscripcion_id: int = Path(gt=0), usuario=Depends(usuario_requerido), db: Session = Depends(get_db)
):
    datos = CancelacionIn(apoderado_id=apoderado_de_la_peticion(usuario, datos.apoderado_id))
    return servicio.cancelar_inscripcion(db, inscripcion_id, datos)


@router.get(
    "/apoderados/{apoderado_id}/inscripciones",
    response_model=list[InscripcionApoderadoOut],
    summary="Inscripciones de los hijos de un apoderado (el propio apoderado o el personal)",
)
def inscripciones_de_apoderado(apoderado_id: int = Path(gt=0), usuario=Depends(usuario_requerido), db: Session = Depends(get_db)):
    exigir_propietario_o_personal(usuario, apoderado_id)
    return servicio.inscripciones_de_apoderado(db, apoderado_id)


# ---------- Pagos ficticios ----------


@router.post("/inscripciones/{inscripcion_id}/pagos", response_model=PagoOut, status_code=201, summary="Pago SIMULADO")
def crear_pago(datos: PagoIn, inscripcion_id: int = Path(gt=0), usuario=Depends(usuario_requerido), db: Session = Depends(get_db)):
    datos = PagoIn(apoderado_id=apoderado_de_la_peticion(usuario, datos.apoderado_id))
    return servicio.crear_pago(db, inscripcion_id, datos)


@router.get("/inscripciones/{inscripcion_id}/pagos", response_model=list[PagoOut], summary="Pagos de una inscripción")
def listar_pagos(inscripcion_id: int = Path(gt=0), usuario=Depends(usuario_requerido), db: Session = Depends(get_db)):
    inscripcion = db.get(Inscripcion, inscripcion_id)
    if inscripcion is None:
        raise HTTPException(404, "Inscripción no encontrada")
    es_suyo = bool(usuario.apoderado_id) and db.get(ApoderadoAlumno, (usuario.apoderado_id, inscripcion.alumno_id)) is not None
    if usuario.rol not in PERSONAL and not es_suyo:
        raise HTTPException(403, "No tienes acceso a los pagos de esta inscripción")
    return servicio.listar_pagos(db, inscripcion_id)
