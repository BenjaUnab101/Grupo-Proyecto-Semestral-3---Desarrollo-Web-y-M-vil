from datetime import datetime, timezone

from fastapi import HTTPException
from fastapi.encoders import jsonable_encoder
from sqlalchemy import Date, and_, cast, extract, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.permisos import es_editor, puede_modificar
from app.db.models import Apoderado, ApoderadoAlumno, Comunicado, Matricula, Sala
from app.db.mongo import get_bitacora_comunicados_collection
from app.schemas.comunicado import ComunicadoOut

# HU-21: comunicados en PostgreSQL + bitácora de cambios en MongoDB.
#
# Un comunicado está VIGENTE (lo ven las familias) si está publicado, su fecha de
# publicación ya llegó y no venció (vigente_hasta vacío, o hoy o después, en hora de Chile).

ZONA = "America/Santiago"
HOY_CHILE = cast(func.timezone(ZONA, func.now()), Date)
VIGENTE = and_(
    Comunicado.publicado.is_(True),
    Comunicado.fecha_publicacion <= func.now(),
    or_(Comunicado.vigente_hasta.is_(None), Comunicado.vigente_hasta >= HOY_CHILE),
)
MAS_NUEVOS_PRIMERO = (Comunicado.fecha_publicacion.desc(), Comunicado.id.desc())


def fecha_chile(columna):
    return cast(func.timezone(ZONA, columna), Date)


def registrar_bitacora(comunicado_id, accion, usuario, cambios):
    # La bitácora es un complemento: si MongoDB no responde, el cambio en PostgreSQL
    # igual queda guardado (no se deshace por un problema de la bitácora).
    try:
        get_bitacora_comunicados_collection().insert_one({
            "comunicado_id": comunicado_id,
            "accion": accion,
            "usuario_id": usuario.id,
            "rol": usuario.rol,
            "fecha": datetime.now(timezone.utc),
            "cambios": jsonable_encoder(cambios),
        })
    except Exception:
        pass


def guardar(db: Session):
    try:
        db.commit()
    except IntegrityError:
        # La única regla de la base que puede fallar aquí es la de vigencia.
        db.rollback()
        raise HTTPException(400, "La vigencia (vigente_hasta) no puede terminar antes de la fecha de publicación")


def buscar_para_modificar(db: Session, comunicado_id: int, usuario):
    comunicado = db.scalar(select(Comunicado).where(Comunicado.id == comunicado_id).with_for_update())
    if not comunicado:
        raise HTTPException(404, "Comunicado no encontrado")
    if not puede_modificar(usuario, comunicado.autor_usuario_id):
        raise HTTPException(403, "Solo dirección o quien publicó el comunicado puede modificarlo o eliminarlo")
    return comunicado


# ---------- Lectura ----------


def listar_comunicados(db: Session, usuario, nivel, urgente, desde, hasta, vigentes, limite, desplazamiento):
    if not vigentes and not es_editor(usuario):
        raise HTTPException(403, "Solo dirección y el personal del jardín pueden ver borradores, programados y vencidos")
    if desde and hasta and desde > hasta:
        raise HTTPException(400, "La fecha 'desde' no puede ser posterior a 'hasta'")

    consulta = select(Comunicado)
    if vigentes:
        consulta = consulta.where(VIGENTE)
    if nivel != "Todos":
        consulta = consulta.where(Comunicado.nivel == nivel)
    if urgente is not None:
        consulta = consulta.where(Comunicado.es_urgente.is_(urgente))
    if desde:
        consulta = consulta.where(fecha_chile(Comunicado.fecha_publicacion) >= desde)
    if hasta:
        consulta = consulta.where(fecha_chile(Comunicado.fecha_publicacion) <= hasta)
    return db.scalars(consulta.order_by(*MAS_NUEVOS_PRIMERO).limit(limite).offset(desplazamiento)).all()


def obtener_comunicado(db: Session, comunicado_id: int, usuario):
    consulta = select(Comunicado).where(Comunicado.id == comunicado_id)
    if not es_editor(usuario):
        consulta = consulta.where(VIGENTE)  # para una familia, un borrador o un vencido "no existe"
    comunicado = db.scalar(consulta)
    if not comunicado:
        raise HTTPException(404, "Comunicado no encontrado")
    return comunicado


def comunicados_pertinentes(db: Session, apoderado_id: int, urgente):
    if not db.get(Apoderado, apoderado_id):
        raise HTTPException(404, "Apoderado no encontrado")

    # Niveles del apoderado: General + el grupo de las salas donde sus hijos están
    # matriculados este año (matrícula no anulada).
    grupos = db.scalars(
        select(Sala.grupo_comunicados)
        .join(Matricula, Matricula.sala_id == Sala.id)
        .join(ApoderadoAlumno, ApoderadoAlumno.alumno_id == Matricula.alumno_id)
        .where(
            ApoderadoAlumno.apoderado_id == apoderado_id,
            Matricula.anio_escolar == extract("year", func.timezone(ZONA, func.now())),
            Matricula.estado != "anulada",
        )
    ).all()
    niveles = ["General"] + sorted(set(grupos))

    consulta = select(Comunicado).where(VIGENTE, Comunicado.nivel.in_(niveles))
    if urgente is not None:
        consulta = consulta.where(Comunicado.es_urgente.is_(urgente))
    comunicados = db.scalars(consulta.order_by(*MAS_NUEVOS_PRIMERO).limit(100)).all()
    return {"apoderado_id": apoderado_id, "niveles": niveles, "comunicados": comunicados}


# ---------- Escritura ----------


def crear_comunicado(db: Session, usuario, datos):
    valores = datos.model_dump(exclude_none=True)  # sin fecha_publicacion, la base usa now()
    comunicado = Comunicado(**valores, autor_usuario_id=usuario.id)
    db.add(comunicado)
    guardar(db)
    db.refresh(comunicado)
    registrar_bitacora(comunicado.id, "crear", usuario, ComunicadoOut.model_validate(comunicado).model_dump())
    return comunicado


def actualizar_comunicado(db: Session, usuario, comunicado_id: int, datos):
    comunicado = buscar_para_modificar(db, comunicado_id, usuario)
    cambios = datos.model_dump(exclude_unset=True, exclude_none=True)
    for campo, valor in cambios.items():
        setattr(comunicado, campo, valor)
    comunicado.actualizado_en = func.now()
    guardar(db)
    db.refresh(comunicado)
    registrar_bitacora(comunicado.id, "editar", usuario, cambios)
    return comunicado


def eliminar_comunicado(db: Session, usuario, comunicado_id: int):
    comunicado = buscar_para_modificar(db, comunicado_id, usuario)
    copia = ComunicadoOut.model_validate(comunicado).model_dump()  # queda en la bitácora
    db.delete(comunicado)
    db.commit()
    registrar_bitacora(comunicado_id, "eliminar", usuario, copia)


def bitacora_comunicado(db: Session, comunicado_id: int):
    try:
        entradas = list(
            get_bitacora_comunicados_collection().find({"comunicado_id": comunicado_id}, {"_id": 0}).sort("fecha", 1)
        )
    except Exception:
        raise HTTPException(503, "Bitácora de comunicados temporalmente no disponible")
    if not entradas and not db.get(Comunicado, comunicado_id):
        raise HTTPException(404, "Comunicado no encontrado")
    return entradas
