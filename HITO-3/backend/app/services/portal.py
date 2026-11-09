"""HU-16 (Sprint 3 · Daniel) · Portal de apoderados: hijos y ficha según la relación SQL.

La autorización se decide AQUÍ (servidor), no en React:
  - solo cuentas con rol apoderado entran al portal (otras: 403);
  - un apoderado solo ve los alumnos ligados a él en apoderados_alumnos;
  - pedir la ficha de un alumno ajeno responde 403 (sin revelar si el alumno existe) y queda
    registrado en la bitácora de auditoría (IDOR bloqueado).
"""

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Actividad, Alumno, Apoderado, ApoderadoAlumno, Inscripcion, Matricula, Organizador, Sala, Usuario
from app.services import auditoria


def nombre_de(db: Session, usuario: Usuario) -> str:
    if usuario.apoderado_id:
        return db.get(Apoderado, usuario.apoderado_id).nombre
    organizador = db.scalar(select(Organizador).where(Organizador.email == usuario.email))
    return organizador.nombre if organizador else "Dirección"


def hijos_de(db: Session, apoderado_id: int | None):
    if not apoderado_id:
        return []
    return db.execute(
        select(Alumno, ApoderadoAlumno.parentesco)
        .join(ApoderadoAlumno, ApoderadoAlumno.alumno_id == Alumno.id)
        .where(ApoderadoAlumno.apoderado_id == apoderado_id, Alumno.activo.is_(True))
        .order_by(Alumno.nombre, Alumno.id)
    ).all()


def perfil(db: Session, usuario: Usuario) -> dict:
    return {
        "usuario_id": usuario.id,
        "email": usuario.email,
        "rol": usuario.rol,
        "nombre": nombre_de(db, usuario),
        "apoderado_id": usuario.apoderado_id,
        "hijos": [{"id": a.id, "codigo": a.codigo, "nombre": a.nombre} for a, _ in hijos_de(db, usuario.apoderado_id)],
    }


def _matricula_actual(db: Session, alumno_id: int):
    return db.execute(
        select(Matricula, Sala)
        .join(Sala, Sala.id == Matricula.sala_id)
        .where(Matricula.alumno_id == alumno_id, Matricula.estado != "anulada")
        .order_by(Matricula.anio_escolar.desc())
        .limit(1)
    ).first()


def _exigir_apoderado(usuario: Usuario):
    if usuario.rol != "apoderado" or not usuario.apoderado_id:
        raise HTTPException(403, "El portal de familias es solo para cuentas de apoderado")


def listar_alumnos(db: Session, usuario: Usuario) -> list[dict]:
    _exigir_apoderado(usuario)
    resultado = []
    for alumno, parentesco in hijos_de(db, usuario.apoderado_id):
        fila = _matricula_actual(db, alumno.id)
        sala = fila[1] if fila else None
        resultado.append({
            "id": alumno.id, "codigo": alumno.codigo, "nombre": alumno.nombre, "parentesco": parentesco,
            "sala": sala.nombre if sala else None, "nivel": sala.nivel if sala else None,
        })
    return resultado


def ficha_alumno(db: Session, usuario: Usuario, alumno_id: int) -> dict:
    _exigir_apoderado(usuario)
    relacion = db.get(ApoderadoAlumno, (usuario.apoderado_id, alumno_id))
    alumno = db.get(Alumno, alumno_id) if relacion else None
    if not relacion or not alumno or not alumno.activo:
        auditoria.registrar("acceso_denegado", "denegado", actor=usuario, recurso_tipo="alumno", recurso_id=alumno_id)
        raise HTTPException(403, "No tienes acceso a la ficha de este alumno")

    fila = _matricula_actual(db, alumno_id)
    matricula, sala = fila if fila else (None, None)
    inscripciones = db.execute(
        select(Inscripcion.actividad_id, Actividad.titulo, Actividad.fecha, Inscripcion.estado)
        .join(Actividad, Actividad.id == Inscripcion.actividad_id)
        .where(Inscripcion.alumno_id == alumno_id)
        .order_by(Actividad.fecha)
    ).all()
    return {
        "id": alumno.id, "codigo": alumno.codigo, "nombre": alumno.nombre, "parentesco": relacion.parentesco,
        "sala": sala.nombre if sala else None, "nivel": sala.nivel if sala else None,
        "anio_escolar": matricula.anio_escolar if matricula else None,
        "estado_matricula": matricula.estado if matricula else None,
        "inscripciones": [
            {"actividad_id": i.actividad_id, "titulo": i.titulo, "fecha": i.fecha.isoformat(), "estado": i.estado}
            for i in inscripciones
        ],
    }
