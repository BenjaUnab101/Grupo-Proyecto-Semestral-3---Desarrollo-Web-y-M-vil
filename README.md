# Pequeños Reyes · Plataforma web Full Stack

Portal institucional de la Escuela de Lenguaje Pequeños Reyes. Centraliza la información que hoy se
entrega por WhatsApp, papel o avisos verbales: comunicados, calendario de actividades, inscripciones
con pago simulado, documentos, pre-matrícula y contacto con la dirección.

Caso del enunciado: **3.6 Agenda de actividades y eventos** (organizadores, eventos, categorías,
inscripciones con cupos, pagos simulados y comprobantes).

## Integrantes
- Daniel Cortez Fierro
- Diego Rubilar Gómez
- Mirko Massa Maldonado
- Benjamín Concha Navarro

## Estructura del repositorio
| Carpeta | Contenido |
|---|---|
| `HITO-1/` | Prototipo estático (HTML, CSS y JavaScript) del Taller 1. |
| `HITO-2/frontend-react/` | Aplicación React + Vite (ver su README). |
| `HITO-3/backend/` | API REST FastAPI, migraciones PostgreSQL, MongoDB y Docker Compose. |
| `HITO-3/backend/app/` | `api/` rutas · `services/` lógica · `schemas/` DTO · `db/` modelos y conexiones · `core/` configuración y permisos. |
| `HITO-3/backend/sql/` | `migraciones/` versionadas (V001…V008) y `seed/` con datos ficticios (S001…S007). |
| `HITO-3/backend/tests/` | Pruebas unitarias del backend (SQLite en memoria, sin Docker). |
| `HITO-3/backend/scripts/` | Pruebas de integración que corren dentro del contenedor de la API y utilidades de BD. |
| `HITO-3/backend/docs/` | Arquitectura de datos, decisiones y evidencias por historia de usuario. |
| `.github/workflows/ci.yml` | CI: frontend (pruebas, ESLint, build), backend (unittest) e integración con Compose. |

## Cómo levantar todo (Docker Compose)

    cd HITO-3/backend
    cp .env.example .env
    docker compose up --build -d
    docker compose ps

- React: http://localhost:5173
- API: http://localhost:8000/health · Swagger: http://localhost:8000/docs

En cada `docker compose up` el servicio `migraciones` aplica las migraciones pendientes y recarga
los datos de demostración (ambos idempotentes), así que un volumen creado antes también se actualiza
solo. Termina y queda detenido; la API arranca después.

## Cuentas para iniciar sesión
Son cuentas **ficticias** (`@ejemplo.cl`) que solo funcionan con `APP_ENV=development` o `test`.
La contraseña es la de `DEMO_PASSWORD` en `HITO-3/backend/.env` (en `.env.example`: `PequenosReyes2026`).
Al arrancar, la API guarda esa contraseña como hash PBKDF2 en las cuentas que aún no tienen una.
La ventana de login también muestra estas cuentas para elegirlas con un clic.

| Correo | Rol | Qué puede hacer |
|---|---|---|
| `direccion.demo@ejemplo.cl` | Dirección (administrador) | Todo: organizadores y categorías, gestionar y publicar actividades, confirmar/cancelar pagos, pre-matrículas, auditoría. |
| `educadora.demo@ejemplo.cl` | Personal del jardín (organizador) | Crear, editar, publicar y cancelar actividades; ver todas las inscripciones; publicar comunicados. |
| `apoderado.demo1@ejemplo.cl` | Apoderado (5 hijos) | Portal con fichas de sus hijos, inscribir con pago simulado, ver sus comprobantes. |
| `apoderado.demo2@ejemplo.cl` | Apoderado (1 hijo) | Igual que el anterior. |
| `apoderado.demo3@ejemplo.cl` | Apoderado (sin hijos) | Caso vacío del portal. |

## Recorrido de prueba sugerido
1. **Visitante**: en *Calendario* se ven las actividades publicadas con categoría, organizador y cupos; para inscribir pide iniciar sesión.
2. **Apoderado** (`apoderado.demo1`): *Portal familias* muestra a sus hijos. En *Inscripción a actividades y comprobantes*, elige párvulo, ingresa un RUT válido (ej. `12.345.678-5`) y confirma: se emite un comprobante `PR-COMP-…` que aparece en *Mis comprobantes* y se puede verificar por código.
3. **Educadora**: aparece *Gestión y publicación de actividades escolares*. Crea una actividad, publícala y aparece en el catálogo de familias.
4. **Dirección**: además aparece *Administración de organizadores y categorías*, y en la lista de pagos puede confirmar o cancelar (cancelar libera el cupo).

## Pruebas

    cd HITO-2/frontend-react && npm ci && npm test && npm run lint && npm run build
    cd HITO-3/backend && pip install -r requirements.txt
    APP_ENV=test python -m unittest discover -v -s tests -p "tests_*.py"
    cd HITO-3/backend && bash scripts/ci_integracion.sh

## Persistencia
- **PostgreSQL** (transaccional): usuarios, apoderados, alumnos, organizadores, categorías, actividades, inscripciones, pagos simulados, comunicados, pre-matrículas, sesiones.
- **MongoDB** (documental): bitácora de auditoría (accesos, inscripciones, contacto) y bitácora de cambios de comunicados.
  Detalle y justificación en `HITO-3/backend/docs/ARQUITECTURA_DATOS.md`.