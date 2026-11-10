"""HU-24 (Sprint 3 · Daniel) · Panel de asistentes e indicadores de participación.

Indicadores calculados con AGREGACIONES SQL sobre las tablas reales de HU-19 (actividades e
inscripciones). LEFT JOIN: las actividades sin inscripciones aparecen con 0.
El historial viene de la bitácora MongoDB de HU-22 (eventos inscripcion_creada / _cancelada).
"""

from fastapi import HTTPException
from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from app.db.models import Actividad, Inscripcion
from app.services import auditoria


def _pct(parte: int, total: int) -> float:
    return round(100 * parte / total, 1) if total else 0.0


def _estado(inscritos: int, cupo: int) -> str:
    if inscritos == 0:
        return "sin_inscritos"
    return "completa" if inscritos >= cupo else "con_cupos"


def indicadores(db: Session, actividad_id=None, desde=None, hasta=None) -> dict:
    if desde and hasta and desde > hasta:
        raise HTTPException(400, "La fecha 'desde' no puede ser posterior a 'hasta'")
    inscritos = func.coalesce(func.sum(case((Inscripcion.estado == "inscrita", 1), else_=0)), 0)
    cancelados = func.coalesce(func.sum(case((Inscripcion.estado == "cancelada", 1), else_=0)), 0)
    consulta = (
        select(Actividad.id, Actividad.codigo, Actividad.titulo, Actividad.fecha, Actividad.cupo_maximo,
               Actividad.inscripciones_abiertas, inscritos.label("inscritos"), cancelados.label("cancelados"))
        .outerjoin(Inscripcion, Inscripcion.actividad_id == Actividad.id)
        .group_by(Actividad.id)
        .order_by(Actividad.fecha, Actividad.id)
    )
    if actividad_id is not None:
        if not db.get(Actividad, actividad_id):
            raise HTTPException(404, "Actividad no encontrada")
        consulta = consulta.where(Actividad.id == actividad_id)
    if desde:
        consulta = consulta.where(Actividad.fecha >= desde)
    if hasta:
        consulta = consulta.where(Actividad.fecha <= hasta)

    filas = db.execute(consulta).all()
    actividades = [{
        "id": f.id, "codigo": f.codigo, "titulo": f.titulo, "fecha": f.fecha, "cupo_maximo": f.cupo_maximo,
        "inscripciones_abiertas": f.inscripciones_abiertas, "inscritos": int(f.inscritos), "cancelados": int(f.cancelados),
        "cupos_disponibles": max(f.cupo_maximo - int(f.inscritos), 0),
        "ocupacion_pct": _pct(int(f.inscritos), f.cupo_maximo),
        "estado_participacion": _estado(int(f.inscritos), f.cupo_maximo),
    } for f in filas]

    cupo_total = sum(a["cupo_maximo"] for a in actividades)
    total_inscritos = sum(a["inscritos"] for a in actividades)
    return {
        "filtros": {"actividad_id": actividad_id, "desde": desde, "hasta": hasta},
        "totales": {
            "actividades": len(actividades),
            "sin_inscritos": sum(1 for a in actividades if a["estado_participacion"] == "sin_inscritos"),
            "completas": sum(1 for a in actividades if a["estado_participacion"] == "completa"),
            "cupo_total": cupo_total,
            "inscritos": total_inscritos,
            "cancelados": sum(a["cancelados"] for a in actividades),
            "ocupacion_pct": _pct(total_inscritos, cupo_total),
        },
        "actividades": actividades,
    }


def historial(db: Session, actividad_id=None, desde=None, hasta=None, pagina: int = 1, tamano: int = 20) -> dict:
    if actividad_id is not None and not db.get(Actividad, actividad_id):
        raise HTTPException(404, "Actividad no encontrada")
    return auditoria.consultar(
        tipos=("inscripcion_creada", "inscripcion_cancelada"),
        recurso_tipo="actividad" if actividad_id is not None else None,
        recurso_id=actividad_id, desde=desde, hasta=hasta, pagina=pagina, tamano=tamano,
    )
