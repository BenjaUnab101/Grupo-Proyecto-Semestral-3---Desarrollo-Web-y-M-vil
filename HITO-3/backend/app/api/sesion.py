from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.permisos import usuario_opcional
from app.db.models import Alumno, Apoderado, ApoderadoAlumno, Organizador, Usuario
from app.db.postgres import get_db

# TEC-17: sesión DEMO para React. Como aún no hay login, React muestra las cuentas
# ficticias (@ejemplo.cl), quien prueba elige una y React envía su id en X-Usuario-Id.
# Los permisos los sigue decidiendo el backend en cada endpoint.
router = APIRouter(prefix="/sesion", tags=["sesion"])


def nombre_de(db: Session, usuario: Usuario) -> str:
    if usuario.apoderado_id:
        return db.get(Apoderado, usuario.apoderado_id).nombre
    organizador = db.scalar(select(Organizador).where(Organizador.email == usuario.email))
    if organizador:
        return organizador.nombre
    return "Dirección"


@router.get("/cuentas-demo", summary="Cuentas ficticias para probar la demo")
def cuentas_demo(db: Session = Depends(get_db)):
    # H-02: la lista de cuentas demo solo existe con la identidad demo activa (development/test).
    if not settings.identidad_demo_activa:
        raise HTTPException(404, "No disponible")
    usuarios = db.scalars(
        select(Usuario).where(Usuario.activo.is_(True), Usuario.email.like("%@ejemplo.cl")).order_by(Usuario.rol, Usuario.email)
    )
    return [{"usuario_id": u.id, "email": u.email, "rol": u.rol, "nombre": nombre_de(db, u)} for u in usuarios]


@router.get("/yo", summary="Perfil de la cuenta enviada en X-Usuario-Id")
def perfil(usuario=Depends(usuario_opcional), db: Session = Depends(get_db)):
    if usuario is None:
        raise HTTPException(401, "Debe identificarse con el encabezado X-Usuario-Id")
    hijos = []
    if usuario.apoderado_id:
        hijos = db.scalars(
            select(Alumno)
            .join(ApoderadoAlumno, ApoderadoAlumno.alumno_id == Alumno.id)
            .where(ApoderadoAlumno.apoderado_id == usuario.apoderado_id, Alumno.activo.is_(True))
            .order_by(Alumno.nombre)
        ).all()
    return {
        "usuario_id": usuario.id,
        "email": usuario.email,
        "rol": usuario.rol,
        "nombre": nombre_de(db, usuario),
        "apoderado_id": usuario.apoderado_id,
        "hijos": [{"id": h.id, "codigo": h.codigo, "nombre": h.nombre} for h in hijos],
    }
