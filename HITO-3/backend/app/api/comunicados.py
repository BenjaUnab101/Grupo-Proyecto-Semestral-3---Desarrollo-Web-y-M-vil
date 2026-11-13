from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends, Path, Query, Response
from sqlalchemy.orm import Session

from app.core.permisos import editor_requerido, exigir_propietario_o_personal, usuario_opcional, usuario_requerido
from app.db.postgres import get_db
from app.schemas.comunicado import (
    ComunicadoIn,
    ComunicadoOut,
    ComunicadosPertinentesOut,
    ComunicadoUpdate,
    EntradaBitacoraOut,
)
from app.services import comunicados as servicio

# HU-21: comunicados en PostgreSQL, con bitácora en MongoDB.
router = APIRouter(tags=["comunicados"])


@router.get("/comunicados", response_model=list[ComunicadoOut], summary="Listar y filtrar comunicados vigentes")
def listar_comunicados(
    nivel: Literal["Todos", "General", "Salas TEL", "Preescolar"] = "Todos",
    urgente: bool | None = None,
    desde: date | None = None,
    hasta: date | None = None,
    vigentes: bool = Query(default=True, description="false (borradores, programados, vencidos) solo para dirección y personal"),
    limite: int = Query(default=50, ge=1, le=100),
    desplazamiento: int = Query(default=0, ge=0),
    usuario=Depends(usuario_opcional),
    db: Session = Depends(get_db),
):
    return servicio.listar_comunicados(db, usuario, nivel, urgente, desde, hasta, vigentes, limite, desplazamiento)


@router.get("/comunicados/{comunicado_id}", response_model=ComunicadoOut, summary="Ver un comunicado")
def obtener_comunicado(comunicado_id: int = Path(gt=0), usuario=Depends(usuario_opcional), db: Session = Depends(get_db)):
    return servicio.obtener_comunicado(db, comunicado_id, usuario)


@router.get(
    "/apoderados/{apoderado_id}/comunicados",
    response_model=ComunicadosPertinentesOut,
    summary="Comunicados vigentes de un apoderado (General + niveles de sus hijos)",
)
def comunicados_pertinentes(apoderado_id: int = Path(gt=0), urgente: bool | None = None, usuario=Depends(usuario_requerido), db: Session = Depends(get_db)):
    exigir_propietario_o_personal(usuario, apoderado_id)  # H-02: solo el propio apoderado o el personal
    return servicio.comunicados_pertinentes(db, apoderado_id, urgente)


@router.post("/comunicados", response_model=ComunicadoOut, status_code=201, summary="Publicar (dirección o personal)")
def crear_comunicado(datos: ComunicadoIn, usuario=Depends(editor_requerido), db: Session = Depends(get_db)):
    return servicio.crear_comunicado(db, usuario, datos)


@router.patch("/comunicados/{comunicado_id}", response_model=ComunicadoOut, summary="Modificar (dirección o su autor)")
def actualizar_comunicado(
    datos: ComunicadoUpdate,
    comunicado_id: int = Path(gt=0),
    usuario=Depends(editor_requerido),
    db: Session = Depends(get_db),
):
    return servicio.actualizar_comunicado(db, usuario, comunicado_id, datos)


@router.delete("/comunicados/{comunicado_id}", status_code=204, summary="Eliminar (dirección o su autor)")
def eliminar_comunicado(comunicado_id: int = Path(gt=0), usuario=Depends(editor_requerido), db: Session = Depends(get_db)):
    servicio.eliminar_comunicado(db, usuario, comunicado_id)
    return Response(status_code=204)


@router.get(
    "/comunicados/{comunicado_id}/bitacora",
    response_model=list[EntradaBitacoraOut],
    summary="Historial de cambios del comunicado (MongoDB)",
)
def bitacora_comunicado(comunicado_id: int = Path(gt=0), usuario=Depends(editor_requerido), db: Session = Depends(get_db)):
    return servicio.bitacora_comunicado(db, comunicado_id)
