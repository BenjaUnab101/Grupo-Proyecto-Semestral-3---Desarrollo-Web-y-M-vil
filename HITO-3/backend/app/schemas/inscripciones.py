from datetime import date, datetime, time
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


# HU-19: esquemas de entrada y salida de actividades, inscripciones y asistentes.

EstadoInscripcion = Literal["inscrita", "cancelada"]


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


# ---------- TEC-16: CRUD de actividades (eventos) ----------


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

    @field_validator("titulo")
    @classmethod
    def titulo_sin_espacios_extremos(cls, valor: str) -> str:
        valor = valor.strip()
        if len(valor) < 3:
            raise ValueError("debe tener al menos 3 caracteres")
        return valor


class ActividadUpdate(BaseModel):
    # Todos opcionales: solo se cambia lo que se envía. El código no se puede cambiar.
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

    @model_validator(mode="after")
    def validar_cambios(self):
        if not self.model_fields_set:
            raise ValueError("Debe enviar al menos un campo para modificar")
        # Estos campos son obligatorios en la base: se pueden cambiar, pero no dejar en null.
        for campo in ("titulo", "fecha", "cupo_maximo", "costo", "inscripciones_abiertas"):
            if campo in self.model_fields_set and getattr(self, campo) is None:
                raise ValueError(f"El campo {campo} no puede ser null")
        if self.titulo is not None:
            self.titulo = self.titulo.strip()
            if len(self.titulo) < 3:
                raise ValueError("El título debe tener al menos 3 caracteres")
        return self


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
    model_config = ConfigDict(from_attributes=True)


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


# ---------- TEC-16: pagos FICTICIOS ----------


class PagoIn(BaseModel):
    apoderado_id: int = Field(gt=0)


class PagoOut(BaseModel):
    id: int
    inscripcion_id: int
    monto: int
    moneda: str
    metodo: str
    estado: str
    referencia: str
    creado_en: datetime
    actualizado_en: datetime
    model_config = ConfigDict(from_attributes=True)
