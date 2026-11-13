import re
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

# HU-26 (Sprint 3 · Daniel): consultas de contacto con la dirección.
# Mismas reglas que el formulario de React del Taller 2 (frontend-react/src/utils/contacto.js);
# el backend las vuelve a revisar porque una consulta puede llegar sin pasar por la página.

EstadoContacto = Literal["nuevo", "en_gestion", "cerrado"]
PATRON_CORREO = r"^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$"


class ConsultaIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    nombre: str = Field(min_length=1, max_length=80)
    correo: str = Field(max_length=254, pattern=PATRON_CORREO)
    telefono: str
    asunto: str = Field(min_length=1, max_length=100)
    mensaje: str = Field(min_length=10, max_length=1000)

    @field_validator("telefono")
    @classmethod
    def validar_telefono(cls, valor: str) -> str:
        numero = re.sub(r"[\s\-.()+]", "", valor)  # "+56 9 1234 5678" -> "56912345678"
        if len(numero) == 11 and numero.startswith("56"):
            numero = numero[2:]
        if not re.fullmatch(r"[2-9]\d{8}", numero):
            raise ValueError("El teléfono debe ser chileno de 9 dígitos, por ejemplo +56 9 1234 5678.")
        return numero

    @field_validator("correo")
    @classmethod
    def correo_en_minusculas(cls, valor: str) -> str:
        return valor.lower()


class SeguimientoContactoIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    codigo: str = Field(min_length=1, max_length=9)
    correo: str = Field(min_length=1, max_length=254)


class CambioEstadoContactoIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    estado: EstadoContacto
    respuesta_direccion: str | None = Field(default=None, max_length=500)


class ConsultaCreadaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    codigo: str
    estado: EstadoContacto
    creada_en: datetime


class SeguimientoContactoOut(BaseModel):
    # Lo que ve quien envió la consulta.
    model_config = ConfigDict(from_attributes=True)
    codigo: str
    asunto: str
    estado: EstadoContacto
    respuesta_direccion: str | None
    creada_en: datetime
    actualizada_en: datetime


class ConsultaOut(SeguimientoContactoOut):
    # Lo que ve dirección.
    id: int
    usuario_id: int | None
    nombre: str
    correo: str
    telefono: str
    mensaje: str
