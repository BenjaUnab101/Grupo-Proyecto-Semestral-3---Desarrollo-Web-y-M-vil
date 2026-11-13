from datetime import date
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from typing import Literal


class AlumnoOut(BaseModel):
    id: int
    codigo: str
    nombre: str
    fecha_nacimiento: date | None
    activo: bool
    model_config = ConfigDict(from_attributes=True)


class SalaOut(BaseModel):
    id: int
    nombre: str
    nivel: str
    capacidad: int
    activa: bool
    model_config = ConfigDict(from_attributes=True)


class MatriculaIn(BaseModel):
    alumno_id: int = Field(gt=0)
    sala_id: int = Field(gt=0)
    anio_escolar: int = Field(ge=2020, le=2100)
    estado: Literal["pendiente", "vigente", "anulada"] = "pendiente"


class MatriculaOut(BaseModel):
    id: int
    alumno_id: int
    sala_id: int
    anio_escolar: int
    fecha: date
    estado: str
    model_config = ConfigDict(from_attributes=True)


class ApoderadoIn(BaseModel):
    nombre: str = Field(min_length=2, max_length=120)
    email: EmailStr
    rut_hash: str | None = Field(default=None, max_length=255)
