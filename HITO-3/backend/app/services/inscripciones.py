from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy import func, select, text, update
from sqlalchemy.orm import Session

from app.db.models import Actividad, Alumno, Apoderado, ApoderadoAlumno, Categoria, Inscripcion, Organizador, Pago
from app.services import auditoria  # HU-22 (Sprint 3 · Daniel)

# HU-19: inscripciones a eventos (salidas, talleres), cupos y asistentes.
# TEC-16: CRUD de eventos y pagos ficticios.
# TEC-17: inscripciones de los hijos de un apoderado.
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
        "categoria_id": actividad.categoria_id,
        "organizador_id": actividad.organizador_id,
        "costo": actividad.costo,
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


def inscripciones_de_apoderado(db: Session, apoderado_id: int):
    buscar(db, Apoderado, apoderado_id, "Apoderado no encontrado")
    filas = db.execute(
        select(
            Inscripcion.id,
            Inscripcion.actividad_id,
            Inscripcion.alumno_id,
            Alumno.nombre.label("alumno_nombre"),
            Inscripcion.estado,
            Inscripcion.creada_en,
            Inscripcion.cancelada_en,
        )
        .join(Alumno, Alumno.id == Inscripcion.alumno_id)
        .join(ApoderadoAlumno, ApoderadoAlumno.alumno_id == Inscripcion.alumno_id)
        .where(ApoderadoAlumno.apoderado_id == apoderado_id)
    ).mappings().all()
    return [dict(f) for f in filas]


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
    cupos = actividad.cupo_maximo - contar_inscritos(db, actividad_id)
    # HU-22 (Sprint 3 · Daniel): evento en la bitácora MongoDB, después del commit SQL.
    auditoria.registrar("inscripcion_creada", recurso_tipo="actividad", recurso_id=actividad_id,
                        datos={"apoderado_id": datos.apoderado_id, "alumno_id": datos.alumno_id, "cupos_disponibles": cupos})
    return inscripcion_a_dict(inscripcion, cupos)


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
    # TEC-16: si estaba pagada (pago ficticio), el pago pasa a "reembolsado" en la misma transacción.
    db.execute(
        update(Pago)
        .where(Pago.inscripcion_id == inscripcion.id, Pago.estado == "aprobado")
        .values(estado="reembolsado", actualizado_en=func.now())
    )
    db.commit()
    db.refresh(inscripcion)
    cupos = actividad.cupo_maximo - contar_inscritos(db, actividad.id)
    # HU-22 (Sprint 3 · Daniel): cambio de estado de la inscripción en la bitácora MongoDB.
    auditoria.registrar("inscripcion_cancelada", recurso_tipo="actividad", recurso_id=actividad.id,
                        datos={"apoderado_id": datos.apoderado_id, "alumno_id": inscripcion.alumno_id,
                               "estado_anterior": "inscrita", "estado_nuevo": "cancelada", "cupos_disponibles": cupos})
    return inscripcion_a_dict(inscripcion, cupos)


# ---------- TEC-16: CRUD de actividades ----------


def revisar_referencias(db: Session, categoria_id, organizador_id):
    if categoria_id and not db.get(Categoria, categoria_id):
        raise HTTPException(404, "Categoría no encontrada")
    if organizador_id and not db.get(Organizador, organizador_id):
        raise HTTPException(404, "Organizador no encontrado")


def crear_actividad(db: Session, datos):
    revisar_referencias(db, datos.categoria_id, datos.organizador_id)
    if db.scalar(select(Actividad).where(Actividad.codigo == datos.codigo)):
        raise HTTPException(409, "Ya existe una actividad con ese código")
    actividad = Actividad(**datos.model_dump())
    db.add(actividad)
    db.commit()
    db.refresh(actividad)
    return actividad_a_dict(actividad, 0)


def actualizar_actividad(db: Session, actividad_id: int, datos):
    actividad = buscar(db, Actividad, actividad_id, "Actividad no encontrada", bloquear=True)
    cambios = datos.model_dump(exclude_unset=True, exclude_none=True)  # solo lo que se envió
    revisar_referencias(db, cambios.get("categoria_id"), cambios.get("organizador_id"))
    inscritos = contar_inscritos(db, actividad_id)
    if cambios.get("cupo_maximo", inscritos) < inscritos:
        raise HTTPException(409, f"No se puede bajar el cupo a {cambios['cupo_maximo']}: ya hay {inscritos} inscritos")

    for campo, valor in cambios.items():
        setattr(actividad, campo, valor)
    db.commit()
    db.refresh(actividad)
    return actividad_a_dict(actividad, inscritos)


def eliminar_actividad(db: Session, actividad_id: int):
    actividad = buscar(db, Actividad, actividad_id, "Actividad no encontrada", bloquear=True)
    # Si tiene inscripciones (aunque estén canceladas) no se borra, para no perder el historial.
    if db.scalar(select(func.count()).where(Inscripcion.actividad_id == actividad_id)):
        raise HTTPException(409, "La actividad tiene inscripciones y no se puede eliminar. Puedes cerrarla con inscripciones_abiertas = false")
    db.delete(actividad)
    db.commit()


# ---------- TEC-16: pagos ficticios ----------


def crear_pago(db: Session, inscripcion_id: int, datos):
    # Bloqueo: si llegan dos pagos a la vez, el segundo ve que ya está pagada.
    inscripcion = buscar(db, Inscripcion, inscripcion_id, "Inscripción no encontrada", bloquear=True)
    revisar_apoderado(db, datos.apoderado_id, inscripcion.alumno_id)
    if inscripcion.estado != "inscrita":
        raise HTTPException(409, "Solo se pueden pagar inscripciones vigentes")
    actividad = db.get(Actividad, inscripcion.actividad_id)
    if actividad.costo == 0:
        raise HTTPException(409, "La actividad es gratuita: no requiere pago")
    ya_pagada = db.scalar(select(Pago).where(Pago.inscripcion_id == inscripcion_id, Pago.estado == "aprobado"))
    if ya_pagada:
        raise HTTPException(409, "La inscripción ya está pagada")

    pago = Pago(inscripcion_id=inscripcion_id, monto=actividad.costo, referencia=f"SIM-{uuid4().hex[:12].upper()}")
    db.add(pago)
    db.commit()
    db.refresh(pago)
    return pago


def listar_pagos(db: Session, inscripcion_id: int):
    buscar(db, Inscripcion, inscripcion_id, "Inscripción no encontrada")
    return db.scalars(select(Pago).where(Pago.inscripcion_id == inscripcion_id).order_by(Pago.id)).all()
