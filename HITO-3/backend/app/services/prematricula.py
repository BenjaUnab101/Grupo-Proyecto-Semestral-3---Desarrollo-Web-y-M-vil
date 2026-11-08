import secrets

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.models import SolicitudPrematricula

# HU-25: solicitudes de pre-matrícula.
#   1. La familia envía el formulario  -> queda "recibida" y recibe un código de seguimiento.
#   2. La familia consulta el estado    -> con su código + el correo que usó.
#   3. Dirección cambia el estado       -> y puede dejar un mensaje para la familia.

LETRAS_CODIGO = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"  # sin 0/O ni 1/I, para no confundirlas


def crear_solicitud(db: Session, datos):
    repetida = db.scalar(
        select(SolicitudPrematricula).where(
            SolicitudPrematricula.rut == datos.rut,
            SolicitudPrematricula.nombre_parvulo == datos.nombre_parvulo,
            SolicitudPrematricula.nivel == datos.nivel,
            SolicitudPrematricula.estado.in_(["recibida", "en_revision", "lista_espera"]),
        )
    )
    if repetida:
        raise HTTPException(409, "Ya existe una solicitud en curso para este párvulo y nivel. Consulta su estado con tu código de seguimiento.")

    solicitud = SolicitudPrematricula(
        **datos.model_dump(exclude={"consentimiento"}),
        codigo="PM-" + "".join(secrets.choice(LETRAS_CODIGO) for _ in range(6)),
    )
    db.add(solicitud)
    db.commit()
    db.refresh(solicitud)
    return solicitud


def consultar_seguimiento(db: Session, datos):
    solicitud = db.scalar(select(SolicitudPrematricula).where(SolicitudPrematricula.codigo == datos.codigo.upper()))
    # Mismo mensaje si el código no existe o si el correo no coincide: así nadie puede
    # averiguar qué códigos existen.
    if not solicitud or solicitud.correo != datos.correo.lower():
        raise HTTPException(404, "No encontramos una solicitud con ese código y correo. Revisa ambos datos.")
    return solicitud


def listar_solicitudes(db: Session, estado):
    consulta = select(SolicitudPrematricula).order_by(SolicitudPrematricula.creada_en.desc())
    if estado:
        consulta = consulta.where(SolicitudPrematricula.estado == estado)
    return db.scalars(consulta).all()


def cambiar_estado(db: Session, solicitud_id: int, datos):
    solicitud = db.get(SolicitudPrematricula, solicitud_id)
    if not solicitud:
        raise HTTPException(404, "Solicitud no encontrada")
    solicitud.estado = datos.estado
    solicitud.mensaje_familia = datos.mensaje_familia or None
    solicitud.actualizada_en = func.now()
    db.commit()
    db.refresh(solicitud)
    return solicitud
