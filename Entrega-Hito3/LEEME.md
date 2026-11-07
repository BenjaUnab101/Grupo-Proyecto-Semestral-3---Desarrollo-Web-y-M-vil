# Entrega Hito 3 · Portal Pequeños Reyes

Cada carpeta tiene **solo lo de su tarea**: su informe (el `.md` de la raíz) y los archivos del proyecto que esa tarea crea o modifica, con las mismas rutas del repositorio (`HITO-3/backend/...` y `HITO-2/frontend-react/...`).

| Carpeta | Tarea | Qué entrega |
|---|---|---|
| `HU-19/` | Inscripciones a eventos | Inscribir y cancelar respetando los cupos (también con inscripciones simultáneas) y lista de asistentes. Rutas `/api/v1/eventos`. |
| `TEC-16/` | Modelo PostgreSQL y migraciones | Migraciones reproducibles; tablas de usuarios, categorías, pagos ficticios e institución; CRUD de eventos y categorías. |
| `HU-21/` | Comunicados en PostgreSQL | CRUD de comunicados con permisos, vigencia, comunicados de cada apoderado y bitácora en MongoDB. |
| `TEC-17/` | React conectado a la API | Cupos, comunicados, calendario e inscripciones desde la API, con estados de carga, vacío y error. |
| `HU-25/` | Pre-matrícula con seguimiento | Solicitudes guardadas en PostgreSQL, código de seguimiento y panel de dirección. |

## Por qué algunos archivos aparecen en varias carpetas

Hay archivos que tocan varias tareas, como `app/main.py` o `app/db/models.py`. En cada carpeta, ese archivo tiene **lo que ya había antes más lo de esa tarea, y nada de las tareas siguientes**. Por ejemplo:

- `HU-19/.../app/main.py` agrega solo la ruta de eventos.
- `TEC-16/.../app/main.py` agrega la ruta de categorías y quita la creación automática de tablas.
- `HU-25/.../app/main.py` agrega solo la ruta de pre-matrícula.

Por eso **el orden importa**: cada rama parte de la anterior (HU-19 → TEC-16 → HU-21 → TEC-17 → HU-25), igual que se fueron haciendo las tareas.

## Comandos para crear las ramas

Se ejecutan en **Git Bash** desde la raíz del repositorio. En Visual Studio Code: menú **Terminal → Nueva terminal**, y en la flecha junto al **+** elegir **Git Bash**.

Antes de empezar, `git status` no debe mostrar cambios pendientes, y la carpeta `Entrega-Hito3/` debe estar en la raíz del repositorio. Git no la sube porque los comandos solo agregan `HITO-2` y `HITO-3`.

```bash
# 1. HU-19 (parte desde main)
git checkout main
git pull
git checkout -b HU-19
cp -r Entrega-Hito3/HU-19/HITO-* .
git add HITO-2 HITO-3
git commit -m "HU-19: inscripciones a eventos con control de cupos"
git push -u origin HU-19

# 2. TEC-16 (parte desde HU-19)
git checkout -b TEC-16
cp -r Entrega-Hito3/TEC-16/HITO-* .
git rm HITO-3/backend/sql/001_schema.sql HITO-3/backend/sql/002_inscripciones.sql
git add HITO-2 HITO-3
git commit -m "TEC-16: modelo PostgreSQL y migraciones reproducibles"
git push -u origin TEC-16

# 3. HU-21 (parte desde TEC-16)
git checkout -b HU-21
cp -r Entrega-Hito3/HU-21/HITO-* .
git add HITO-2 HITO-3
git commit -m "HU-21: comunicados en PostgreSQL con bitácora"
git push -u origin HU-21

# 4. TEC-17 (parte desde HU-21)
git checkout -b TEC-17
cp -r Entrega-Hito3/TEC-17/HITO-* .
git rm HITO-2/frontend-react/src/data/salas.json HITO-2/frontend-react/src/data/actividades.json HITO-2/frontend-react/src/data/comunicados.json
git add HITO-2 HITO-3
git commit -m "TEC-17: React conectado a la API"
git push -u origin TEC-17

# 5. HU-25 (parte desde TEC-17)
git checkout -b HU-25
cp -r Entrega-Hito3/HU-25/HITO-* .
git add HITO-2 HITO-3
git commit -m "HU-25: pre-matrícula con seguimiento persistente"
git push -u origin HU-25
```

Antes de cada `commit`, `git status` muestra qué archivos cambia esa tarea.

### Pull requests

- Hay que unirlos **en el mismo orden**: primero HU-19, después TEC-16, y así.
- Mientras HU-19 no esté unido a `main`, el pull request de TEC-16 puede apuntar a la rama `HU-19` en vez de `main`. Así el revisor ve solo los cambios de TEC-16. Lo mismo para las siguientes.
- Si alguien cambia esos mismos archivos en `main` mientras tanto, puede aparecer un conflicto. En ese caso hay que conservar los cambios de ambos lados.

## Cómo probar cada rama

Cada rama funciona por sí sola, con todo lo de las ramas anteriores.

- **Backend** (desde `HITO-3/backend`), partiendo de una base nueva: `docker compose down -v` y luego `docker compose up -d --build`.
  - En HU-19, Docker crea las tablas y los datos demo con `sql/001_schema.sql` y `sql/002_inscripciones.sql`.
  - Desde TEC-16, lo hacen las migraciones.
- **Script de prueba de cada tarea**, con Docker levantado. Cada informe explica el suyo; terminan con `Resultado: N/N PASS`.
  - HU-19: `docker compose exec api python -m scripts.prueba_hu19`
  - TEC-16: `docker compose exec api python -m scripts.prueba_tec16 crear`, luego `docker compose restart` y `docker compose exec api python -m scripts.prueba_tec16 verificar`
  - HU-21: `docker compose exec api python -m scripts.prueba_hu21`
  - TEC-17: `docker compose exec api python -m scripts.prueba_tec17`
  - HU-25: `docker compose exec api python -m scripts.prueba_hu25 crear`, luego `docker compose restart api postgres`, y después `verificar` y `negativos`
- **Frontend** (desde `HITO-2/frontend-react`, en TEC-17 y HU-25): `npm install`, `npm test`, `npm run lint` y `npm run dev`.
  - `npm test` da 114 de 114 en TEC-17 y 123 de 123 en HU-25.

Lo de HU-17, HU-18, HU-20, HU-23 y HU-27 se mantiene en todas las ramas:

- Los eventos de HU-19 usan `/api/v1/eventos` porque `/api/v1/actividades` es de HU-18.
- Se usa la tabla `organizadores` de HU-17.
- En TEC-17, tres pruebas de HU-17, HU-18 y HU-23 ahora leen `pages/CalendarioSeccion.jsx`, que es donde quedó el calendario.

> **Importante:** en el equipo donde se preparó la entrega no se pudieron instalar FastAPI ni SQLAlchemy, así que la API no se ejecutó.
>
> Sí se probó, rama por rama:
> - la base de datos en un PostgreSQL 16 real (tablas, migraciones y datos demo de cada etapa);
> - las pruebas de React;
> - la página con una API simulada.
>
> Antes de cerrar cada tarea, hay que correr su script de prueba y guardar la salida en `docs/evidencia/<TAREA>/`.
