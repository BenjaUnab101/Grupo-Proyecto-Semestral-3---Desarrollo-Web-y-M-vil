from datetime import datetime, timezone
from uuid import uuid4
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.models import ActividadEscolar, CategoriaActividad, InscripcionPago, Organizador
from app.schemas.eventos import (
    ActividadEscolarIn,
    ActividadEscolarUpdate,
    CategoriaActividadIn,
    CategoriaActividadUpdate,
    OrganizadorIn,
    OrganizadorUpdate,
    PagoEstadoUpdate,
    PagoInscripcionIn,
)

ROLES_GESTION_EVENTOS = {
    "direccion",
    "dirección",
    "organizador",
    "educadora",
    "fonoaudióloga",
    "fonoaudiologa",
    "coordinación",
    "coordinacion",
}

TRANSICIONES_PAGO_AUTORIZADAS: dict[str, set[str]] = {
    "pendiente": {"pagado", "confirmado", "cancelado"},
    "pagado": {"confirmado", "cancelado"},
    "confirmado": {"cancelado"},
    "cancelado": set(),
}


def verificar_permiso_direccion(rol: str | None):
    if not rol or rol.strip().lower() not in ("direccion", "dirección"):
        raise HTTPException(
            status_code=403,
            detail="Permiso denegado: solo la dirección puede gestionar organizadores y categorías",
        )


def verificar_permiso_organizador(rol: str | None):
    if not rol or rol.strip().lower() not in ROLES_GESTION_EVENTOS:
        raise HTTPException(
            status_code=403,
            detail="Permiso denegado: se requiere perfil de organizador o dirección para gestionar actividades",
        )


def listar_categorias(db: Session, solo_activas: bool = False):
    stmt = select(CategoriaActividad)
    if solo_activas:
        stmt = stmt.where(CategoriaActividad.activa.is_(True))
    return db.scalars(stmt.order_by(CategoriaActividad.nombre)).all()


def crear_categoria(db: Session, payload: CategoriaActividadIn, rol: str | None):
    verificar_permiso_direccion(rol)
    nueva = CategoriaActividad(
        nombre=payload.nombre.strip(),
        descripcion=payload.descripcion.strip() if payload.descripcion else None,
        activa=payload.activa,
    )
    db.add(nueva)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Ya existe una categoría de actividad con ese nombre",
        )
    db.refresh(nueva)
    return nueva


def actualizar_categoria(
    db: Session, categoria_id: int, payload: CategoriaActividadUpdate, rol: str | None
):
    verificar_permiso_direccion(rol)
    categoria = db.get(CategoriaActividad, categoria_id)
    if not categoria:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")

    datos = payload.model_dump(exclude_unset=True)
    if "nombre" in datos and datos["nombre"]:
        datos["nombre"] = datos["nombre"].strip()
    for campo, valor in datos.items():
        setattr(categoria, campo, valor)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Conflicto: el nombre de categoría ya está registrado",
        )
    db.refresh(categoria)
    return categoria


def listar_organizadores(db: Session, solo_activos: bool = False):
    stmt = select(Organizador)
    if solo_activos:
        stmt = stmt.where(Organizador.activo.is_(True))
    return db.scalars(stmt.order_by(Organizador.nombre)).all()


def crear_organizador(db: Session, payload: OrganizadorIn, rol: str | None):
    verificar_permiso_direccion(rol)
    nuevo = Organizador(
        nombre=payload.nombre.strip(),
        email=payload.email.lower().strip(),
        rol_perfil=payload.rol_perfil,
        telefono=payload.telefono.strip() if payload.telefono else None,
        activo=payload.activo,
    )
    db.add(nuevo)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Ya existe un organizador registrado con ese correo electrónico",
        )
    db.refresh(nuevo)
    return nuevo


def actualizar_organizador(
    db: Session, organizador_id: int, payload: OrganizadorUpdate, rol: str | None
):
    verificar_permiso_direccion(rol)
    organizador = db.get(Organizador, organizador_id)
    if not organizador:
        raise HTTPException(status_code=404, detail="Organizador no encontrado")

    datos = payload.model_dump(exclude_unset=True)
    if "nombre" in datos and datos["nombre"]:
        datos["nombre"] = datos["nombre"].strip()
    if "email" in datos and datos["email"]:
        datos["email"] = datos["email"].lower().strip()
    for campo, valor in datos.items():
        setattr(organizador, campo, valor)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Conflicto: el correo electrónico ya pertenece a otro organizador",
        )
    db.refresh(organizador)
    return organizador


def serializar_actividad(act: ActividadEscolar) -> dict:
    cupos_disp = max(0, act.capacidad - act.cupos_ocupados)
    return {
        "id": act.id,
        "titulo": act.titulo,
        "fecha": act.fecha,
        "hora": act.hora,
        "lugar": act.lugar,
        "preparar": act.preparar,
        "capacidad": act.capacidad,
        "cupos_ocupados": act.cupos_ocupados,
        "cupos_disponibles": cupos_disp,
        "estado": act.estado,
        "categoria_id": act.categoria_id,
        "categoria_nombre": act.categoria.nombre if act.categoria else "",
        "organizador_id": act.organizador_id,
        "organizador_nombre": act.organizador.nombre if act.organizador else "",
    }


def _validar_referencias_actividad(db: Session, categoria_id: int, organizador_id: int):
    categoria = db.get(CategoriaActividad, categoria_id)
    if not categoria or not categoria.activa:
        raise HTTPException(
            status_code=404,
            detail="Categoría de actividad no encontrada o inactiva",
        )
    organizador = db.get(Organizador, organizador_id)
    if not organizador or not organizador.activo:
        raise HTTPException(
            status_code=404,
            detail="Organizador no encontrado o inactivo",
        )


def listar_actividades(
    db: Session,
    solo_publicadas: bool = True,
    categoria_id: int | None = None,
):
    stmt = select(ActividadEscolar)
    if solo_publicadas:
        stmt = stmt.where(ActividadEscolar.estado == "publicada")
    if categoria_id is not None:
        stmt = stmt.where(ActividadEscolar.categoria_id == categoria_id)

    actividades = db.scalars(
        stmt.order_by(ActividadEscolar.fecha.asc(), ActividadEscolar.id.asc())
    ).all()
    return [serializar_actividad(a) for a in actividades]


def crear_actividad(db: Session, payload: ActividadEscolarIn, rol: str | None):
    verificar_permiso_organizador(rol)
    _validar_referencias_actividad(db, payload.categoria_id, payload.organizador_id)

    nueva = ActividadEscolar(
        titulo=payload.titulo.strip(),
        fecha=payload.fecha,
        hora=payload.hora,
        lugar=payload.lugar.strip(),
        preparar=payload.preparar.strip() if payload.preparar else None,
        capacidad=payload.capacidad,
        cupos_ocupados=0,
        estado=payload.estado,
        categoria_id=payload.categoria_id,
        organizador_id=payload.organizador_id,
    )
    db.add(nueva)
    db.commit()
    db.refresh(nueva)
    return serializar_actividad(nueva)


def actualizar_actividad(
    db: Session, actividad_id: int, payload: ActividadEscolarUpdate, rol: str | None
):
    verificar_permiso_organizador(rol)
    actividad = db.get(ActividadEscolar, actividad_id)
    if not actividad:
        raise HTTPException(status_code=404, detail="Actividad escolar no encontrada")

    datos = payload.model_dump(exclude_unset=True)

    nueva_cat = datos.get("categoria_id", actividad.categoria_id)
    nuevo_org = datos.get("organizador_id", actividad.organizador_id)
    if "categoria_id" in datos or "organizador_id" in datos:
        _validar_referencias_actividad(db, nueva_cat, nuevo_org)

    if "capacidad" in datos and datos["capacidad"] is not None:
        if datos["capacidad"] < actividad.cupos_ocupados:
            raise HTTPException(
                status_code=409,
                detail="La nueva capacidad no puede ser menor a los cupos ya ocupados",
            )

    if "titulo" in datos and datos["titulo"]:
        datos["titulo"] = datos["titulo"].strip()
    if "lugar" in datos and datos["lugar"]:
        datos["lugar"] = datos["lugar"].strip()

    for campo, valor in datos.items():
        setattr(actividad, campo, valor)

    db.commit()
    db.refresh(actividad)
    return serializar_actividad(actividad)


def publicar_actividad(db: Session, actividad_id: int, rol: str | None):
    verificar_permiso_organizador(rol)
    actividad = db.get(ActividadEscolar, actividad_id)
    if not actividad:
        raise HTTPException(status_code=404, detail="Actividad escolar no encontrada")
    if actividad.estado == "cancelada":
        raise HTTPException(
            status_code=409,
            detail="No se puede publicar una actividad que fue cancelada",
        )
    actividad.estado = "publicada"
    db.commit()
    db.refresh(actividad)
    return serializar_actividad(actividad)


def cancelar_actividad(db: Session, actividad_id: int, rol: str | None):
    verificar_permiso_organizador(rol)
    actividad = db.get(ActividadEscolar, actividad_id)
    if not actividad:
        raise HTTPException(status_code=404, detail="Actividad escolar no encontrada")
    actividad.estado = "cancelada"
    db.commit()
    db.refresh(actividad)
    return serializar_actividad(actividad)


def serializar_pago(pago: InscripcionPago) -> dict:
    return {
        "id": pago.id,
        "codigo_comprobante": pago.codigo_comprobante,
        "actividad_id": pago.actividad_id,
        "actividad_titulo": pago.actividad.titulo if pago.actividad else "",
        "apoderado_rut": pago.apoderado_rut,
        "nombre_parvulo": pago.nombre_parvulo,
        "monto": pago.monto,
        "metodo_pago": pago.metodo_pago,
        "estado_pago": pago.estado_pago,
        "fecha_transaccion": pago.fecha_transaccion,
        "es_simulado": True,
    }


def registrar_pago_actividad(
    db: Session,
    payload: PagoInscripcionIn,
    usuario_id: int | None = None,
):
    actividad = db.get(ActividadEscolar, payload.actividad_id)
    if not actividad or actividad.estado != "publicada":
        raise HTTPException(
            status_code=404,
            detail="Actividad escolar no encontrada o no está publicada para inscripciones",
        )

    if actividad.cupos_ocupados >= actividad.capacidad:
        raise HTTPException(
            status_code=409,
            detail="La actividad se encuentra sin cupos disponibles",
        )

    sufijo = uuid4().hex[:6].upper()
    fecha_str = datetime.now(timezone.utc).strftime("%Y%m%d")
    codigo_comp = f"PR-COMP-{fecha_str}-{sufijo}"

    estado_inicial = payload.estado_pago if payload.estado_pago != "cancelado" else "pendiente"

    campos_pago = {
        "codigo_comprobante": codigo_comp,
        "actividad_id": payload.actividad_id,
        "apoderado_rut": payload.apoderado_rut.strip(),
        "nombre_parvulo": payload.nombre_parvulo.strip(),
        "monto": payload.monto,
        "metodo_pago": payload.metodo_pago.strip(),
        "estado_pago": estado_inicial,
    }
    if hasattr(InscripcionPago, "usuario_id"):
        campos_pago["usuario_id"] = usuario_id

    nuevo_pago = InscripcionPago(**campos_pago)

    actividad.cupos_ocupados += 1
    db.add(nuevo_pago)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Conflicto al generar el comprobante de pago simulado",
        )

    db.refresh(nuevo_pago)
    return serializar_pago(nuevo_pago)


def listar_pagos_actividad(
    db: Session,
    actividad_id: int | None = None,
    apoderado_rut: str | None = None,
):
    stmt = select(InscripcionPago)
    if actividad_id is not None:
        stmt = stmt.where(InscripcionPago.actividad_id == actividad_id)
    if apoderado_rut:
        stmt = stmt.where(InscripcionPago.apoderado_rut == apoderado_rut.strip())
    pagos = db.scalars(stmt.order_by(InscripcionPago.id.desc())).all()
    return [serializar_pago(p) for p in pagos]


def listar_pagos_de_usuario(db: Session, usuario_id: int):
    if not hasattr(InscripcionPago, "usuario_id"):
        return []
    stmt = select(InscripcionPago).where(InscripcionPago.usuario_id == usuario_id)
    pagos = db.scalars(stmt.order_by(InscripcionPago.id.desc())).all()
    return [serializar_pago(p) for p in pagos]


def obtener_comprobante_por_codigo(db: Session, codigo: str):
    pago = db.scalars(
        select(InscripcionPago).where(InscripcionPago.codigo_comprobante == codigo.strip())
    ).first()
    if not pago:
        raise HTTPException(status_code=404, detail="Comprobante de pago simulado no encontrado")
    return serializar_pago(pago)


def actualizar_estado_pago(db: Session, pago_id: int, payload: PagoEstadoUpdate):
    pago = db.get(InscripcionPago, pago_id)
    if not pago:
        raise HTTPException(status_code=404, detail="Registro de pago simulado no encontrado")

    estado_actual = pago.estado_pago
    nuevo_estado = payload.estado_pago

    if estado_actual == nuevo_estado:
        return serializar_pago(pago)

    permitidos = TRANSICIONES_PAGO_AUTORIZADAS.get(estado_actual, set())
    if nuevo_estado not in permitidos:
        raise HTTPException(
            status_code=409,
            detail=f"Transición de estado no autorizada: no se puede pasar de '{estado_actual}' a '{nuevo_estado}'",
        )

    if nuevo_estado == "cancelado" and pago.actividad:
        pago.actividad.cupos_ocupados = max(0, pago.actividad.cupos_ocupados - 1)

    pago.estado_pago = nuevo_estado
    db.commit()
    db.refresh(pago)
    return serializar_pago(pago)