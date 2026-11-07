from fastapi import HTTPException
from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from app.db.models import Actividad, Alumno, Apoderado, ApoderadoAlumno, Inscripcion

# HU-19: inscripciones a eventos (salidas, talleres), cupos y asistentes.
#
# Cupos sin sobreventa: antes de contar los inscritos se bloquea la actividad con
# SELECT ... FOR UPDATE. Si dos apoderados inscriben al mismo tiempo, PostgreSQL hace
# esperar al segundo hasta que el primero termine, y el segundo ya ve el cupo ocupado.


# ---------- Ayudantes ----------


def hoy_chile(db: Session):
    return db.scalar(text("SELECT (now() AT TIME ZONE 'America/Santiago')::date"))


def buscar(db: Session, modelo, id: int, mensaje: str, bloquear: bool = False):
    """Devuelve la fila o responde 404. Con bloquear=True la deja bloqueada hasta el commit."""
    consulta = select(modelo).where(modelo.id == id)
    if bloquear:
        consulta = consulta.with_for_update()
    fila = db.scalar(consulta)
    if fila is None:
        raise HTTPException(404, mensaje)
    return fila


def contar_inscritos(db: Session, actividad_id: int) -> int:
    return db.scalar(
        select(func.count()).where(Inscripcion.actividad_id == actividad_id, Inscripcion.estado == "inscrita")
    )


def revisar_apoderado(db: Session, apoderado_id: int, alumno_id: int):
    apoderado = db.get(Apoderado, apoderado_id)
    if not apoderado or not apoderado.activo:
        raise HTTPException(404, "Apoderado no encontrado o inactivo")
    if not db.get(ApoderadoAlumno, (apoderado_id, alumno_id)):
        raise HTTPException(403, "El alumno no está asociado a este apoderado")


def actividad_a_dict(actividad: Actividad, inscritos: int) -> dict:
    return {
        "id": actividad.id,
        "codigo": actividad.codigo,
        "titulo": actividad.titulo,
        "descripcion": actividad.descripcion,
        "fecha": actividad.fecha,
        "hora": actividad.hora,
        "lugar": actividad.lugar,
        "cupo_maximo": actividad.cupo_maximo,
        "inscripciones_abiertas": actividad.inscripciones_abiertas,
        "inscritos": inscritos,
        "cupos_disponibles": max(actividad.cupo_maximo - inscritos, 0),
    }


def inscripcion_a_dict(inscripcion: Inscripcion, cupos_disponibles: int) -> dict:
    return {
        "id": inscripcion.id,
        "actividad_id": inscripcion.actividad_id,
        "alumno_id": inscripcion.alumno_id,
        "apoderado_id": inscripcion.apoderado_id,
        "estado": inscripcion.estado,
        "creada_en": inscripcion.creada_en,
        "actualizada_en": inscripcion.actualizada_en,
        "cancelada_en": inscripcion.cancelada_en,
        "cupos_disponibles": cupos_disponibles,
    }


# ---------- Consultas ----------


def listar_actividades(db: Session, proximas: bool):
    consulta = select(Actividad).order_by(Actividad.fecha, Actividad.hora, Actividad.id)
    if proximas:
        consulta = consulta.where(Actividad.fecha >= hoy_chile(db))
    return [actividad_a_dict(a, contar_inscritos(db, a.id)) for a in db.scalars(consulta)]


def obtener_actividad(db: Session, actividad_id: int):
    actividad = buscar(db, Actividad, actividad_id, "Actividad no encontrada")
    return actividad_a_dict(actividad, contar_inscritos(db, actividad_id))


def listar_asistentes(db: Session, actividad_id: int, estado: str):
    actividad = buscar(db, Actividad, actividad_id, "Actividad no encontrada")
    filas = db.execute(
        select(
            Inscripcion.id.label("inscripcion_id"),
            Alumno.id.label("alumno_id"),
            Alumno.codigo.label("alumno_codigo"),
            Alumno.nombre.label("alumno_nombre"),
            Inscripcion.estado,
            Inscripcion.creada_en,
            Inscripcion.cancelada_en,
        )
        .join(Alumno, Alumno.id == Inscripcion.alumno_id)
        .where(Inscripcion.actividad_id == actividad_id)
        .order_by(Alumno.nombre)
    ).mappings().all()

    inscritos = [f for f in filas if f["estado"] == "inscrita"]
    cancelados = [f for f in filas if f["estado"] == "cancelada"]
    asistentes = {"inscrita": inscritos, "cancelada": cancelados, "todas": filas}[estado]
    return {
        "actividad": actividad_a_dict(actividad, len(inscritos)),
        "total_inscritos": len(inscritos),
        "total_cancelados": len(cancelados),
        "asistentes": [dict(f) for f in asistentes],
    }


# ---------- Inscribir y cancelar ----------


def crear_inscripcion(db: Session, actividad_id: int, datos):
    alumno = db.get(Alumno, datos.alumno_id)
    if not alumno or not alumno.activo:
        raise HTTPException(404, "Alumno no encontrado o inactivo")
    revisar_apoderado(db, datos.apoderado_id, datos.alumno_id)

    # Bloqueo: las inscripciones simultáneas a la misma actividad esperan aquí, de a una.
    actividad = buscar(db, Actividad, actividad_id, "Actividad no encontrada", bloquear=True)
    if not actividad.inscripciones_abiertas or actividad.fecha < hoy_chile(db):
        raise HTTPException(409, "Las inscripciones para esta actividad están cerradas")

    existente = db.scalar(
        select(Inscripcion).where(Inscripcion.actividad_id == actividad_id, Inscripcion.alumno_id == datos.alumno_id)
    )
    if existente and existente.estado == "inscrita":
        raise HTTPException(409, "El alumno ya está inscrito en esta actividad")
    if contar_inscritos(db, actividad_id) >= actividad.cupo_maximo:
        raise HTTPException(409, "No quedan cupos disponibles para esta actividad")

    if existente:
        # Había cancelado antes: se reactiva la misma inscripción.
        inscripcion = existente
        inscripcion.estado = "inscrita"
        inscripcion.apoderado_id = datos.apoderado_id
        inscripcion.cancelada_en = None
        inscripcion.actualizada_en = func.now()
    else:
        inscripcion = Inscripcion(actividad_id=actividad_id, alumno_id=datos.alumno_id, apoderado_id=datos.apoderado_id)
        db.add(inscripcion)
    db.commit()
    db.refresh(inscripcion)
    return inscripcion_a_dict(inscripcion, actividad.cupo_maximo - contar_inscritos(db, actividad_id))


def cancelar_inscripcion(db: Session, inscripcion_id: int, datos):
    inscripcion = buscar(db, Inscripcion, inscripcion_id, "Inscripción no encontrada", bloquear=True)
    revisar_apoderado(db, datos.apoderado_id, inscripcion.alumno_id)
    if inscripcion.estado == "cancelada":
        raise HTTPException(409, "La inscripción ya estaba cancelada")
    actividad = db.get(Actividad, inscripcion.actividad_id)
    if actividad.fecha < hoy_chile(db):
        raise HTTPException(409, "No se puede cancelar la inscripción de una actividad que ya ocurrió")

    inscripcion.estado = "cancelada"
    inscripcion.cancelada_en = func.now()
    inscripcion.actualizada_en = func.now()
    db.commit()
    db.refresh(inscripcion)
    return inscripcion_a_dict(inscripcion, actividad.cupo_maximo - contar_inscritos(db, actividad.id))
