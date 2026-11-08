# Resumen de implementación · Hito 3

Este documento resume lo implementado para **TEC-16**, **HU-21**, **TEC-17** y
**HU-25** en la rama `tec16-hu21-tec17-hu25`.

> Todos los datos incluidos en la demostración son ficticios: correos
> `@ejemplo.cl`, códigos `DEMO-*` y solicitudes de ejemplo.

## Resumen de resultados

| Tarea | Resultado verificado |
|---|---:|
| TEC-16 · PostgreSQL y migraciones | 20/20 + 4/4 casos |
| HU-21 · Comunicados | 23/23 casos |
| TEC-17 · Integración React/API | 10/10 casos backend |
| HU-25 · Pre-matrícula | 3/3 + 4/4 + 13/13 casos |
| Frontend React | 123/123 pruebas |

La API respondió correctamente en `/health` y el frontend se ejecutó con
Vite usando datos entregados por el backend.

## TEC-16 · PostgreSQL y migraciones

### Objetivo

Centralizar la creación del esquema en migraciones SQL versionadas, evitando
que la API y archivos independientes creen estructuras diferentes.

### Implementación

- Se agregaron las migraciones `V001` a `V005` en
  `HITO-3/backend/sql/migraciones/`.
- `schema_migraciones` registra cada versión aplicada.
- Cada migración se ejecuta en una transacción.
- `sql/migrar.sh` aplica solo migraciones pendientes y carga semillas demo.
- Docker ejecuta las migraciones automáticamente al crear un volumen nuevo.
- Se agregaron tablas para:
  - usuarios y roles;
  - categorías;
  - pagos simulados;
  - datos de la institución;
  - comunicados;
  - solicitudes de pre-matrícula.
- Las actividades de HU-19 se ampliaron con categoría, organizador y costo.
- Los pagos solo aceptan el método simulado y referencias `SIM-*`.
- La semilla de organizadores define explícitamente `activo = TRUE`, compatible
  con la restricción `NOT NULL` del esquema.

### Rutas principales

- `GET /api/v1/institucion`
- `GET|POST /api/v1/categorias`
- `POST /api/v1/eventos`
- `PATCH|DELETE /api/v1/eventos/{id}`
- `POST|GET /api/v1/inscripciones/{id}/pagos`

### Validación

```bash
docker compose exec api python -m scripts.prueba_tec16 crear
docker compose restart
docker compose exec api python -m scripts.prueba_tec16 verificar
```

Resultado: **20/20** casos de creación y reglas, y **4/4** casos de
persistencia después del reinicio.

## HU-21 · Comunicados persistidos

### Objetivo

Guardar comunicados en PostgreSQL, controlar su vigencia y aplicar permisos
según el rol de la cuenta.

### Implementación

- Dirección y personal pueden publicar comunicados.
- El autor puede modificar o eliminar sus propios comunicados.
- Dirección puede administrar comunicados de cualquier autor.
- Visitantes pueden leer comunicados vigentes sin identificarse.
- Los apoderados reciben comunicados generales y los correspondientes a los
  niveles de las salas de sus hijos.
- Se filtran comunicados programados, vencidos y borradores.
- MongoDB registra la bitácora de creación, edición y eliminación.
- La identidad de demostración se recibe mediante `X-Usuario-Id`.

### Rutas principales

- `GET|POST /api/v1/comunicados`
- `GET|PATCH|DELETE /api/v1/comunicados/{id}`
- `GET /api/v1/apoderados/{id}/comunicados`
- `GET /api/v1/comunicados/{id}/bitacora`

### Validaciones comprobadas

- `401` sin usuario para operaciones protegidas.
- `403` para apoderados o autores sin permiso.
- `400` para niveles, títulos, fechas y filtros inválidos.
- `404` para comunicados o apoderados inexistentes.
- Vigencia según fecha de publicación y fecha de término.

### Validación

```bash
docker compose exec api python -m scripts.prueba_hu21
```

Resultado: **23/23** casos correctos.

## TEC-17 · Integración del frontend con la API

### Objetivo

Reemplazar datos estáticos del frontend por información obtenida desde el
backend.

### Implementación

- Los cupos por sala se calculan desde las matrículas de PostgreSQL.
- Los comunicados se cargan desde HU-21.
- El calendario combina eventos de HU-19 y actividades escolares de HU-18.
- Los apoderados pueden inscribir y cancelar hijos en eventos.
- Dirección y personal pueden publicar y eliminar comunicados.
- Se agregó el selector **“Ver el portal como”** con cuentas ficticias:
  visitante, apoderado, personal y dirección.
- Los errores de carga, permisos, conexión, datos inválidos y falta de cupos
  se muestran en pantalla con opción de reintentar.
- Las llamadas HTTP están centralizadas en `src/services/`.

### Rutas utilizadas por React

- `GET /api/v1/sesion/cuentas-demo`
- `GET /api/v1/sesion/yo`
- `GET /api/v1/salas/cupos`
- `GET /api/v1/apoderados/{id}/inscripciones`
- Rutas de eventos, inscripciones y comunicados.

### Validación

```bash
docker compose exec api python -m scripts.prueba_tec17
cd HITO-2/frontend-react
npm test -- --run
```

Resultados:

- Backend TEC-17: **10/10** casos.
- Frontend: **123/123** pruebas.
- La interfaz fue comprobada con el backend activo en
  `http://localhost:5173`.

> `npm run lint` todavía reporta errores existentes en scripts de evidencia y
> algunos componentes React. No afecta las pruebas funcionales anteriores.

## HU-25 · Pre-matrícula con seguimiento

### Objetivo

Persistir solicitudes de pre-matrícula y permitir que la familia consulte su
estado posteriormente.

### Implementación

- La solicitud se almacena en PostgreSQL.
- Se genera un código de seguimiento como `PM-XXXXXX`.
- La familia consulta usando código y correo.
- Dirección puede listar, filtrar y cambiar estados.
- El cambio de estado puede incluir un mensaje para la familia.
- Se validan RUT, correo, teléfono, nivel y consentimiento.
- Se rechazan solicitudes duplicadas en curso para el mismo párvulo y nivel.
- El seguimiento no expone RUT ni datos de contacto.

### Rutas principales

- `POST /api/v1/prematriculas`
- `POST /api/v1/prematriculas/seguimiento`
- `GET /api/v1/prematriculas?estado=`
- `PATCH /api/v1/prematriculas/{id}/estado`

### Validación

```bash
docker compose exec api python -m scripts.prueba_hu25 crear
docker compose restart api postgres
docker compose exec api python -m scripts.prueba_hu25 verificar
docker compose exec api python -m scripts.prueba_hu25 negativos
```

Resultados:

- Creación y cambio inicial: **3/3**.
- Persistencia y seguimiento después del reinicio: **4/4**.
- Casos negativos y permisos: **13/13**.

## Cómo ejecutar el proyecto

### Backend

Desde `HITO-3/backend`:

```bash
docker compose up -d --build
docker compose exec postgres sh /sql/migrar.sh
```

La documentación interactiva queda disponible en
`http://localhost:8000/docs`.

### Frontend

Desde `HITO-2/frontend-react`:

```bash
npm install
npm run dev
```

La aplicación queda disponible en `http://localhost:5173`.

## Documentación detallada

- [TEC-16 · Migraciones PostgreSQL](./TEC-16-postgresql-migraciones.md)
- [HU-21 · Comunicados SQL](./HU-21-comunicados-sql.md)
- [HU-25 · Pre-matrícula](./HU-25-prematricula.md)
- [TEC-17 · Integración API](../../../HITO-2/frontend-react/docs/TEC-17-integracion-api.md)
