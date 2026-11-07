from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.postgres import get_db
from app.schemas.catalogo import (
    CategoriaIn,
    CategoriaOut,
    InstitucionOut,
    OrganizadorIn,
    OrganizadorOut,
)
from app.services import catalogo as servicio

# TEC-16: categorías, organizadores y datos institucionales del jardín.
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
def crear_categoria(payload: CategoriaIn, db: Session = Depends(get_db)):
    return servicio.crear_categoria(db, payload)


@router.get("/organizadores", response_model=list[OrganizadorOut], summary="Listar organizadores")
def listar_organizadores(activos: bool = True, db: Session = Depends(get_db)):
    return servicio.listar_organizadores(db, activos)


@router.post(
    "/organizadores",
    response_model=OrganizadorOut,
    status_code=status.HTTP_201_CREATED,
    summary="Crear un organizador",
)
def crear_organizador(payload: OrganizadorIn, db: Session = Depends(get_db)):
    return servicio.crear_organizador(db, payload)
