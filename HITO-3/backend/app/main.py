import logging
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import SQLAlchemyError
from app.core.config import settings
from app.api import academico, catalogo, comunicados, documentos, eventos, inscripciones, prematricula, sesion
from app.api import auditoria, auth, contacto, panel  # Sprint 3 · Daniel (HU-16/22/24/26)
from app.core.errors import registrar_errores
from app.core.permisos import validar_cabecera_rol
from app.db.postgres import SessionLocal
from app.services import auditoria as servicio_auditoria
from app.services.auth import asignar_credenciales_demo
from fastapi.openapi.utils import get_openapi

log = logging.getLogger("pequenos_reyes")


@asynccontextmanager
async def ciclo_de_vida(app: FastAPI):
    # Sprint 3 · Daniel: al arrancar, índices de la bitácora (HU-22) y contraseña de las
    # cuentas demo desde DEMO_PASSWORD (HU-16). Si una base no responde, la API arranca igual.
    servicio_auditoria.asegurar_indices()
    try:
        with SessionLocal() as db:
            cambiadas = asignar_credenciales_demo(db)
            if cambiadas:
                log.info("Credenciales demo asignadas a %s cuentas ficticias", cambiadas)
        if settings.es_entorno_de_desarrollo and not settings.demo_password:
            log.warning("DEMO_PASSWORD está vacía: las cuentas @ejemplo.cl no pueden iniciar sesión (ver .env.example)")
    except SQLAlchemyError as error:
        log.warning("No se asignaron credenciales demo (PostgreSQL no disponible: %s)", type(error).__name__)
    yield

# TEC-16: el esquema de PostgreSQL lo crean SOLO las migraciones de sql/migraciones
# (sql/migrar.sh). No se usa Base.metadata.create_all(), para no tener dos fuentes de esquema.

app = FastAPI(
    title="Pequeños Reyes API",
    version="1.0.0",
    description="API REST para la plataforma institucional Pequeños Reyes.",
    lifespan=ciclo_de_vida,
    # Remediación postauditoría (Sprint 3 · Daniel): X-Rol se contrasta con la sesión real
    # en TODAS las rutas, sin modificar las rutas heredadas (ver app/core/permisos.py).
    dependencies=[Depends(validar_cabecera_rol)],
)
if not settings.identidad_demo_activa:
    log.info("Identidad demo desactivada: X-Usuario-Id y X-Rol sin sesión responden 401")
else:
    log.warning("Identidad demo ACTIVA (solo desarrollo): X-Usuario-Id y X-Rol sin sesión siguen aceptados")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    # X-Rol: perfil que envían las pantallas de eventos (HU-17/18/20).
    # X-Usuario-Id: la cuenta demo elegida en React (TEC-17).
    allow_headers=["Authorization", "Content-Type", "X-Rol", "X-Usuario-Id"],
)
respuestas_error = {
    400: {"description": "Datos de entrada inválidos"},
    401: {"description": "Falta identificarse (X-Usuario-Id) o el usuario no es válido"},
    403: {"description": "Sin permiso para esta acción"},
    404: {"description": "Recurso no encontrado"},
    409: {"description": "Conflicto con datos existentes"},
    503: {"description": "Servicio de datos no disponible"},
}

app.include_router(
    academico.router,
    prefix=settings.api_prefix,
    responses=respuestas_error,
)

app.include_router(
    comunicados.router,
    prefix=settings.api_prefix,
    responses=respuestas_error,
)

app.include_router(
    eventos.router,
    prefix=settings.api_prefix,
    responses=respuestas_error,
)

app.include_router(
    documentos.router,
    prefix=settings.api_prefix,
    responses=respuestas_error,
)
# HU-19: eventos con inscripción, cupos y asistentes (/eventos).
app.include_router(
    inscripciones.router,
    prefix=settings.api_prefix,
    responses=respuestas_error,
)
# TEC-16: categorías de eventos y datos del jardín.
app.include_router(
    catalogo.router,
    prefix=settings.api_prefix,
    responses=respuestas_error,
)
# TEC-17: cuentas demo y perfil de la cuenta elegida.
app.include_router(
    sesion.router,
    prefix=settings.api_prefix,
    responses=respuestas_error,
)
# HU-25: solicitudes de pre-matrícula con seguimiento.
app.include_router(
    prematricula.router,
    prefix=settings.api_prefix,
    responses=respuestas_error,
)
# Sprint 3 · Daniel: login real y portal (HU-16), bitácora MongoDB (HU-22),
# panel de participación (HU-24) y contacto con dirección (HU-26).
for modulo in (auth, auditoria, panel, contacto):
    app.include_router(modulo.router, prefix=settings.api_prefix, responses=respuestas_error)
registrar_errores(app)

@app.get("/health", tags=["sistema"])
def health():
    return {"status": "ok", "service": "pequenos-reyes-api"}

def generar_openapi():
    if app.openapi_schema:
        return app.openapi_schema

    esquema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )

    for ruta in esquema["paths"].values():
        for operacion in ruta.values():
            if isinstance(operacion, dict):
                operacion.get("responses", {}).pop("422", None)

    app.openapi_schema = esquema
    return esquema


app.openapi = generar_openapi
