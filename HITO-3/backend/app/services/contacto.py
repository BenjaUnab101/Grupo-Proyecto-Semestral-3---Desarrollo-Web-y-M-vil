"""HU-26 (Sprint 3 · Daniel) · Contacto con dirección persistido y estados de atención.

  1. Una familia (con o sin sesión) envía la consulta -> queda "nuevo" con un código CT-XXXXXX.
  2. Quien la envió consulta su estado:
       - con sesión: GET /contacto/mias (solo SUS consultas);
       - sin sesión: código + correo (POST /contacto/seguimiento), como la pre-matrícula (HU-25).
  3. Dirección lista, filtra y cambia el estado (nuevo / en_gestion / cerrado) con una respuesta.
"""

import secrets

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.models import ConsultaContacto
from app.services import auditoria

LETRAS_CODIGO = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"  # sin 0/O ni 1/I (igual que HU-25)


def _nuevo_codigo(db: Session) -> str:
    while True:
        codigo = "CT-" + "".join(secrets.choice(LETRAS_CODIGO) for _ in range(6))
        if not db.scalar(select(ConsultaContacto.id).where(ConsultaContacto.codigo == codigo)):
            return codigo


def crear_consulta(db: Session, datos, usuario=None) -> ConsultaContacto:
    consulta = ConsultaContacto(**datos.model_dump(), codigo=_nuevo_codigo(db), usuario_id=getattr(usuario, "id", None))
    db.add(consulta)
    db.commit()
    db.refresh(consulta)
    auditoria.registrar("contacto_creado", actor=usuario, recurso_tipo="contacto", recurso_id=consulta.id,
                        datos={"estado_nuevo": consulta.estado})
    return consulta


def consultar_seguimiento(db: Session, datos) -> ConsultaContacto:
    consulta = db.scalar(select(ConsultaContacto).where(ConsultaContacto.codigo == datos.codigo.upper()))
    # Mismo mensaje si el código no existe o el correo no coincide (no revela códigos válidos).
    if not consulta or consulta.correo != datos.correo.lower():
        raise HTTPException(404, "No encontramos una consulta con ese código y correo. Revisa ambos datos.")
    return consulta


def mis_consultas(db: Session, usuario):
    return db.scalars(
        select(ConsultaContacto).where(ConsultaContacto.usuario_id == usuario.id).order_by(ConsultaContacto.creada_en.desc(), ConsultaContacto.id.desc())
    ).all()


def listar_consultas(db: Session, estado):
    consulta = select(ConsultaContacto).order_by(ConsultaContacto.creada_en.desc(), ConsultaContacto.id.desc())
    if estado:
        consulta = consulta.where(ConsultaContacto.estado == estado)
    return db.scalars(consulta).all()


def cambiar_estado(db: Session, consulta_id: int, datos, usuario) -> ConsultaContacto:
    consulta = db.scalar(select(ConsultaContacto).where(ConsultaContacto.id == consulta_id).with_for_update())
    if not consulta:
        raise HTTPException(404, "Consulta no encontrada")
    anterior = consulta.estado
    if anterior == "cerrado" and datos.estado != "cerrado":
        raise HTTPException(409, "La consulta ya está cerrada; la familia debe enviar una nueva")
    consulta.estado = datos.estado
    if datos.respuesta_direccion is not None:
        consulta.respuesta_direccion = datos.respuesta_direccion or None
    consulta.actualizada_en = func.now()
    db.commit()
    db.refresh(consulta)
    auditoria.registrar("contacto_estado_cambiado", actor=usuario, recurso_tipo="contacto", recurso_id=consulta.id,
                        datos={"estado_anterior": anterior, "estado_nuevo": consulta.estado})
    return consulta
