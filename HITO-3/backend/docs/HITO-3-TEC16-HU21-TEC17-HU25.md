# Hito 3 · TEC-16, HU-21, TEC-17 y HU-25

> **Restricción:** todos los datos son ficticios (correos `@ejemplo.cl`, alumnos `DEMO-*`). No hay datos reales de menores.

Este documento resume en un solo lugar lo que entrega cada tarea. El detalle completo de cada una (reglas, ejemplos, pruebas y evidencia) está en su propio informe:

| Tarea | Informe |
|---|---|
| TEC-16 | `HITO-3/backend/docs/TEC-16-postgresql-migraciones.md` |
| HU-21 | `HITO-3/backend/docs/HU-21-comunicados-sql.md` |
| TEC-17 | `HITO-2/frontend-react/docs/TEC-17-integracion-api.md` |
| HU-25 | `HITO-3/backend/docs/HU-25-prematricula.md` |

Las cuatro se apoyan en HU-19 (inscripciones a eventos), que ya está en `main`, y conviven con HU-17, HU-18, HU-20, HU-23 y HU-27.

---

## TEC-16 · Base de datos PostgreSQL con migraciones

**Qué problema resuelve:** antes, las tablas se creaban de dos formas a la vez: con los archivos `sql/001_schema.sql` y `sql/002_inscripciones.sql`, y con el código de la API al arrancar. Así no había certeza de que todos tuvieran la misma base.

**Qué se hizo:**

- **Migraciones numeradas** en `sql/migraciones/`, de `V001` a `V005`. Cada una se aplica **una sola vez** y queda anotada en la tabla `schema_migraciones`. Si una falla, se deshace completa y no queda a medias.
- Al levantar Docker con una base nueva, **las migraciones y los datos demo se aplican solos**. En una base existente se aplican con un comando, sin borrar nada.
- **Tablas nuevas:**
  - `usuarios`: cuentas de dirección, personal y apoderados.
  - `categorias`: tipos de evento.
  - `pagos`: pagos **simulados**, nunca reales.
  - `institucion`: datos del jardín.
- Los eventos de HU-19 ahora tienen categoría, organizador y costo.
- Los organizadores son los de la tabla de **HU-17**. No se creó otra.
- **API:**
  - Crear, modificar y eliminar eventos (`/api/v1/eventos`).
  - Registrar pagos simulados de una inscripción.
  - Ver las categorías y los datos del jardín.
- Las tablas de HU-17, HU-18, HU-20 y HU-27 quedan en la primera migración (`V001`), con el mismo contenido que tenía `001_schema.sql`.

**Cómo se comprueba:**
- `docker compose exec api python -m scripts.prueba_tec16 crear` (20 casos).
- Luego `docker compose restart` y `docker compose exec api python -m scripts.prueba_tec16 verificar` (4 casos). Comprueba que los datos siguen ahí después de reiniciar.

---

## HU-21 · Comunicados guardados en PostgreSQL

**Qué problema resuelve:** los comunicados estaban en MongoDB, sin permisos ni control de vigencia.

**Qué se hizo:**

- **Dirección y el personal** publican, editan y eliminan comunicados, indicando a qué nivel van dirigidos.
- **Permisos:**
  - Sin identificarse, solo se pueden leer.
  - El personal edita o elimina **solo los suyos**.
  - Dirección puede con todos.
  - Si alguien no tiene permiso, la API responde con un error claro (401 o 403).
- **Vigencia:** un comunicado aparece solo si está publicado, su fecha ya llegó y no ha vencido (hora de Chile). Los borradores, programados y vencidos solo los ve el personal.
- **Cada apoderado ve solo lo que le corresponde:** los comunicados generales y los del nivel de las salas de sus hijos.
- **MongoDB guarda una bitácora:** quién publicó, editó o eliminó cada comunicado, cuándo y qué cambió.
- Los comunicados de ejemplo pasaron a PostgreSQL (`S002`). Incluyen casos para probar los filtros: uno vencido, uno programado y un borrador.

**Cómo se comprueba:** `docker compose exec api python -m scripts.prueba_hu21` (23 casos).

---

## TEC-17 · La página React usa los datos de la API

**Qué problema resuelve:** la página mostraba cupos, comunicados y actividades escritos a mano en archivos del frontend (`salas.json`, `actividades.json` y `comunicados.json`), así que no reflejaba lo que pasaba en la base de datos.

**Qué se hizo:**

- **Ahora vienen de la API:**
  - los **cupos por sala**, contados en la base de datos;
  - los **comunicados** de HU-21;
  - el **calendario**, que junta los eventos de HU-19 y las actividades escolares de HU-18.
- **Barra «Ver el portal como:»** con cuentas ficticias (visitante, apoderado, personal y dirección), para probar los permisos sin inicio de sesión. La cuenta elegida no da permisos por sí sola: el backend revisa cada acción.
- El **apoderado inscribe y cancela** a sus hijos en los eventos desde la página.
- **Dirección y el personal publican y eliminan** comunicados desde la página.
- **La página nunca queda en blanco.** Avisa cuando está cargando, cuando no hay datos y cuando algo falla (sin internet, servidor caído, datos mal escritos, sin permiso o sin cupos), y ofrece **Reintentar**. Si falla un envío, lo escrito en el formulario no se pierde.
- Todo lo que habla con la API está en una sola carpeta (`src/services/`), y las secciones están en `src/pages/`.
- Los componentes de HU-17, HU-18 y HU-23 siguen en la sección del calendario. Tres de sus pruebas ahora leen `pages/CalendarioSeccion.jsx`, que es donde quedó el calendario.

**Cómo se comprueba:**
- `docker compose exec api python -m scripts.prueba_tec17` (10 casos).
- `npm test` en el frontend.
- Recorrer la página con el backend levantado, como se explica en su informe.

---

## HU-25 · Pre-matrícula con seguimiento

**Qué problema resuelve:** el formulario de pre-matrícula era solo una demostración. Lo que escribía la familia no se guardaba en ninguna parte.

**Qué se hizo:**

- La familia envía la pre-matrícula y queda **guardada en PostgreSQL**. Recibe un **código de seguimiento**, por ejemplo `PM-7K3QX9`.
- **Seguimiento:** con el código y su correo, la familia consulta en qué estado está su solicitud. Esto sigue funcionando aunque recargue la página o se reinicie el servidor.
- **Panel de dirección:** con la cuenta de dirección se ven todas las solicitudes, se filtran por estado y se cambia el estado con un mensaje para la familia. Nadie más ve el panel, y la API también se lo impide.
- **Las mismas reglas en la página y en la API:** RUT válido, correo, teléfono de 9 dígitos y consentimiento. No se aceptan dos solicitudes en curso para el mismo niño y nivel.
- Hay 3 solicitudes de ejemplo, ficticias (`S004`).

**Cómo se comprueba:**
- `docker compose exec api python -m scripts.prueba_hu25 crear` (3 casos).
- Luego `docker compose restart api postgres` y `docker compose exec api python -m scripts.prueba_hu25 verificar` (4 casos).
- Por último, `docker compose exec api python -m scripts.prueba_hu25 negativos` (13 casos).

---

## Cómo levantar todo

1. **Backend** (desde `HITO-3/backend`):
   ```bash
   docker compose down -v        # borra los datos de demostración del computador
   docker compose up -d --build  # crea las tablas y carga los datos demo automáticamente
   ```
   Para conservar una base que ya existe, en vez de `down -v`: `docker compose up -d --build` y luego `docker compose exec postgres sh /sql/migrar.sh`.
2. **Frontend** (desde `HITO-2/frontend-react`): `npm install` y `npm run dev`, y abrir http://localhost:5173.
3. **Pruebas:** los scripts de cada tarea (arriba) y, en el frontend, `npm test` y `npm run lint`.

## Qué falta para cerrar las tareas

- [ ] Correr los scripts de prueba de las cuatro tareas con Docker y guardar cada salida en `docs/evidencia/<TAREA>/`.
- [ ] Correr `npm run lint` en el frontend.
- [ ] Revisión cruzada de cada tarea.

> La API no se pudo ejecutar en el equipo donde se preparó la entrega, porque no se pudieron instalar FastAPI ni SQLAlchemy. Lo que sí se probó:
> - las migraciones, en un PostgreSQL 16 real, tanto en una base nueva como en una creada con la versión actual de `main`;
> - las pruebas de React: 123 de 123;
> - la página, con una API simulada: 28 de 28.

<details>
<summary><strong>Detalles técnicos</strong></summary>

### Rutas nuevas de la API (prefijo `/api/v1`)

| Tarea | Rutas |
|---|---|
| TEC-16 | `GET /institucion`; `GET` y `POST /categorias`; `POST /eventos`, `PATCH` y `DELETE /eventos/{id}`; `POST` y `GET /inscripciones/{id}/pagos` |
| HU-21 | `GET` y `POST /comunicados`; `GET`, `PATCH` y `DELETE /comunicados/{id}`; `GET /apoderados/{id}/comunicados`; `GET /comunicados/{id}/bitacora` |
| TEC-17 | `GET /sesion/cuentas-demo`, `GET /sesion/yo`, `GET /salas/cupos`, `GET /apoderados/{id}/inscripciones` |
| HU-25 | `POST /prematriculas`, `POST /prematriculas/seguimiento`, `GET /prematriculas`, `PATCH /prematriculas/{id}/estado` |

La identidad se simula con el encabezado `X-Usuario-Id` (el `id` de la tabla `usuarios`). El CORS lo permite junto con `X-Rol`, que usan las pantallas de HU-17, HU-18 y HU-20.

### Base de datos

| Archivo | Tarea | Contenido |
|---|---|---|
| `sql/migrar.sh` y `sql/initdb/00_migrar.sh` | TEC-16 | Aplica las migraciones pendientes y luego los datos demo. Docker lo ejecuta solo con una base nueva. |
| `V001__esquema_base.sql` | TEC-16 | Esquema base y tablas de HU-17/18/20/27 (antes `sql/001_schema.sql`). |
| `V002__inscripciones.sql` | TEC-16 | Tablas de HU-19 (antes en `sql/002_inscripciones.sql`). |
| `V003__usuarios_eventos_pagos_institucion.sql` | TEC-16 | Usuarios, categorías, pagos, institución y columnas nuevas de los eventos. |
| `V004__comunicados.sql` | HU-21 | Comunicados y grupo de comunicados de cada sala. |
| `V005__solicitudes_prematricula.sql` | HU-25 | Solicitudes con sus reglas (CHECK) e índice único parcial contra duplicados. |
| `seed/S001` a `S004` | TEC-16, HU-21, TEC-17 y HU-25 | Datos ficticios. Se pueden cargar varias veces sin duplicar. |

### Cambios respecto de `main`

- **Se eliminan:**
  - `sql/001_schema.sql` y `sql/002_inscripciones.sql`, porque su contenido pasó a `V001`, `V002` y `S001`;
  - `src/data/salas.json`, `actividades.json` y `comunicados.json`, porque los datos vienen de la API. Los dos últimos quedan en `src/datos-prueba/` solo para las pruebas.
- **`app/main.py`:** ya no crea tablas al arrancar (`create_all`) y registra las rutas de sesión y pre-matrícula.
- **`app/api|services|schemas/catalogo.py`:** se quitaron los endpoints de organizadores, porque `/api/v1/organizadores` ya lo atiende HU-17 (`eventos.py`). Quedan institución, categorías y cupos por sala.
- **`V002`:** se quitaron las líneas que agregaban columnas y la tabla `pagos` por adelantado; eso lo hace `V003`. Así cada migración tiene una sola responsabilidad. Se probó que una base creada con el `main` actual migra sin errores.
- **Se mantienen sin cambios** los ajustes recientes del equipo:
  - `requirements.txt` (versiones nuevas y `httpx`);
  - `Dockerfile` (copia `sql/` y `mongo/`);
  - `FlujoInscripcionEventos.jsx` y `eventosApi.js` (inscripción en eventos de HU-19);
  - los datos demo de eventos, que se actualizan al recargarse (`ON CONFLICT … DO UPDATE`), ahora en `S001`.

</details>
