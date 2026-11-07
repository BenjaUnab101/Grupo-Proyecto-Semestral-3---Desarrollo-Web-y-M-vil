from datetime import date
from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy import case, func, select, text, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.models import Actividad, Alumno, Apoderado, ApoderadoAlumno, Categoria, Inscripcion, Organizador, Pago
from app.schemas.inscripciones import ActividadIn, ActividadUpdate, CancelacionIn, InscripcionIn, PagoIn


# HU-19: reglas de inscripción, cancelación, cupos y asistentes.
#
# Control de cupo con concurrencia (CA2): antes de contar los inscritos se bloquea la
# fila de la actividad con SELECT ... FOR UPDATE. Si dos apoderados intentan inscribir
# al mismo tiempo en la misma actividad, PostgreSQL hace esperar al segundo hasta que
# el primero termine (commit o rollback), y el segundo cuenta los inscritos ya
# actualizados. Así nunca se pueden aceptar más inscripciones que cupos.

ESTADO_INSCRITA = "inscrita"
ESTADO_CANCELADA = "cancelada"
PAGO_APROBADO = "aprobado"
PAGO_REEMBOLSADO = "reembolsado"


def _hoy_chile(db: Session) -> date:
    # La fecha de "hoy" se calcula en PostgreSQL con la zona de Chile, para no depender
    # de la zona horaria del contenedor (que normalmente es UTC).
    return db.scalar(text("SELECT (now() AT TIME ZONE 'America/Santiago')::date"))


def _contar_inscritos(db: Session, actividad_id: int) -> int:
    return db.scalar(
        select(func.count(Inscripcion.id)).where(
            Inscripcion.actividad_id == actividad_id,
            Inscripcion.estado == ESTADO_INSCRITA,
        )
    )


def _actividad_out(actividad: Actividad, inscritos: int) -> dict:
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


def _inscripcion_out(inscripcion: Inscripcion, cupos_disponibles: int) -> dict:
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


def _validar_apoderado_del_alumno(db: Session, apoderado_id: int, alumno_id: int):
    apoderado = db.get(Apoderado, apoderado_id)
    if not apoderado or not apoderado.activo:
        raise HTTPException(status_code=404, detail="Apoderado no encontrado o inactivo")

    if not db.get(ApoderadoAlumno, (apoderado_id, alumno_id)):
        raise HTTPException(
            status_code=403,
            detail="El alumno no está asociado a este apoderado",
        )


# ---------- Consultas ----------


def listar_actividades(db: Session, proximas: bool):
    inscritos = (
        select(Inscripcion.actividad_id, func.count(Inscripcion.id).label("inscritos"))
        .where(Inscripcion.estado == ESTADO_INSCRITA)
        .group_by(Inscripcion.actividad_id)
        .subquery()
    )
    consulta = select(Actividad, func.coalesce(inscritos.c.inscritos, 0)).outerjoin(
        inscritos, inscritos.c.actividad_id == Actividad.id
    )

    if proximas:
        consulta = consulta.where(Actividad.fecha >= _hoy_chile(db))

    filas = db.execute(consulta.order_by(Actividad.fecha, Actividad.hora, Actividad.id)).all()
    return [_actividad_out(actividad, total) for actividad, total in filas]


def obtener_actividad(db: Session, actividad_id: int):
    actividad = db.get(Actividad, actividad_id)
    if not actividad:
        raise HTTPException(status_code=404, detail="Actividad no encontrada")
    return _actividad_out(actividad, _contar_inscritos(db, actividad_id))


def listar_asistentes(db: Session, actividad_id: int, estado: str):
    # CA4: lista de asistentes con su estado, consultada en PostgreSQL con un JOIN
    # entre inscripciones y alumnos (equivale a la vista v_asistentes_actividad).
    actividad = db.get(Actividad, actividad_id)
    if not actividad:
        raise HTTPException(status_code=404, detail="Actividad no encontrada")

    consulta = (
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
    )
    if estado != "todas":
        consulta = consulta.where(Inscripcion.estado == estado)

    asistentes = db.execute(consulta.order_by(Alumno.nombre, Inscripcion.id)).mappings().all()

    totales = db.execute(
        select(
            func.count(case((Inscripcion.estado == ESTADO_INSCRITA, 1))),
            func.count(case((Inscripcion.estado == ESTADO_CANCELADA, 1))),
        ).where(Inscripcion.actividad_id == actividad_id)
    ).one()

    return {
        "actividad": _actividad_out(actividad, totales[0]),
        "total_inscritos": totales[0],
        "total_cancelados": totales[1],
        "asistentes": [dict(fila) for fila in asistentes],
    }


# ---------- Inscripción y cancelación ----------


def crear_inscripcion(db: Session, actividad_id: int, payload: InscripcionIn):
    alumno = db.get(Alumno, payload.alumno_id)
    if not alumno or not alumno.activo:
        raise HTTPException(status_code=404, detail="Alumno no encontrado o inactivo")

    _validar_apoderado_del_alumno(db, payload.apoderado_id, payload.alumno_id)

    # CA2: bloquea la fila de la actividad hasta el commit. Las inscripciones
    # simultáneas a la MISMA actividad esperan aquí y se procesan de a una.
    actividad = db.scalars(
        select(Actividad).where(Actividad.id == actividad_id).with_for_update()
    ).first()
    if not actividad:
        raise HTTPException(status_code=404, detail="Actividad no encontrada")

    if not actividad.inscripciones_abiertas or actividad.fecha < _hoy_chile(db):
        raise HTTPException(
            status_code=409,
            detail="Las inscripciones para esta actividad están cerradas",
        )

    existente = db.scalars(
        select(Inscripcion).where(
            Inscripcion.actividad_id == actividad_id,
            Inscripcion.alumno_id == payload.alumno_id,
        )
    ).first()

    # CA3: no se permite una segunda inscripción vigente del mismo alumno.
    if existente and existente.estado == ESTADO_INSCRITA:
        raise HTTPException(
            status_code=409,
            detail="El alumno ya está inscrito en esta actividad",
        )

    # CA2 / CA5: el conteo se hace DESPUÉS de obtener el bloqueo, así refleja las
    # inscripciones que otros confirmaron mientras esta solicitud esperaba.
    inscritos = _contar_inscritos(db, actividad_id)
    if inscritos >= actividad.cupo_maximo:
        raise HTTPException(
            status_code=409,
            detail="No quedan cupos disponibles para esta actividad",
        )

    if existente:
        # El alumno había cancelado: se reactiva la misma inscripción.
        existente.estado = ESTADO_INSCRITA
        existente.apoderado_id = payload.apoderado_id
        existente.cancelada_en = None
        existente.actualizada_en = func.now()
        inscripcion = existente
    else:
        inscripcion = Inscripcion(
            actividad_id=actividad_id,
            alumno_id=payload.alumno_id,
            apoderado_id=payload.apoderado_id,
            estado=ESTADO_INSCRITA,
        )
        db.add(inscripcion)

    try:
        db.commit()
    except IntegrityError:
        # Respaldo de CA3: la restricción UNIQUE (actividad_id, alumno_id) de la base.
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="El alumno ya está inscrito en esta actividad",
        )

    db.refresh(inscripcion)
    cupos = max(actividad.cupo_maximo - _contar_inscritos(db, actividad_id), 0)
    return _inscripcion_out(inscripcion, cupos)


def cancelar_inscripcion(db: Session, inscripcion_id: int, payload: CancelacionIn):
    # Bloquea la inscripción para que dos cancelaciones simultáneas no se pisen.
    inscripcion = db.scalars(
        select(Inscripcion).where(Inscripcion.id == inscripcion_id).with_for_update()
    ).first()
    if not inscripcion:
        raise HTTPException(status_code=404, detail="Inscripción no encontrada")

    _validar_apoderado_del_alumno(db, payload.apoderado_id, inscripcion.alumno_id)

    if inscripcion.estado == ESTADO_CANCELADA:
        raise HTTPException(status_code=409, detail="La inscripción ya estaba cancelada")

    actividad = db.get(Actividad, inscripcion.actividad_id)
    if actividad.fecha < _hoy_chile(db):
        raise HTTPException(
            status_code=409,
            detail="No se puede cancelar la inscripción de una actividad que ya ocurrió",
        )

    inscripcion.estado = ESTADO_CANCELADA
    inscripcion.cancelada_en = func.now()
    inscripcion.actualizada_en = func.now()

    # TEC-16: si la inscripción tenía un pago (ficticio) aprobado, se marca como
    # reembolsado en la MISMA transacción: o se guardan ambos cambios o ninguno.
    db.execute(
        update(Pago)
        .where(Pago.inscripcion_id == inscripcion.id, Pago.estado == PAGO_APROBADO)
        .values(estado=PAGO_REEMBOLSADO, actualizado_en=func.now())
    )
    db.commit()

    db.refresh(inscripcion)
    cupos = max(actividad.cupo_maximo - _contar_inscritos(db, actividad.id), 0)
    return _inscripcion_out(inscripcion, cupos)


# ---------- TEC-16: CRUD de actividades (eventos) ----------


def _validar_referencias(db: Session, categoria_id: int | None, organizador_id: int | None):
    if categoria_id is not None and not db.get(Categoria, categoria_id):
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    if organizador_id is not None:
        organizador = db.get(Organizador, organizador_id)
        if not organizador or not organizador.activo:
            raise HTTPException(status_code=404, detail="Organizador no encontrado o inactivo")


def crear_actividad(db: Session, payload: ActividadIn):
    _validar_referencias(db, payload.categoria_id, payload.organizador_id)

    actividad = Actividad(**payload.model_dump())
    db.add(actividad)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Ya existe una actividad con ese código")

    db.refresh(actividad)
    return _actividad_out(actividad, 0)


def actualizar_actividad(db: Session, actividad_id: int, payload: ActividadUpdate):
    # Se bloquea la actividad: así un cambio de cupo no se cruza con una inscripción
    # que se está procesando al mismo tiempo (ver crear_inscripcion).
    actividad = db.scalars(
        select(Actividad).where(Actividad.id == actividad_id).with_for_update()
    ).first()
    if not actividad:
        raise HTTPException(status_code=404, detail="Actividad no encontrada")

    cambios = payload.model_dump(exclude_unset=True)
    _validar_referencias(db, cambios.get("categoria_id"), cambios.get("organizador_id"))

    inscritos = _contar_inscritos(db, actividad_id)
    if "cupo_maximo" in cambios and cambios["cupo_maximo"] < inscritos:
        raise HTTPException(
            status_code=409,
            detail=f"No se puede bajar el cupo a {cambios['cupo_maximo']}: ya hay {inscritos} inscritos",
        )

    for campo, valor in cambios.items():
        setattr(actividad, campo, valor)
    db.commit()

    db.refresh(actividad)
    return _actividad_out(actividad, inscritos)


def eliminar_actividad(db: Session, actividad_id: int):
    actividad = db.scalars(
        select(Actividad).where(Actividad.id == actividad_id).with_for_update()
    ).first()
    if not actividad:
        raise HTTPException(status_code=404, detail="Actividad no encontrada")

    # Con inscripciones (aunque estén canceladas) se conserva el historial: no se borra.
    tiene_inscripciones = db.scalar(
        select(func.count(Inscripcion.id)).where(Inscripcion.actividad_id == actividad_id)
    )
    if tiene_inscripciones:
        raise HTTPException(
            status_code=409,
            detail="La actividad tiene inscripciones y no se puede eliminar. "
                   "Para que no reciba más, ciérrala con inscripciones_abiertas = false",
        )

    db.delete(actividad)
    db.commit()


# ---------- TEC-16: pagos FICTICIOS ----------


def crear_pago(db: Session, inscripcion_id: int, payload: PagoIn):
    # Se bloquea la inscripción: dos pagos simultáneos de la misma inscripción se
    # procesan de a uno, y el segundo ve que ya está pagada.
    inscripcion = db.scalars(
        select(Inscripcion).where(Inscripcion.id == inscripcion_id).with_for_update()
    ).first()
    if not inscripcion:
        raise HTTPException(status_code=404, detail="Inscripción no encontrada")

    _validar_apoderado_del_alumno(db, payload.apoderado_id, inscripcion.alumno_id)

    if inscripcion.estado != ESTADO_INSCRITA:
        raise HTTPException(status_code=409, detail="Solo se pueden pagar inscripciones vigentes")

    actividad = db.get(Actividad, inscripcion.actividad_id)
    if actividad.costo == 0:
        raise HTTPException(status_code=409, detail="La actividad es gratuita: no requiere pago")

    ya_pagada = db.scalar(
        select(func.count(Pago.id)).where(
            Pago.inscripcion_id == inscripcion_id, Pago.estado == PAGO_APROBADO
        )
    )
    if ya_pagada:
        raise HTTPException(status_code=409, detail="La inscripción ya está pagada")

    pago = Pago(
        inscripcion_id=inscripcion_id,
        monto=actividad.costo,
        referencia=f"SIM-{uuid4().hex[:12].upper()}",
    )
    db.add(pago)
    try:
        db.commit()
    except IntegrityError:
        # Respaldo: índice único parcial uq_pagos_aprobado_por_inscripcion.
        db.rollback()
        raise HTTPException(status_code=409, detail="La inscripción ya está pagada")

    db.refresh(pago)
    return pago


def listar_pagos(db: Session, inscripcion_id: int):
    if not db.get(Inscripcion, inscripcion_id):
        raise HTTPException(status_code=404, detail="Inscripción no encontrada")
    return db.scalars(
        select(Pago).where(Pago.inscripcion_id == inscripcion_id).order_by(Pago.creado_en, Pago.id)
    ).all()
