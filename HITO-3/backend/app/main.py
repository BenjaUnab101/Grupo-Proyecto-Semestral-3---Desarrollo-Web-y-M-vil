from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api import academico, catalogo, comunicados, documentos, eventos, inscripciones, prematricula, sesion
from app.core.errors import registrar_errores
from fastapi.openapi.utils import get_openapi

# TEC-16: el esquema de PostgreSQL lo crean SOLO las migraciones de sql/migraciones
# (sql/migrar.sh). No se usa Base.metadata.create_all(), para no tener dos fuentes de esquema.

app = FastAPI(
    title="Pequeños Reyes API",
    version="1.0.0",
    description="API REST para la plataforma institucional Pequeños Reyes.",
)
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
