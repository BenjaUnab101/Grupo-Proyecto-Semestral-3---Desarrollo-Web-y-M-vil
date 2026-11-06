from datetime import date, datetime
from typing import Literal
from pydantic import BaseModel, ConfigDict, EmailStr, Field

RolPerfilType = Literal["Dirección", "Educadora", "Fonoaudióloga", "Coordinación"]
EstadoActividadType = Literal["borrador", "publicada", "cancelada"]
EstadoPagoType = Literal["pendiente", "pagado", "confirmado", "cancelado"]


class CategoriaActividadIn(BaseModel):
    nombre: str = Field(min_length=3, max_length=80)
    descripcion: str | None = Field(default=None, max_length=255)
    activa: bool = True


class CategoriaActividadUpdate(BaseModel):
    nombre: str | None = Field(default=None, min_length=3, max_length=80)
    descripcion: str | None = Field(default=None, max_length=255)
    activa: bool | None = None


class CategoriaActividadOut(BaseModel):
    id: int
    nombre: str
    descripcion: str | None
    activa: bool
    model_config = ConfigDict(from_attributes=True)


class OrganizadorIn(BaseModel):
    nombre: str = Field(min_length=3, max_length=120)
    email: EmailStr
    rol_perfil: RolPerfilType
    telefono: str | None = Field(default=None, max_length=30)
    activo: bool = True


class OrganizadorUpdate(BaseModel):
    nombre: str | None = Field(default=None, min_length=3, max_length=120)
    email: EmailStr | None = None
    rol_perfil: RolPerfilType | None = None
    telefono: str | None = Field(default=None, max_length=30)
    activo: bool | None = None


class OrganizadorOut(BaseModel):
    id: int
    nombre: str
    email: str
    rol_perfil: str
    telefono: str | None
    activo: bool
    model_config = ConfigDict(from_attributes=True)


class ActividadEscolarIn(BaseModel):
    titulo: str = Field(min_length=3, max_length=140)
    fecha: date
    hora: str | None = Field(default=None, pattern=r"^\d{2}:\d{2}$")
    lugar: str = Field(min_length=2, max_length=120)
    preparar: str | None = Field(default=None, max_length=255)
    capacidad: int = Field(gt=0, le=500)
    categoria_id: int = Field(gt=0)
    organizador_id: int = Field(gt=0)
    estado: EstadoActividadType = "borrador"


class ActividadEscolarUpdate(BaseModel):
    titulo: str | None = Field(default=None, min_length=3, max_length=140)
    fecha: date | None = None
    hora: str | None = Field(default=None, pattern=r"^\d{2}:\d{2}$")
    lugar: str | None = Field(default=None, min_length=2, max_length=120)
    preparar: str | None = Field(default=None, max_length=255)
    capacidad: int | None = Field(default=None, gt=0, le=500)
    categoria_id: int | None = Field(default=None, gt=0)
    organizador_id: int | None = Field(default=None, gt=0)
    estado: EstadoActividadType | None = None


class ActividadEscolarOut(BaseModel):
    id: int
    titulo: str
    fecha: date
    hora: str | None
    lugar: str
    preparar: str | None
    capacidad: int
    cupos_ocupados: int
    cupos_disponibles: int
    estado: str
    categoria_id: int
    categoria_nombre: str
    organizador_id: int
    organizador_nombre: str


class PagoInscripcionIn(BaseModel):
    actividad_id: int = Field(gt=0)
    apoderado_rut: str = Field(min_length=7, max_length=20)
    nombre_parvulo: str = Field(min_length=2, max_length=120)
    monto: int = Field(ge=0, le=500000)
    metodo_pago: str = Field(default="Transferencia Simulada", max_length=40)
    estado_pago: EstadoPagoType = "pagado"


class PagoEstadoUpdate(BaseModel):
    estado_pago: EstadoPagoType


class PagoInscripcionOut(BaseModel):
    id: int
    codigo_comprobante: str
    actividad_id: int
    actividad_titulo: str
    apoderado_rut: str
    nombre_parvulo: str
    monto: int
    metodo_pago: str
    estado_pago: str
    fecha_transaccion: datetime
    es_simulado: bool = True
    model_config = ConfigDict(from_attributes=True)
