import re
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

# HU-25: solicitudes de pre-matrícula.
# Mismas reglas que el formulario de React (frontend-react/src/utils/validaciones.js).
# El backend las vuelve a revisar porque una solicitud puede llegar sin pasar por la página.

Nivel = Literal["medio-menor", "medio-mayor", "transicion-1", "transicion-2", "sala-tel"]
Estado = Literal["recibida", "en_revision", "lista_espera", "aceptada", "rechazada"]
PATRON_CORREO = r"^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$"


def digito_verificador(numero: str) -> str:
    """Dígito verificador del RUT (módulo 11)."""
    suma, factor = 0, 2
    for digito in reversed(numero):
        suma += int(digito) * factor
        factor = 2 if factor == 7 else factor + 1
    resto = 11 - suma % 11
    return {11: "0", 10: "K"}.get(resto, str(resto))


class SolicitudIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)  # quita espacios al inicio y al final
    nombre_apoderado: str = Field(min_length=1, max_length=80)
    rut: str
    correo: str = Field(max_length=254, pattern=PATRON_CORREO)
    telefono: str
    nombre_parvulo: str = Field(min_length=1, max_length=80)
    nivel: Nivel
    comentario: str | None = Field(default=None, max_length=300)
    consentimiento: bool

    @field_validator("rut")
    @classmethod
    def validar_rut(cls, valor: str) -> str:
        limpio = re.sub(r"[.\s-]", "", valor).upper()  # "12.345.678-5" -> "123456785"
        if not re.fullmatch(r"\d{7,8}[0-9K]", limpio):
            raise ValueError("El RUT debe tener 7 u 8 dígitos y un dígito verificador, por ejemplo 12.345.678-5.")
        if digito_verificador(limpio[:-1]) != limpio[-1]:
            raise ValueError("El dígito verificador no corresponde a este RUT. Revísalo.")
        return f"{limpio[:-1]}-{limpio[-1]}"  # se guarda como 12345678-5

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

    @field_validator("consentimiento")
    @classmethod
    def validar_consentimiento(cls, valor: bool) -> bool:
        if not valor:
            raise ValueError("Debes aceptar el uso de estos datos para gestionar la solicitud.")
        return valor


class SeguimientoIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    codigo: str = Field(min_length=1, max_length=9)
    correo: str = Field(min_length=1, max_length=254)


class CambioEstadoIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    estado: Estado
    mensaje_familia: str | None = Field(default=None, max_length=300)


class SolicitudCreadaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    codigo: str
    estado: Estado
    creada_en: datetime


class SeguimientoOut(BaseModel):
    # Lo que ve la familia: solo el estado (sin datos de contacto).
    model_config = ConfigDict(from_attributes=True)
    codigo: str
    estado: Estado
    nivel: Nivel
    mensaje_familia: str | None
    creada_en: datetime
    actualizada_en: datetime


class SolicitudOut(SeguimientoOut):
    # Lo que ve dirección: además, los datos de la solicitud.
    id: int
    nombre_apoderado: str
    rut: str
    correo: str
    telefono: str
    nombre_parvulo: str
    comentario: str | None
