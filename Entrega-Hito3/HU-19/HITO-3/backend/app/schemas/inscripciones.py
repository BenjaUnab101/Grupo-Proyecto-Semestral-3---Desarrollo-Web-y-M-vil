from datetime import date, datetime, time
from typing import Literal

from pydantic import BaseModel, Field

# HU-19: datos que entran y salen de la API de eventos e inscripciones.

EstadoInscripcion = Literal["inscrita", "cancelada"]


# ---------- Eventos ----------


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
    inscritos: int
    cupos_disponibles: int


# ---------- Inscripciones ----------


class InscripcionIn(BaseModel):
    alumno_id: int = Field(gt=0)
    apoderado_id: int = Field(gt=0)


class CancelacionIn(BaseModel):
    apoderado_id: int = Field(gt=0)


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
