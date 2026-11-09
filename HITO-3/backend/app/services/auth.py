"""HU-16 (Sprint 3 · Daniel) · Inicio de sesión real, sesiones y cierre de sesión.

Flujo:
  1. POST /auth/login con email + contraseña. El servidor compara contra usuarios.password_hash
     (PBKDF2). Si es correcto crea una fila en `sesiones` y devuelve un token Bearer.
  2. React envía `Authorization: Bearer <token>` en cada petición.
  3. POST /auth/logout marca la sesión como revocada: el token deja de servir (401).
  4. Las sesiones vencen solas a los SESION_MINUTOS minutos.
"""

import logging
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.seguridad import hash_token, hashear_password, nuevo_token, verificar_password_o_relleno
from app.db.models import Sesion, Usuario
from app.services import auditoria

log = logging.getLogger("pequenos_reyes.auth")

MARCADOR_SIN_CONTRASENA = "demo-sin-contrasena"  # el de las semillas S001/S005
MENSAJE_LOGIN_FALLIDO = "Correo o contraseña incorrectos"  # genérico: no revela qué falló


def ahora() -> datetime:
    return datetime.now(timezone.utc)


def _utc(fecha: datetime) -> datetime:
    # SQLite (pruebas) devuelve fechas sin zona; PostgreSQL, con zona.
    return fecha if fecha.tzinfo else fecha.replace(tzinfo=timezone.utc)


# R4 · Matiz B: las cuentas FICTICIAS se reconocen por su dominio. Fuera de development/test no
# pueden iniciar sesión ni usar tokens emitidos antes, aunque su hash siga guardado en la base.
# No se borra ni se modifica nada en PostgreSQL: el rechazo ocurre al validar la identidad.
DOMINIO_DEMO = "@ejemplo.cl"


def es_cuenta_demo(usuario: Usuario | None) -> bool:
    return bool(usuario) and (usuario.email or "").strip().lower().endswith(DOMINIO_DEMO)


def cuenta_demo_bloqueada(usuario: Usuario | None) -> bool:
    """True si es una cuenta demo y el entorno no es development/test."""
    return es_cuenta_demo(usuario) and not settings.es_entorno_de_desarrollo


def iniciar_sesion(db: Session, email: str, password: str) -> dict:
    usuario = db.scalar(select(Usuario).where(Usuario.email == email.strip().lower()))
    # La contraseña se verifica SIEMPRE (también para cuentas demo bloqueadas), para que el
    # tiempo de respuesta no revele qué cuentas existen o están bloqueadas.
    valido = verificar_password_o_relleno(password, usuario.password_hash if usuario else None)
    if not valido or not usuario.activo or cuenta_demo_bloqueada(usuario):
        if not valido:
            motivo = "credenciales"
        elif not usuario.activo:
            motivo = "cuenta_inactiva"
        else:
            motivo = "cuenta_demo_fuera_de_desarrollo"
        auditoria.registrar("acceso_login", "fallido", actor=usuario if usuario and usuario.activo else None,
                            datos={"motivo": motivo})
        raise HTTPException(401, MENSAJE_LOGIN_FALLIDO, headers={"WWW-Authenticate": "Bearer"})

    token = nuevo_token()
    sesion = Sesion(usuario_id=usuario.id, token_hash=hash_token(token), expira_en=ahora() + timedelta(minutes=settings.sesion_minutos))
    db.add(sesion)
    db.commit()
    db.refresh(sesion)
    auditoria.registrar("acceso_login", "exito", actor=usuario)
    return {"token": token, "tipo": "bearer", "expira_en": _utc(sesion.expira_en), "usuario": usuario}


def usuario_de_token(db: Session, token: str) -> Usuario | None:
    """Usuario dueño de un token vigente, o None si no existe, venció o fue revocado."""
    sesion = db.scalar(select(Sesion).where(Sesion.token_hash == hash_token(token), Sesion.revocada_en.is_(None)))
    if sesion is None or _utc(sesion.expira_en) <= ahora():
        return None
    usuario = db.get(Usuario, sesion.usuario_id)
    if not usuario or not usuario.activo:
        return None
    # R4 · Matiz B: validación CENTRAL. Un token de cuenta demo emitido en desarrollo deja de
    # valer si la API ahora corre en staging/production (la sesión no se borra, solo se rechaza).
    if cuenta_demo_bloqueada(usuario):
        return None
    return usuario


def cerrar_sesion(db: Session, token: str, usuario: Usuario):
    db.execute(update(Sesion).where(Sesion.token_hash == hash_token(token), Sesion.revocada_en.is_(None)).values(revocada_en=ahora()))
    db.commit()
    auditoria.registrar("acceso_logout", "exito", actor=usuario)


def asignar_credenciales_demo(db: Session) -> int:
    """Solo desarrollo: da la contraseña DEMO_PASSWORD (del entorno) a las cuentas ficticias
    @ejemplo.cl que todavía tienen el marcador de las semillas. Devuelve cuántas cambió."""
    if not settings.demo_password:
        return 0
    if not settings.es_entorno_de_desarrollo:  # H-04: lista permitida (development/test)
        log.warning("DEMO_PASSWORD se ignora: APP_ENV no es development ni test")
        return 0
    cuentas = db.scalars(
        select(Usuario).where(Usuario.email.like("%" + DOMINIO_DEMO), Usuario.password_hash == MARCADOR_SIN_CONTRASENA)
    ).all()
    for cuenta in cuentas:
        cuenta.password_hash = hashear_password(settings.demo_password)
    db.commit()
    return len(cuentas)
