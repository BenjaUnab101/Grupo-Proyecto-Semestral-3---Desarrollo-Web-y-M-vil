from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.permisos import PERSONAL, requiere_roles, rol_heredado, usuario_requerido
from app.db.postgres import get_db
from app.schemas.eventos import (
    ActividadEscolarIn,
    ActividadEscolarOut,
    ActividadEscolarUpdate,
    CategoriaActividadIn,
    CategoriaActividadOut,
    CategoriaActividadUpdate,
    OrganizadorIn,
    OrganizadorOut,
    OrganizadorUpdate,
    PagoEstadoUpdate,
    PagoInscripcionIn,
    PagoInscripcionOut,
)
from app.services import eventos as servicio

router = APIRouter(tags=["eventos"])


@router.get("/categorias-actividad", response_model=list[CategoriaActividadOut])
def listar_categorias(
    solo_activas: bool = False,
    db: Session = Depends(get_db),
):
    return servicio.listar_categorias(db, solo_activas)


@router.post(
    "/categorias-actividad",
    response_model=CategoriaActividadOut,
    status_code=status.HTTP_201_CREATED,
)
def crear_categoria(
    payload: CategoriaActividadIn,
    x_rol: str = Depends(rol_heredado),  # H-01/H-03: rol desde la sesión, no del navegador
    db: Session = Depends(get_db),
):
    return servicio.crear_categoria(db, payload, x_rol)


@router.patch(
    "/categorias-actividad/{categoria_id}",
    response_model=CategoriaActividadOut,
)
def actualizar_categoria(
    categoria_id: int,
    payload: CategoriaActividadUpdate,
    x_rol: str = Depends(rol_heredado),  # H-01/H-03: rol desde la sesión, no del navegador
    db: Session = Depends(get_db),
):
    return servicio.actualizar_categoria(db, categoria_id, payload, x_rol)


@router.get("/organizadores", response_model=list[OrganizadorOut])
def listar_organizadores(
    solo_activos: bool = False,
    db: Session = Depends(get_db),
):
    return servicio.listar_organizadores(db, solo_activos)


@router.post(
    "/organizadores",
    response_model=OrganizadorOut,
    status_code=status.HTTP_201_CREATED,
)
def crear_organizador(
    payload: OrganizadorIn,
    x_rol: str = Depends(rol_heredado),  # H-01/H-03: rol desde la sesión, no del navegador
    db: Session = Depends(get_db),
):
    return servicio.crear_organizador(db, payload, x_rol)


@router.patch(
    "/organizadores/{organizador_id}",
    response_model=OrganizadorOut,
)
def actualizar_organizador(
    organizador_id: int,
    payload: OrganizadorUpdate,
    x_rol: str = Depends(rol_heredado),  # H-01/H-03: rol desde la sesión, no del navegador
    db: Session = Depends(get_db),
):
    return servicio.actualizar_organizador(db, organizador_id, payload, x_rol)


@router.get("/actividades", response_model=list[ActividadEscolarOut])
def listar_actividades(
    solo_publicadas: bool = True,
    categoria_id: int | None = Query(default=None, gt=0),
    db: Session = Depends(get_db),
):
    return servicio.listar_actividades(db, solo_publicadas, categoria_id)


@router.post(
    "/actividades",
    response_model=ActividadEscolarOut,
    status_code=status.HTTP_201_CREATED,
)
def crear_actividad(
    payload: ActividadEscolarIn,
    x_rol: str = Depends(rol_heredado),  # H-01/H-03: rol desde la sesión, no del navegador
    db: Session = Depends(get_db),
):
    return servicio.crear_actividad(db, payload, x_rol)


@router.patch(
    "/actividades/{actividad_id}",
    response_model=ActividadEscolarOut,
)
def actualizar_actividad(
    actividad_id: int,
    payload: ActividadEscolarUpdate,
    x_rol: str = Depends(rol_heredado),  # H-01/H-03: rol desde la sesión, no del navegador
    db: Session = Depends(get_db),
):
    return servicio.actualizar_actividad(db, actividad_id, payload, x_rol)


@router.post(
    "/actividades/{actividad_id}/publicar",
    response_model=ActividadEscolarOut,
)
def publicar_actividad(
    actividad_id: int,
    x_rol: str = Depends(rol_heredado),  # H-01/H-03: rol desde la sesión, no del navegador
    db: Session = Depends(get_db),
):
    return servicio.publicar_actividad(db, actividad_id, x_rol)


@router.post(
    "/actividades/{actividad_id}/cancelar",
    response_model=ActividadEscolarOut,
)
def cancelar_actividad(
    actividad_id: int,
    x_rol: str = Depends(rol_heredado),  # H-01/H-03: rol desde la sesión, no del navegador
    db: Session = Depends(get_db),
):
    return servicio.cancelar_actividad(db, actividad_id, x_rol)


@router.get("/pagos", response_model=list[PagoInscripcionOut])
def listar_pagos(
    actividad_id: int | None = Query(default=None, gt=0),
    apoderado_rut: str | None = Query(default=None, max_length=20),
    usuario=Depends(requiere_roles(*PERSONAL)),  # H-02: datos de pago (RUT, párvulo) solo para el personal
    db: Session = Depends(get_db),
):
    return servicio.listar_pagos_actividad(db, actividad_id, apoderado_rut)


@router.post(
    "/pagos",
    response_model=PagoInscripcionOut,
    status_code=status.HTTP_201_CREATED,
)
def registrar_pago(
    payload: PagoInscripcionIn,
    usuario=Depends(usuario_requerido),  # H-02: registrar un pago exige sesión
    db: Session = Depends(get_db),
):
    return servicio.registrar_pago_actividad(db, payload)


@router.get("/pagos/comprobante/{codigo}", response_model=PagoInscripcionOut)
def consultar_comprobante(
    codigo: str,
    usuario=Depends(usuario_requerido),  # H-02: consultar un comprobante exige sesión
    db: Session = Depends(get_db),
):
    return servicio.obtener_comprobante_por_codigo(db, codigo)


@router.patch("/pagos/{pago_id}/estado", response_model=PagoInscripcionOut)
def actualizar_estado_pago(
    pago_id: int,
    payload: PagoEstadoUpdate,
    usuario=Depends(requiere_roles("administrador")),  # H-02: solo dirección cambia el estado de un pago
    db: Session = Depends(get_db),
):
    return servicio.actualizar_estado_pago(db, pago_id, payload)
