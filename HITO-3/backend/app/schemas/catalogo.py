from pydantic import BaseModel, ConfigDict, EmailStr, Field

# TEC-16: categorías, organizadores y datos institucionales del jardín.
# str_strip_whitespace: quita espacios al inicio y al final antes de validar los largos.


class CategoriaIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    nombre: str = Field(min_length=2, max_length=60)
    descripcion: str | None = Field(default=None, max_length=200)


class CategoriaOut(BaseModel):
    id: int
    nombre: str
    descripcion: str | None
    model_config = ConfigDict(from_attributes=True)


class OrganizadorIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    nombre: str = Field(min_length=2, max_length=120)
    cargo: str = Field(min_length=2, max_length=80)
    email: EmailStr


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


# ---------- TEC-17: cupos por sala (HU-09 desde PostgreSQL) ----------


class CupoSalaOut(BaseModel):
    id: int
    nombre: str
    nivel: str
    grupo_comunicados: str
    capacidad: int
    matriculados: int
    cupos_disponibles: int
