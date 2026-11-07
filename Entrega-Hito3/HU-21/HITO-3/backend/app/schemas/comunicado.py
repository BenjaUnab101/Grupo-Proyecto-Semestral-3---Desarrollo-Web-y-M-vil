from datetime import date, datetime
from typing import Literal

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field

# HU-21: comunicados guardados en PostgreSQL. Niveles: los mismos de HU-03 (Taller 2).

Nivel = Literal["General", "Salas TEL", "Preescolar"]


class ComunicadoIn(BaseModel):
    # str_strip_whitespace: quita espacios al inicio y al final antes de validar los largos.
    model_config = ConfigDict(str_strip_whitespace=True)
    titulo: str = Field(min_length=3, max_length=160)
    cuerpo: str = Field(min_length=1, max_length=10000)
    nivel: Nivel
    alcance: str | None = Field(default=None, max_length=100)
    categoria: str = Field(default="Aviso", min_length=2, max_length=50)
    es_urgente: bool = False
    publicado: bool = True
    # Con zona horaria (ej. "2026-11-10T09:00:00-03:00"). Sin valor = ahora. Futura = programado.
    fecha_publicacion: AwareDatetime | None = None
    # Último día (hora de Chile) en que se muestra. Sin valor = no vence.
    vigente_hasta: date | None = None


class ComunicadoUpdate(BaseModel):
    # Todo opcional: solo se cambia lo que se envía.
    model_config = ConfigDict(str_strip_whitespace=True)
    titulo: str | None = Field(default=None, min_length=3, max_length=160)
    cuerpo: str | None = Field(default=None, min_length=1, max_length=10000)
    nivel: Nivel | None = None
    alcance: str | None = Field(default=None, max_length=100)
    categoria: str | None = Field(default=None, min_length=2, max_length=50)
    es_urgente: bool | None = None
    publicado: bool | None = None
    fecha_publicacion: AwareDatetime | None = None
    vigente_hasta: date | None = None


class ComunicadoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    titulo: str
    cuerpo: str
    nivel: Nivel
    alcance: str | None
    categoria: str
    es_urgente: bool
    publicado: bool
    fecha_publicacion: datetime
    vigente_hasta: date | None
    autor_usuario_id: int
    creado_en: datetime
    actualizado_en: datetime


class ComunicadosPertinentesOut(BaseModel):
    apoderado_id: int
    niveles: list[Nivel]
    comunicados: list[ComunicadoOut]


class EntradaBitacoraOut(BaseModel):
    comunicado_id: int
    accion: Literal["crear", "editar", "eliminar"]
    usuario_id: int
    rol: str
    fecha: datetime
    cambios: dict
