from datetime import date, datetime, time
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

# HU-19 / TEC-16 / TEC-17: datos que entran y salen de la API de eventos, inscripciones y pagos.

EstadoInscripcion = Literal["inscrita", "cancelada"]


# ---------- Eventos ----------


class ActividadIn(BaseModel):
    codigo: str = Field(min_length=3, max_length=30, pattern=r"^[A-Z0-9-]+$")
    titulo: str = Field(min_length=3, max_length=160)
    descripcion: str | None = Field(default=None, max_length=2000)
    fecha: date
    hora: time | None = None
    lugar: str | None = Field(default=None, max_length=120)
    cupo_maximo: int = Field(gt=0, le=500)
    costo: int = Field(default=0, ge=0, le=1_000_000)
    inscripciones_abiertas: bool = True
    categoria_id: int | None = Field(default=None, gt=0)
    organizador_id: int | None = Field(default=None, gt=0)


class ActividadUpdate(BaseModel):
    # Todo opcional: solo se cambia lo que se envía. El código no se puede cambiar.
    titulo: str | None = Field(default=None, min_length=3, max_length=160)
    descripcion: str | None = Field(default=None, max_length=2000)
    fecha: date | None = None
    hora: time | None = None
    lugar: str | None = Field(default=None, max_length=120)
    cupo_maximo: int | None = Field(default=None, gt=0, le=500)
    costo: int | None = Field(default=None, ge=0, le=1_000_000)
    inscripciones_abiertas: bool | None = None
    categoria_id: int | None = Field(default=None, gt=0)
    organizador_id: int | None = Field(default=None, gt=0)


class ActividadOut(BaseModel):
    id: int
    codigo: str
    titulo: str
    descripcion: str | None
    fecha: date
    hora: time | None
    lugar: str | None
    cupo_maximo: int
    inscripciones_abiertas: bool
    categoria_id: int | None
    organizador_id: int | None
    costo: int
    inscritos: int
    cupos_disponibles: int


# ---------- Inscripciones ----------


class InscripcionIn(BaseModel):
    alumno_id: int = Field(gt=0)
    # H-02: opcional. Para un apoderado se toma del token; el personal lo indica para actuar en su nombre.
    apoderado_id: int | None = Field(default=None, gt=0)


class CancelacionIn(BaseModel):
    apoderado_id: int | None = Field(default=None, gt=0)  # H-02: ver InscripcionIn


class InscripcionOut(BaseModel):
    id: int
    actividad_id: int
    alumno_id: int
    apoderado_id: int
    estado: EstadoInscripcion
    creada_en: datetime
    actualizada_en: datetime
    cancelada_en: datetime | None
    cupos_disponibles: int


class InscripcionApoderadoOut(BaseModel):
    id: int
    actividad_id: int
    alumno_id: int
    alumno_nombre: str
    estado: EstadoInscripcion
    creada_en: datetime
    cancelada_en: datetime | None


class AsistenteOut(BaseModel):
    inscripcion_id: int
    alumno_id: int
    alumno_codigo: str
    alumno_nombre: str
    estado: EstadoInscripcion
    creada_en: datetime
    cancelada_en: datetime | None


class AsistentesOut(BaseModel):
    actividad: ActividadOut
    total_inscritos: int
    total_cancelados: int
    asistentes: list[AsistenteOut]


# ---------- Pagos ficticios ----------


class PagoIn(BaseModel):
    apoderado_id: int | None = Field(default=None, gt=0)  # H-02: ver InscripcionIn


class PagoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    inscripcion_id: int
    monto: int
    moneda: str
    metodo: str
    estado: str
    referencia: str
    creado_en: datetime
    actualizado_en: datetime
