from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

# HU-16 (Sprint 3 · Daniel): login, perfil y portal de apoderados.

Rol = Literal["apoderado", "organizador", "administrador"]


class LoginIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    email: str = Field(min_length=3, max_length=180, pattern=r"^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$")
    password: str = Field(min_length=1, max_length=128)


class HijoOut(BaseModel):
    id: int
    codigo: str
    nombre: str


class PerfilOut(BaseModel):
    usuario_id: int
    email: str
    rol: Rol
    nombre: str
    apoderado_id: int | None
    hijos: list[HijoOut]


class LoginOut(BaseModel):
    token: str
    tipo: Literal["bearer"]
    expira_en: datetime
    perfil: PerfilOut


class InscripcionFichaOut(BaseModel):
    actividad_id: int
    titulo: str
    fecha: str
    estado: str


class AlumnoPortalOut(BaseModel):
    id: int
    codigo: str
    nombre: str
    parentesco: str
    sala: str | None
    nivel: str | None


class FichaAlumnoOut(AlumnoPortalOut):
    anio_escolar: int | None
    estado_matricula: str | None
    inscripciones: list[InscripcionFichaOut]
