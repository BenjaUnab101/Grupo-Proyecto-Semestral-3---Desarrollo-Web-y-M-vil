from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


# TEC-16: categorías, organizadores y datos institucionales del jardín.


def _sin_espacios_extremos(valor: str) -> str:
    valor = valor.strip()
    if not valor:
        raise ValueError("no puede estar vacío")
    return valor


class CategoriaIn(BaseModel):
    nombre: str = Field(min_length=2, max_length=60)
    descripcion: str | None = Field(default=None, max_length=200)

    _limpiar_nombre = field_validator("nombre")(_sin_espacios_extremos)


class CategoriaOut(BaseModel):
    id: int
    nombre: str
    descripcion: str | None
    model_config = ConfigDict(from_attributes=True)


class OrganizadorIn(BaseModel):
    nombre: str = Field(min_length=2, max_length=120)
    cargo: str = Field(min_length=2, max_length=80)
    email: EmailStr

    _limpiar_textos = field_validator("nombre", "cargo")(_sin_espacios_extremos)

    @field_validator("email")
    @classmethod
    def email_en_minusculas(cls, valor: str) -> str:
        return valor.lower()


class OrganizadorOut(BaseModel):
    id: int
    nombre: str
    cargo: str
    email: str
    activo: bool
    model_config = ConfigDict(from_attributes=True)


class InstitucionOut(BaseModel):
    nombre: str
    tipo: str
    direccion: str
    comuna: str
    region: str
    telefono: str | None
    email: str | None
    horario_atencion: str | None
    model_config = ConfigDict(from_attributes=True)
