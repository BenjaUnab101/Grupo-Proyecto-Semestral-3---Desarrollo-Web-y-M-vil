# Inscripciones a actividades, cupos y asistentes (HU-19)

> **ID estable:** PR-S3/HU-19 · Referencias previas: SCRUM-49, 57, 63 · Dependencias: SCRUM-96, SCRUM-98
> **Responsable propuesto:** Mirko Massa · **Revisor cruzado:** Daniel Cortez
> **Estado:** implementado y pendiente de revisión. No marcar como finalizado sin la revisión de Daniel y la evidencia del equipo (ver «Qué falta»).

**En pocas palabras:** la API del jardín ahora permite que un **apoderado inscriba o cancele** la participación de sus hijos en una actividad, **respetando los cupos** aunque muchas personas se inscriban al mismo tiempo. El **organizador** puede consultar quiénes asisten y en qué estado está cada inscripción.

---

## ¿Qué se puede hacer?

| Quién | Qué | Endpoint |
|---|---|---|
| Todos | Ver las próximas actividades y sus cupos disponibles | `GET /api/v1/actividades` |
| Todos | Ver una actividad | `GET /api/v1/actividades/{id}` |
| Apoderado | **Inscribir** a su hijo o hija | `POST /api/v1/actividades/{id}/inscripciones` |
| Apoderado | **Cancelar** una inscripción | `POST /api/v1/inscripciones/{id}/cancelar` |
| Organizador | Ver la **lista de asistentes** y su estado | `GET /api/v1/actividades/{id}/asistentes` |

Todos aparecen en Swagger (`http://localhost:8000/docs`), en el grupo **inscripciones**.

### Reglas

1. **Cupo (CA2 y CA5):** una actividad no puede tener más inscritos que su `cupo_maximo`. Si está llena, la API responde **409**: «No quedan cupos disponibles para esta actividad». Esto se cumple **incluso si varias personas se inscriben exactamente al mismo tiempo** (ver «¿Cómo se controla el cupo?»).
2. **Sin duplicados (CA3):** un alumno no puede estar inscrito dos veces en la misma actividad. Si se intenta, la API responde **409**: «El alumno ya está inscrito en esta actividad». La base de datos también lo impide por su cuenta, con una restricción `UNIQUE`.
3. **Cancelar libera el cupo (CA1):** al cancelar, la inscripción **no se borra**: queda con estado `cancelada` y la fecha de cancelación. El cupo vuelve a estar disponible. Si el alumno se inscribe otra vez, se **reactiva la misma inscripción**.
4. **Solo el apoderado del alumno** puede inscribirlo o cancelar su inscripción. Si no, la API responde **403**.
5. **Actividades pasadas o cerradas:** no se puede inscribir ni cancelar en una actividad que ya ocurrió (según la hora de Chile) o que tiene las inscripciones cerradas. La API responde **409**.

### Respuestas de error

Siguen el mismo formato que el resto de la API: `{"detail": "mensaje"}`.

| Código | Cuándo |
|---|---|
| **400** | Datos inválidos: `alumno_id` o `apoderado_id` faltantes, ≤ 0 o no numéricos, o un filtro de estado desconocido. |
| **403** | El apoderado no es apoderado de ese alumno. |
| **404** | La actividad, el alumno, el apoderado o la inscripción no existen (o el alumno o apoderado están inactivos). |
| **409** | Sin cupos, alumno ya inscrito, inscripción ya cancelada o actividad pasada o cerrada. |
| **503** | PostgreSQL no está disponible. Lo maneja el código que ya existía en `core/errors.py`. |

---

## Ejemplos

**Inscribir:** `POST /api/v1/actividades/3/inscripciones`

```json
{ "alumno_id": 1, "apoderado_id": 1 }
```

Respuesta **201**:

```json
{
  "id": 1,
  "actividad_id": 3,
  "alumno_id": 1,
  "apoderado_id": 1,
  "estado": "inscrita",
  "creada_en": "2026-11-05T22:10:00.000000Z",
  "actualizada_en": "2026-11-05T22:10:00.000000Z",
  "cancelada_en": null,
  "cupos_disponibles": 1
}
```

> Los valores de los ejemplos son **ilustrativos**: los `id` y las fechas reales dependen de tu base de datos.

**Cancelar:** `POST /api/v1/inscripciones/1/cancelar`

```json
{ "apoderado_id": 1 }
```

Responde **200** con la misma estructura, `"estado": "cancelada"` y `cancelada_en` con la fecha.

**Asistentes (organizador):** `GET /api/v1/actividades/3/asistentes?estado=todas`

El filtro `estado` acepta `inscrita` (por defecto), `cancelada` o `todas`. La respuesta trae la actividad con sus cupos, `total_inscritos`, `total_cancelados` y la lista `asistentes`, con el código, el nombre y el estado de cada alumno.

---

## ¿Cómo se controla el cupo con concurrencia? (CA2)

**El problema:** si dos apoderados presionan «Inscribir» al mismo tiempo cuando queda **1 cupo**, ambas solicitudes podrían contar «hay 1 cupo» antes de que la otra guarde, y las dos se aceptarían. La actividad quedaría con sobrecupo.

**La solución:** antes de contar, la API **bloquea la fila de la actividad** en PostgreSQL con `SELECT ... FOR UPDATE`:

```python
actividad = db.scalars(
    select(Actividad).where(Actividad.id == actividad_id).with_for_update()
).first()
...
inscritos = _contar_inscritos(db, actividad_id)   # se cuenta DESPUÉS del bloqueo
if inscritos >= actividad.cupo_maximo:
    raise HTTPException(status_code=409, detail="No quedan cupos disponibles para esta actividad")
```

Si llega una segunda solicitud para la **misma** actividad, PostgreSQL la hace **esperar** hasta que la primera termine. Recién entonces cuenta, y ya ve la inscripción anterior. Las inscripciones a **actividades distintas** no se bloquean entre sí.

### Evidencia

Se probó en un **PostgreSQL 16 real**: 6 sesiones intentan inscribirse **al mismo tiempo** en una actividad con **cupo 2**, siguiendo la misma secuencia que la API. Entre contar e insertar se agregó una pausa de 0,3 s, para que la carrera sea evidente.

| Prueba | Aceptadas | Rechazadas | Inscritas en la base |
|---|---|---|---|
| **Con `FOR UPDATE`** (como la API), 5 rondas | 2 en cada ronda | 4 en cada ronda (todas por `SOBRECUPO`) | **2** ✅ |
| **Sin bloqueo** (control), 3 rondas | 6 en cada ronda | 0 | **6** ❌ (el triple del cupo) |

El control muestra que el problema es real y que `FOR UPDATE` lo evita. El registro completo está en `docs/evidencia/HU-19/concurrencia-postgresql.txt`, y el script para repetirlo en Docker en `docs/evidencia/HU-19/concurrencia-postgresql.sh`.

---

## Instalación (una sola vez)

> Desde TEC-16, el esquema se crea con **migraciones versionadas** (`sql/migraciones/`). Las tablas de esta historia están en `V002__inscripciones.sql` y los datos demo en `sql/seed/S001__datos_demo.sql`. Detalles en `docs/TEC-16-postgresql-migraciones.md`.

### Si tu volumen de PostgreSQL ya existía (lo más probable)

Desde `HITO-3/backend`:

```bash
docker compose up -d --build
docker compose exec postgres sh /sql/migrar.sh
```

El migrador aplica solo lo que falta y se puede ejecutar varias veces sin duplicar nada. Funciona igual en Git Bash y en PowerShell.

### Si partes con una base nueva

`docker compose up -d --build` aplica todas las migraciones y carga los datos demo automáticamente.

### Datos de demostración que carga el script

Todos son **ficticios**: no hay datos reales de menores.

| Tipo | Datos |
|---|---|
| Apoderados | `apoderado.demo1@ejemplo.cl` (alumnos DEMO-A01 a A05) y `apoderado.demo2@ejemplo.cl` (alumno DEMO-A06) |
| Alumnos | `DEMO-A01` a `DEMO-A06` («Alumno Demo 01» a «06») |
| Actividades | Salida a la granja (cupo 20), Taller de reciclaje (cupo 10) y **Taller de cuentacuentos con cupo 2**, para probar el sobrecupo |

Las fechas de las actividades se calculan a partir del día en que se ejecuta el script: 5, 7 y 10 días después.

---

## Cómo probar

### Prueba automática de punta a punta (recomendada)

Con Docker levantado, desde `HITO-3/backend`:

```bash
docker compose exec api python -m scripts.prueba_hu19
```

El script:
- Crea sus **propias actividades de prueba** (`TEST-HU19-*`), así que se puede repetir sin ensuciar los datos demo.
- Ejecuta todos los casos contra la **API real**, incluidas **5 rondas de 6 solicitudes HTTP simultáneas** a una actividad con cupo 3.
- Imprime **PASS o FAIL** por caso y un resumen final, por ejemplo `Resultado: 25/25 PASS`.
- Al terminar, borra lo que creó. Con `--conservar` deja las actividades de prueba, para revisarlas en Swagger.

Guarda la salida como evidencia:

```bash
docker compose exec api python -m scripts.prueba_hu19 > docs/evidencia/HU-19/prueba-api.txt
```

### Prueba manual en Swagger

1. Abre `http://localhost:8000/docs`.
2. `GET /api/v1/alumnos` y `GET /api/v1/actividades`: anota los `id` de DEMO-A01, DEMO-A02 y DEMO-A03, y el del **Taller de cuentacuentos** (cupo 2).
3. Anota el `id` de `apoderado.demo1@ejemplo.cl`. Normalmente es el 1 si la base era nueva; si no, búscalo en la tabla `apoderados`.
4. `POST /api/v1/actividades/{id}/inscripciones` con DEMO-A01 → **201**, `cupos_disponibles: 1`.
5. Repite con el mismo alumno → **409** «ya está inscrito».
6. Inscribe a DEMO-A02 → **201**, `cupos_disponibles: 0`.
7. Inscribe a DEMO-A03 → **409** «No quedan cupos». **Esta es la evidencia del CA5.**
8. `GET /api/v1/actividades/{id}/asistentes` → aparecen A01 y A02 como `inscrita`.
9. `POST /api/v1/inscripciones/{id}/cancelar` con el `id` de la inscripción de A01 → **200**, `cancelada`.
10. Inscribe a DEMO-A03 → ahora **201**, porque el cupo se liberó.

### Probar la indisponibilidad (503)

```bash
docker compose stop postgres
# En Swagger: GET /api/v1/actividades  →  503 "Servicio de datos temporalmente no disponible"
docker compose start postgres
```

### Consultar asistentes directamente en SQL (CA4)

```bash
docker compose exec postgres psql -U pequenos_reyes -d pequenos_reyes -c "SELECT actividad, alumno_codigo, alumno_nombre, estado FROM v_asistentes_actividad ORDER BY actividad, alumno_nombre;"
```

---

## Decisiones tomadas (validar con el equipo y el revisor)

1. **Sin inicio de sesión todavía:** la API aún no tiene autenticación, así que el apoderado se identifica con `apoderado_id` en el cuerpo de la solicitud. La regla «solo el apoderado del alumno» se valida igual, pero **cualquiera podría enviar otro `apoderado_id`**. Cuando exista login, ese dato debe salir del token y no del cuerpo. Lo mismo vale para la lista de asistentes, que hoy cualquiera puede consultar.
2. **Cancelar no borra:** se conserva el historial con estado y fechas. Al reinscribirse se reactiva la misma fila, así la restricción `UNIQUE (actividad_id, alumno_id)` sigue impidiendo duplicados.
3. **Bloqueo por actividad (`FOR UPDATE`):** se eligió en vez de un contador de cupos o un nivel de aislamiento `SERIALIZABLE`. Es simple, se puede demostrar y solo hace esperar a quienes se inscriben en la **misma** actividad.
4. **La fecha de «hoy» la calcula PostgreSQL con la zona de Chile**, no el contenedor, que normalmente usa UTC. Es la misma idea que en HU-04 del Taller 2.
5. **Crear actividades:** la historia no lo pide, así que no hay un endpoint para crearlas. Las actividades demo vienen en `sql/seed/S001__datos_demo.sql`. (TEC-16 agregó después `POST /actividades`.)
6. **Restricción académica:** si estas funciones equivalen al **caso 3.6** de la pauta, hay que **ratificar con el docente** su correspondencia con Pequeños Reyes. No se asume aprobada.

## Qué falta para cerrar la historia

- [ ] Ejecutar `sh /sql/migrar.sh` y `python -m scripts.prueba_hu19` en el computador del equipo y guardar la salida en `docs/evidencia/HU-19/prueba-api.txt`.
  - La lógica de la API **no se pudo ejecutar** en el entorno donde se programó, porque no había acceso para instalar FastAPI. El código se revisó con `py_compile` y `pyflakes`, y la parte de base de datos (tablas, restricciones, vista, datos demo y concurrencia) **sí se probó en PostgreSQL 16 real**.
- [ ] Capturas de Swagger: 201 al inscribir, 409 por sobrecupo y lista de asistentes.
- [ ] Probar el 503 deteniendo PostgreSQL.
- [ ] Pantalla en React para inscribir y cancelar, si el equipo lo incluye en el alcance de esta historia.
- [ ] PR revisado por Daniel Cortez.

---

<details>
<summary><strong>Detalle técnico: archivos</strong></summary>

| Archivo | Cambio |
|---|---|
| `sql/migraciones/V002__inscripciones.sql` + `sql/seed/S001__datos_demo.sql` | Tablas `actividades` e `inscripciones`, índice, vista `v_asistentes_actividad` y datos demo (originalmente `sql/002_inscripciones.sql`; TEC-16 lo separó en migración y semilla). |
| `app/db/models.py` | Modelos `Actividad` e `Inscripcion`, con las mismas restricciones y nombres que el SQL, para que `create_all` sea equivalente. |
| `app/schemas/inscripciones.py` | **Nuevo.** `InscripcionIn`, `CancelacionIn`, `InscripcionOut`, `ActividadOut`, `AsistenteOut` y `AsistentesOut`. |
| `app/services/inscripciones.py` | **Nuevo.** Reglas de negocio: bloqueo `FOR UPDATE`, cupo, duplicados, permisos, fechas, cancelación y asistentes. |
| `app/api/inscripciones.py` | **Nuevo.** Las 5 rutas del grupo `inscripciones`. |
| `app/main.py` | Registra el router y documenta el 403 en Swagger. |
| `docker-compose.yml` | Monta las migraciones (desde TEC-16, la carpeta `sql/` completa). |
| `Dockerfile` | Copia `scripts/` a la imagen. |
| `scripts/prueba_hu19.py` | **Nuevo.** Prueba de punta a punta con PASS/FAIL. Solo usa la librería estándar y la app. |
| `docs/evidencia/HU-19/*` | **Nuevo.** Evidencia de concurrencia y el script para repetirla. |
| `.gitignore` | **Corrección:** tenía los saltos de línea escritos como el texto `\n`, así que no ignoraba nada (ni `.env` ni `__pycache__`). |

**Restricciones en PostgreSQL** (probadas):

- `uq_inscripcion_actividad_alumno UNIQUE (actividad_id, alumno_id)`: impide duplicados.
- `ck_inscripcion_estado CHECK (estado IN ('inscrita','cancelada'))`.
- `ck_actividades_cupo_positivo CHECK (cupo_maximo > 0)`.
- Las claves foráneas usan `ON DELETE RESTRICT`: no se puede borrar un alumno ni una actividad que tenga inscripciones.

</details>
