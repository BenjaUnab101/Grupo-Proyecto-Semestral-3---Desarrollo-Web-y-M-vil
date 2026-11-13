from fastapi import APIRouter, Depends, Header, HTTPException, Path, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models import Usuario

from app.core.permisos import token_bearer, usuario_autenticado
from app.db.postgres import get_db
from app.schemas.auth import AlumnoPortalOut, CuentasPruebaOut, FichaAlumnoOut, LoginIn, LoginOut, PerfilOut
from app.services import auth as servicio
from app.services import portal

# HU-16 (Sprint 3 · Daniel): inicio de sesión real y portal de apoderados.
router = APIRouter(tags=["autenticacion"])


@router.post(
    "/auth/login",
    response_model=LoginOut,
    summary="Iniciar sesión (email + contraseña)",
    responses={401: {"description": "Correo o contraseña incorrectos"}},
)
def login(datos: LoginIn, db: Session = Depends(get_db)):
    resultado = servicio.iniciar_sesion(db, datos.email, datos.password)
    return {**resultado, "perfil": portal.perfil(db, resultado["usuario"])}


@router.get(
    "/auth/cuentas-prueba",
    response_model=CuentasPruebaOut,
    summary="Cuentas ficticias para iniciar sesión (solo development/test)",
    responses={404: {"description": "No disponible fuera de development/test"}},
)
def cuentas_prueba(db: Session = Depends(get_db)):
    if not settings.es_entorno_de_desarrollo:
        raise HTTPException(404, "No disponible")
    usuarios = db.scalars(
        select(Usuario)
        .where(Usuario.activo.is_(True), Usuario.email.like("%" + servicio.DOMINIO_DEMO))
        .order_by(Usuario.rol, Usuario.email)
    ).all()
    return {
        "clave_configurada": bool(settings.demo_password),
        "cuentas": [{"email": u.email, "rol": u.rol, "nombre": portal.nombre_de(db, u)} for u in usuarios],
    }


@router.post("/auth/logout", status_code=204, summary="Cerrar sesión (revoca el token en el servidor)")
def logout(authorization: str | None = Header(default=None), usuario=Depends(usuario_autenticado), db: Session = Depends(get_db)):
    servicio.cerrar_sesion(db, token_bearer(authorization), usuario)
    return Response(status_code=204)


@router.get("/auth/yo", response_model=PerfilOut, summary="Perfil de la sesión actual")
def yo(usuario=Depends(usuario_autenticado), db: Session = Depends(get_db)):
    return portal.perfil(db, usuario)


@router.get("/portal/alumnos", response_model=list[AlumnoPortalOut], tags=["portal"], summary="Hijos del apoderado (relación SQL)")
def mis_alumnos(usuario=Depends(usuario_autenticado), db: Session = Depends(get_db)):
    return portal.listar_alumnos(db, usuario)


@router.get("/portal/alumnos/{alumno_id}", response_model=FichaAlumnoOut, tags=["portal"], summary="Ficha de un hijo (403 si no es suyo)")
def ficha(alumno_id: int = Path(gt=0), usuario=Depends(usuario_autenticado), db: Session = Depends(get_db)):
    return portal.ficha_alumno(db, usuario, alumno_id)