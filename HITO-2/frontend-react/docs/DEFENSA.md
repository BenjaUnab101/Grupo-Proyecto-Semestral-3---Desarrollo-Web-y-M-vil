# Material de defensa técnica

## Comparativa conceptual: NestJS y FastAPI (SCRUM-84)

**Contexto actual:** el Hito 3 se implementó con **FastAPI** (Python) en `HITO-3/backend`. La
consigna original de la ticket asumía un alcance solo de frontend más API pública; eso ya no rige,
porque el proyecto tiene un backend propio. Esta comparación **no** afirma que el docente haya
resuelto ninguna duda de la pauta: solo explica en qué se diferencian ambas opciones y por qué
FastAPI es razonable para este proyecto.

| Aspecto | NestJS | FastAPI (lo que usa el proyecto) |
|---|---|---|
| Lenguaje y ecosistema | TypeScript sobre Node.js (Express o Fastify por debajo); ecosistema npm | Python 3; sobre Starlette (ASGI) y Pydantic; ecosistema PyPI |
| Estructura | Módulos, controladores y proveedores con inyección de dependencias por decoradores, inspirada en Angular | Routers (`APIRouter`) y funciones; la inyección de dependencias se declara con `Depends(...)` en los parámetros |
| Tipado | TypeScript, verificado al compilar | *Type hints* de Python que Pydantic **valida en tiempo de ejecución** |
| Validación de entrada | DTOs con `class-validator` / `class-transformer` mediante `ValidationPipe` | Modelos Pydantic: un cuerpo inválido responde automáticamente; el proyecto lo transforma en **400** con errores por campo (`app/core/errors.py`) |
| Documentación OpenAPI | Paquete `@nestjs/swagger`, con decoradores para describir los modelos | **Generada automáticamente** desde los tipos y modelos: `/docs` (Swagger UI) y `/openapi.json` |
| Asincronía | `async/await` de Node.js, *event loop* de un hilo | `async def` sobre ASGI; las funciones `def` se ejecutan en un *threadpool* (el proyecto usa SQLAlchemy síncrono) |
| Casos de uso típicos | Backends empresariales grandes con equipos acostumbrados a TypeScript y arquitectura modular estricta | APIs de datos, prototipos rápidos y servicios con validación fuerte; muy usado en ciencia de datos e IA |

**Por qué FastAPI en Pequeños Reyes:**
- La validación y la documentación OpenAPI salen de los mismos modelos, lo que cumple el requisito
  de Swagger sin trabajo extra.
- `Depends` permitió centralizar la seguridad: `usuario_autenticado`, `roles_requeridos` y
  `rol_heredado` en `app/core/permisos.py`.
- SQLAlchemy y pymongo cubren PostgreSQL y MongoDB con un solo lenguaje en el backend.

**Qué se ganaría con NestJS:** el mismo lenguaje (JavaScript/TypeScript) que el frontend React y
una estructura modular más rígida para equipos grandes.

**Fuentes oficiales** (consultarlas y fechar la consulta antes de la defensa; este documento no las
citó textualmente):
- NestJS: https://docs.nestjs.com/ (Controllers, Providers, Pipes/Validation, OpenAPI)
- FastAPI: https://fastapi.tiangolo.com/ (Tutorial: Request Body, Dependencies, Features/OpenAPI)
- Pydantic: https://docs.pydantic.dev/

> La preparación de la **defensa individual** (SCRUM-69, 81, 82, 83, 85) es trabajo personal de cada
> integrante y no se puede delegar en este documento.
