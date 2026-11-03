from datetime import datetime
from pydantic import BaseModel, Field


class ComunicadoIn(BaseModel):
    titulo: str = Field(min_length=3, max_length=160)
    cuerpo: str = Field(min_length=1, max_length=10000)
    emisor_id: int = Field(gt=0)
    alcance: str = Field(default="General", max_length=100)
    nivel: str = Field(default="General", max_length=50)
    categoria: str = Field(default="Aviso", max_length=50)
    es_urgente: bool = False
    publicado: bool = True
    fecha_publicacion: datetime | None = None


class ComunicadoOut(BaseModel):
    id: str
    titulo: str
    cuerpo: str
    emisor_id: int
    alcance: str
    nivel: str
    categoria: str
    es_urgente: bool
    publicado: bool
    fecha_publicacion: datetime
