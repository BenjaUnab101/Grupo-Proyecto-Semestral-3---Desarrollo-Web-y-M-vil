from datetime import date
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field

CategoriaDocumentoType = Literal["Reglamentos", "Protocolos", "Formularios"]


class DocumentoIn(BaseModel):
    titulo: str = Field(min_length=3, max_length=140)
    categoria: CategoriaDocumentoType
    descripcion: str = Field(min_length=5, max_length=500)
    url_archivo: str | None = Field(default=None, max_length=255)
    vigente: bool = True


class DocumentoUpdate(BaseModel):
    titulo: str | None = Field(default=None, min_length=3, max_length=140)
    categoria: CategoriaDocumentoType | None = None
    descripcion: str | None = Field(default=None, min_length=5, max_length=500)
    url_archivo: str | None = Field(default=None, max_length=255)
    vigente: bool | None = None


class DocumentoOut(BaseModel):
    id: int
    titulo: str
    categoria: str
    descripcion: str
    url_archivo: str | None
    vigente: bool
    fecha_actualizacion: date
    model_config = ConfigDict(from_attributes=True)
