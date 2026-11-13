from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.permisos import requiere_roles
from app.db.postgres import get_db
from app.schemas.catalogo import (
    CategoriaIn,
    CategoriaOut,
    CupoSalaOut,
    InstitucionOut,
)
from app.services import catalogo as servicio

# TEC-16: categorías de eventos y datos institucionales del jardín. TEC-17: cupos por sala.
# (Los organizadores son de HU-17: app/api/eventos.py.)
router = APIRouter(tags=["catalogo"])


@router.get("/institucion", response_model=InstitucionOut, summary="Datos institucionales del jardín")
def obtener_institucion(db: Session = Depends(get_db)):
    return servicio.obtener_institucion(db)


@router.get("/categorias", response_model=list[CategoriaOut], summary="Listar categorías de actividades")
def listar_categorias(db: Session = Depends(get_db)):
    return servicio.listar_categorias(db)


@router.post(
    "/categorias",
    response_model=CategoriaOut,
    status_code=status.HTTP_201_CREATED,
    summary="Crear una categoría",
)
def crear_categoria(payload: CategoriaIn, usuario=Depends(requiere_roles("administrador")), db: Session = Depends(get_db)):  # H-02
    return servicio.crear_categoria(db, payload)


@router.get("/salas/cupos", response_model=list[CupoSalaOut], summary="Cupos por sala (matriculados calculados en SQL)")
def cupos_por_sala(
    anio: int | None = Query(default=None, ge=2020, le=2100, description="Año escolar (por defecto, el actual)"),
    db: Session = Depends(get_db),
):
    return servicio.cupos_por_sala(db, anio)
