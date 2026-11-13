from datetime import datetime

from pydantic import BaseModel

# HU-22 (Sprint 3 · Daniel): bitácora de auditoría (MongoDB).


class RecursoOut(BaseModel):
    tipo: str | None
    id: int | None


class EventoAuditoriaOut(BaseModel):
    id: str
    tipo: str
    resultado: str
    actor_id: int | None
    rol: str | None
    recurso: RecursoOut | None
    datos: dict
    fecha: datetime


class PaginaAuditoriaOut(BaseModel):
    total: int
    pagina: int
    tamano: int
    items: list[EventoAuditoriaOut]
