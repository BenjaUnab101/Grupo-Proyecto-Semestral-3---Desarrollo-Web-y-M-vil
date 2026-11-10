from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models import Usuario
from app.db.postgres import get_db
from app.services.auth import es_cuenta_demo, usuario_de_token

# HU-16 (Sprint 3 · Daniel): identidad REAL con token Bearer (POST /auth/login).
# Se mantiene, de forma TRANSITORIA y configurable (PERMITIR_IDENTIDAD_DEMO), la identidad
# simulada de TEC-17 con el encabezado X-Usuario-Id, para no romper las pantallas y pruebas
# del Sprint 2/3 que aún la usan. Si llega un token, el encabezado demo se ignora.


def token_bearer(authorization: str | None) -> str | None:
    if not authorization:
        return None
    esquema, _, token = authorization.partition(" ")
    if esquema.lower() != "bearer" or not token.strip():
        raise HTTPException(401, "Encabezado Authorization inválido: use 'Bearer <token>'", headers={"WWW-Authenticate": "Bearer"})
    return token.strip()


def _por_token(token: str, db: Session):
    usuario = usuario_de_token(db, token)
    if usuario is None:
        raise HTTPException(401, "La sesión no es válida o expiró. Inicia sesión nuevamente.", headers={"WWW-Authenticate": "Bearer"})
    return usuario


def usuario_opcional(
    x_usuario_id: int | None = Header(default=None, gt=0),
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    token = token_bearer(authorization)
    if token:
        return _por_token(token, db)
    if x_usuario_id is None:
        return None
    return _usuario_demo(db, x_usuario_id)


# Remediación postauditoría (Sprint 3 · Daniel): la identidad demo X-Usuario-Id
#  - solo existe en development/test con PERMITIR_IDENTIDAD_DEMO=true (settings.identidad_demo_activa), y
#  - solo puede "actuar como" cuentas FICTICIAS @ejemplo.cl; una cuenta real nunca se suplanta.
# R4: la definición de cuenta demo vive en un solo lugar (app/services/auth.py::es_cuenta_demo).


def _usuario_demo(db: Session, usuario_id: int):
    if not settings.identidad_demo_activa:
        raise HTTPException(401, "La identidad demo (X-Usuario-Id) está deshabilitada: inicia sesión")
    usuario = db.get(Usuario, usuario_id)
    if not usuario or not usuario.activo or not es_cuenta_demo(usuario):
        raise HTTPException(401, "Usuario no reconocido o inactivo")
    return usuario


# Remediación postauditoría · X-Rol (rutas heredadas HU-17/18/20/27, de otros integrantes).
# Esas rutas deciden el permiso con el encabezado X-Rol que manda el navegador. Sin tocar su
# código, esta dependencia GLOBAL (app/main.py) contrasta X-Rol con la identidad real:
#  - con token Bearer: X-Rol debe corresponder al rol de la sesión (si no, 403);
#  - con X-Usuario-Id demo: X-Rol debe corresponder al rol de esa cuenta ficticia (si no, 403);
#  - sin identidad: se acepta SOLO mientras la identidad demo esté activa (desarrollo,
#    transitorio); con PERMITIR_IDENTIDAD_DEMO=false o APP_ENV=production responde 401.
ROLES_EN_CABECERA = {
    "administrador": {"direccion", "dirección"},
    "organizador": {"organizador"},
    "apoderado": {"apoderado"},
}


def validar_cabecera_rol(
    x_rol: str | None = Header(default=None, include_in_schema=False),
    x_usuario_id: str | None = Header(default=None, include_in_schema=False),
    authorization: str | None = Header(default=None, include_in_schema=False),
    db: Session = Depends(get_db),
):
    if x_rol is None:
        return
    token = token_bearer(authorization)
    if token:
        usuario = _por_token(token, db)
    elif x_usuario_id:
        if not x_usuario_id.isdigit() or int(x_usuario_id) <= 0:
            raise HTTPException(401, "Usuario no reconocido o inactivo")
        usuario = _usuario_demo(db, int(x_usuario_id))
    elif settings.identidad_demo_activa:
        return  # transitorio: pantallas heredadas que aún mandan X-Rol sin sesión
    else:
        raise HTTPException(401, "X-Rol requiere una sesión iniciada", headers={"WWW-Authenticate": "Bearer"})
    if x_rol.strip().lower() not in ROLES_EN_CABECERA.get(usuario.rol, set()):
        raise HTTPException(403, "El encabezado X-Rol no corresponde al rol de tu sesión")


# HU-16: SOLO token real (no acepta X-Usuario-Id). Lo usan el portal, la auditoría,
# el contacto y el panel de participación.
def usuario_autenticado(authorization: str | None = Header(default=None), db: Session = Depends(get_db)):
    token = token_bearer(authorization)
    if not token:
        raise HTTPException(401, "Debes iniciar sesión", headers={"WWW-Authenticate": "Bearer"})
    return _por_token(token, db)


def usuario_autenticado_opcional(authorization: str | None = Header(default=None), db: Session = Depends(get_db)):
    token = token_bearer(authorization)
    return _por_token(token, db) if token else None


def roles_requeridos(*roles: str):
    """Dependencia: exige sesión real y uno de los roles indicados (401 / 403)."""
    def verificar(usuario=Depends(usuario_autenticado)):
        if usuario.rol not in roles:
            raise HTTPException(403, "Tu cuenta no tiene permiso para esta acción")
        return usuario
    return verificar


def es_editor(usuario) -> bool:
    return usuario is not None and usuario.rol in ("administrador", "organizador")


def puede_modificar(usuario, autor_usuario_id: int) -> bool:
    # Dirección modifica cualquier comunicado; el personal, solo los suyos.
    return usuario.rol == "administrador" or usuario.id == autor_usuario_id


# HU-21: publicar y editar comunicados (dirección o personal del jardín).
def editor_requerido(usuario=Depends(usuario_opcional)):
    if usuario is None:
        raise HTTPException(401, "Debe identificarse con el encabezado X-Usuario-Id")
    if not es_editor(usuario):
        raise HTTPException(403, "Solo dirección y el personal del jardín pueden publicar comunicados")
    return usuario


# HU-25: revisar solicitudes de pre-matrícula (solo dirección: tienen datos de contacto).
def direccion_requerida(usuario=Depends(usuario_opcional)):
    if usuario is None:
        raise HTTPException(401, "Debe identificarse con el encabezado X-Usuario-Id")
    if usuario.rol != "administrador":
        raise HTTPException(403, "Solo dirección puede revisar las solicitudes de pre-matrícula")
    return usuario


# Remediación postauditoría · corrección DEFINITIVA PROPUESTA (no aplicada) para las rutas
# heredadas HU-17/18/20/27: entrega el rol con los nombres que esperan app/services/eventos.py
# y documentos.py, tomado del token y no del navegador. Ver
# docs/sprint3/daniel/remediacion/PROPUESTA_X_ROL_RUTAS_HEREDADAS.patch
def rol_de_sesion(usuario=Depends(usuario_autenticado)) -> str:
    return {"administrador": "direccion"}.get(usuario.rol, usuario.rol)


# ---------------------------------------------------------------------------
# Cierre de H-01/H-02/H-03 (rutas heredadas HU-17/18/19/20/27, TEC-16, académico).
# Identidad = token Bearer o, SOLO con la identidad demo activa (development/test), X-Usuario-Id
# de una cuenta ficticia. En staging/production solo vale el token.
# ---------------------------------------------------------------------------

PERSONAL = ("administrador", "organizador")
ROL_EN_SERVICIOS_HEREDADOS = {"administrador": "direccion", "organizador": "organizador", "apoderado": "apoderado"}


def usuario_requerido(usuario=Depends(usuario_opcional)):
    if usuario is None:
        raise HTTPException(401, "Debes iniciar sesión", headers={"WWW-Authenticate": "Bearer"})
    return usuario


def requiere_roles(*roles: str):
    """Como roles_requeridos, pero acepta también la identidad demo cuando está activa."""
    def verificar(usuario=Depends(usuario_requerido)):
        if usuario.rol not in roles:
            raise HTTPException(403, "Tu cuenta no tiene permiso para esta acción")
        return usuario
    return verificar


def rol_heredado(usuario=Depends(usuario_requerido)) -> str:
    """H-01/H-03: el rol que esperan app/services/eventos.py y documentos.py sale de la sesión,
    nunca del encabezado X-Rol que manda el navegador."""
    return ROL_EN_SERVICIOS_HEREDADOS.get(usuario.rol, usuario.rol)


def es_personal(usuario) -> bool:
    return usuario is not None and usuario.rol in PERSONAL


def apoderado_de_la_peticion(usuario, apoderado_id_enviado: int | None) -> int:
    """H-02: el apoderado de una inscripción, cancelación o pago sale del token.
    - Cuenta de apoderado: si el cuerpo trae otro apoderado_id -> 403.
    - Personal del jardín: puede actuar por un apoderado, indicándolo explícitamente."""
    if usuario.rol == "apoderado":
        if apoderado_id_enviado is not None and apoderado_id_enviado != usuario.apoderado_id:
            raise HTTPException(403, "No puedes actuar en nombre de otro apoderado")
        return usuario.apoderado_id
    if not es_personal(usuario):
        raise HTTPException(403, "Tu cuenta no tiene permiso para esta acción")
    if apoderado_id_enviado is None:
        raise HTTPException(400, "Indica el apoderado (apoderado_id) para registrar en su nombre")
    return apoderado_id_enviado


def exigir_propietario_o_personal(usuario, apoderado_id: int):
    if es_personal(usuario):
        return
    if usuario.rol == "apoderado" and usuario.apoderado_id == apoderado_id:
        return
    raise HTTPException(403, "No tienes acceso a la información de otro apoderado")
