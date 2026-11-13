from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError
from starlette.exceptions import HTTPException as StarletteHTTPException


def registrar_errores(app: FastAPI):
    @app.exception_handler(StarletteHTTPException)
    async def error_http(
        request: Request,
        exc: StarletteHTTPException,
    ):
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail},
            headers=exc.headers,
        )

    @app.exception_handler(RequestValidationError)
    async def error_validacion(
        request: Request,
        exc: RequestValidationError,
    ):
        errores = [
            {
                "campo": ".".join(str(parte) for parte in error["loc"]),
                "mensaje": error["msg"],
            }
            for error in exc.errors()
        ]

        return JSONResponse(
            status_code=400,
            content={
                "detail": "Datos de entrada inválidos",
                "errores": errores,
            },
        )

    @app.exception_handler(SQLAlchemyError)
    async def error_postgres(
        request: Request,
        exc: SQLAlchemyError,
    ):
        return JSONResponse(
            status_code=503,
            content={
                "detail": "Servicio de datos temporalmente no disponible",
            },
        )