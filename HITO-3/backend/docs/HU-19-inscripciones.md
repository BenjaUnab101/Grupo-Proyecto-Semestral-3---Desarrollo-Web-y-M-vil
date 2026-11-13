# Inscripciones a actividades, cupos y asistentes (HU-19)

> **ID estable:** PR-S3/HU-19 · **Referencias previas:** SCRUM-49, 57, 63 · **Dependencias:** SCRUM-96, SCRUM-98
> **Revisor cruzado:** Daniel Cortez · **Restricción:** solo datos ficticios, nada de datos reales de menores.

## En pocas palabras

La API del jardín permite que un **apoderado inscriba o cancele** la participación de sus hijos en una actividad (una salida o un taller), **respetando los cupos** aunque muchas familias se inscriban al mismo tiempo. El **organizador** puede ver quiénes asisten y el estado de cada inscripción.

## Qué se puede hacer

| Quién | Qué | Endpoint |
|---|---|---|
| Todos | Ver las próximas actividades y sus cupos disponibles | `GET /api/v1/eventos` |
| Todos | Ver una actividad | `GET /api/v1/eventos/{id}` |
| Apoderado | **Inscribir** a su hijo o hija | `POST /api/v1/eventos/{id}/inscripciones` |
| Apoderado | **Cancelar** una inscripción | `POST /api/v1/inscripciones/{id}/cancelar` |
| Organizador | Ver la **lista de asistentes** y su estado | `GET /api/v1/eventos/{id}/asistentes` |

Todos aparecen en Swagger (`http://localhost:8000/docs`), en el grupo **inscripciones**.

> Las rutas usan `/eventos` porque `/actividades` corresponde a las **actividades escolares** de HU-18 (otro grupo de Swagger). Las dos conviven y el calendario de la página muestra ambas.

## Reglas

1. **Cupo (CA2 y CA5):** una actividad no puede tener más inscritos que su cupo. Si está llena, la API responde **409**: «No quedan cupos disponibles para esta actividad». Se cumple **incluso si varias personas se inscriben exactamente al mismo tiempo** (ver más abajo).
2. **Sin duplicados (CA3):** un alumno no puede estar inscrito dos veces en la misma actividad. Si se intenta, responde **409**: «El alumno ya está inscrito en esta actividad». La base de datos también lo impide por su cuenta.
3. **Cancelar libera el cupo (CA1):** la inscripción **no se borra**. Queda con estado `cancelada` y la fecha de cancelación, y el cupo vuelve a estar disponible. Si el alumno se inscribe otra vez, se reactiva la misma inscripción.
4. **Solo el apoderado del alumno** puede inscribirlo o cancelar su inscripción. Si no, la API responde **403**.
5. **Actividades pasadas o cerradas:** no se puede inscribir ni cancelar en una actividad que ya ocurrió (según la hora de Chile) o que tiene las inscripciones cerradas. La API responde **409**.

## Respuestas de error

Todas siguen el formato de la API: `{"detail": "mensaje"}`.

| Código | Cuándo |
|---|---|
| **400** | Datos inválidos: `alumno_id` o `apoderado_id` faltantes o menores que 1, o un filtro de estado desconocido. |
| **403** | El apoderado no es apoderado de ese alumno. |
| **404** | La actividad, el alumno, el apoderado o la inscripción no existen. |
| **409** | Sin cupos, alumno ya inscrito, inscripción ya cancelada, o actividad pasada o cerrada. |
| **503** | PostgreSQL no está disponible. |

## Ejemplos

**Inscribir:** `POST /api/v1/eventos/3/inscripciones` con el cuerpo `{ "alumno_id": 1, "apoderado_id": 1 }`. Responde **201**:

```json
{
  "id": 1,
  "actividad_id": 3,
  "alumno_id": 1,
  "apoderado_id": 1,
  "estado": "inscrita",
  "creada_en": "2026-11-07T15:10:00Z",
  "actualizada_en": "2026-11-07T15:10:00Z",
  "cancelada_en": null,
  "cupos_disponibles": 1
}
```

**Cancelar:** `POST /api/v1/inscripciones/1/cancelar` con `{ "apoderado_id": 1 }`. Responde **200** con `"estado": "cancelada"`.

**Asistentes:** `GET /api/v1/eventos/3/asistentes?estado=todas`. El filtro `estado` acepta `inscrita` (por defecto), `cancelada` o `todas`. Trae la actividad con sus cupos, los totales de inscritos y cancelados, y la lista de alumnos con su estado.

> Los `id` y las fechas de los ejemplos son ilustrativos.

## ¿Cómo se controla el cupo cuando muchos se inscriben a la vez? (CA2)

**El problema:** si dos apoderados presionan «Inscribir» al mismo tiempo cuando queda **1 cupo**, las dos solicitudes podrían ver «queda 1 cupo» antes de que la otra guarde, y se aceptarían ambas.

**La solución:** antes de contar los inscritos, la API **bloquea la actividad** en PostgreSQL (`SELECT ... FOR UPDATE`). Si llega otra solicitud para la **misma** actividad, PostgreSQL la hace esperar hasta que la primera termine; recién entonces cuenta, y ya ve el cupo ocupado. Las inscripciones a actividades distintas no se esperan entre sí.

```python
actividad = buscar(db, Actividad, actividad_id, "Actividad no encontrada", bloquear=True)  # FOR UPDATE
...
if contar_inscritos(db, actividad_id) >= actividad.cupo_maximo:
    raise HTTPException(409, "No quedan cupos disponibles para esta actividad")
```

## Cómo probarlo

Desde `HITO-3/backend`, con Docker levantado:

1. **Aplicar las migraciones** (crean las tablas y los datos de demostración):
   ```bash
   docker compose exec postgres sh /sql/migrar.sh
   ```
2. **Prueba automática de la API (18 casos):**
   ```bash
   docker compose exec api python -m scripts.prueba_hu19
   ```
   Crea sus propias actividades de prueba (`TEST-HU19-*`) y las borra al terminar. Incluye **3 rondas de 6 inscripciones simultáneas** en una actividad con cupo 3. Termina con `Resultado: 18/18 PASS`. Para guardar la salida como evidencia:
   ```bash
   docker compose exec api python -m scripts.prueba_hu19 > docs/evidencia/HU-19/prueba-api.txt
   ```
3. **Prueba manual en Swagger** (`http://localhost:8000/docs`), con el **Taller de cuentacuentos** (cupo 2):
   1. Inscribir a DEMO-A01 → **201**, queda 1 cupo.
   2. Inscribir otra vez a DEMO-A01 → **409** «ya está inscrito».
   3. Inscribir a DEMO-A02 → **201**, quedan 0 cupos.
   4. Inscribir a DEMO-A03 → **409** «No quedan cupos» (**CA5**).
   5. Cancelar la inscripción de DEMO-A01 → **200**, y DEMO-A03 ya se puede inscribir.
4. **Indisponibilidad (503):** `docker compose stop postgres`, pedir `GET /api/v1/eventos` → 503; luego `docker compose start postgres`.

**Datos de demostración** (todos ficticios): `apoderado.demo1@ejemplo.cl` con los alumnos DEMO-A01 a A05, `apoderado.demo2@ejemplo.cl` con DEMO-A06, y tres actividades: Salida a la granja (cupo 20), Taller de reciclaje (cupo 10) y Taller de cuentacuentos (cupo 2).

## Evidencia

`docs/evidencia/HU-19/concurrencia-postgresql.txt`, en un **PostgreSQL 16 real**: 6 sesiones intentan inscribirse **al mismo tiempo** en una actividad con **cupo 2**, siguiendo los mismos pasos que la API. Se agregó una pausa de 0,3 s entre contar e insertar para que la carrera sea evidente.

| Prueba | Aceptadas | Rechazadas | Inscritas en la base |
|---|---|---|---|
| **Con bloqueo** (como la API), 5 rondas | 2 por ronda | 4 por ronda (sin cupo) | **2** ✅ |
| **Sin bloqueo** (control), 3 rondas | 6 por ronda | 0 | **6** ❌ (el triple del cupo) |

El control muestra que el problema existe y que el bloqueo lo evita. El script para repetirlo en Docker es `docs/evidencia/HU-19/concurrencia-postgresql.sh`.

> **Falta ejecutar la API real.** En el equipo donde se programó no se pudieron instalar FastAPI ni SQLAlchemy. El código Python se revisó con `pyflakes`, y la parte de base de datos sí se probó en PostgreSQL 16 real. El equipo debe ejecutar el paso 2 y guardar la salida.

## Decisiones para validar con el equipo

1. **Sin inicio de sesión todavía:** el apoderado se identifica con `apoderado_id` en el cuerpo de la solicitud. La regla «solo el apoderado del alumno» se valida igual, pero cualquiera podría enviar otro id. Cuando exista login, ese dato debe salir de la sesión.
2. **Cancelar no borra**, para conservar el historial con estados y fechas.
3. **Bloqueo por actividad (`FOR UPDATE`)**, porque es simple, se puede demostrar y solo hace esperar a quienes se inscriben en la misma actividad.
4. **La fecha de «hoy» la calcula PostgreSQL con la zona de Chile**, no el contenedor, que normalmente usa UTC.
5. **Restricción académica:** si estas funciones equivalen al **caso 3.6** de la pauta, hay que ratificar con el docente su correspondencia con Pequeños Reyes.

## Qué falta para cerrar la historia

- [ ] Ejecutar `prueba_hu19` en Docker y guardar la salida en `docs/evidencia/HU-19/prueba-api.txt`.
- [ ] Capturas de Swagger: 201 al inscribir, 409 por falta de cupo y lista de asistentes.
- [ ] PR revisado por Daniel Cortez.

<details>
<summary><strong>Detalles técnicos</strong> (archivos de esta carpeta)</summary>

| Archivo | Qué contiene |
|---|---|
| `sql/migraciones/V002__inscripciones.sql` | Tablas `actividades` e `inscripciones`, índice por actividad y estado, y la vista `v_asistentes_actividad`. |
| `app/db/models.py` | Modelos `Actividad` e `Inscripcion`. |
| `app/schemas/inscripciones.py` | Datos de entrada y salida: `InscripcionIn`, `CancelacionIn`, `InscripcionOut`, `ActividadOut`, `AsistentesOut`… |
| `app/services/inscripciones.py` | Reglas: bloqueo `FOR UPDATE`, cupo, duplicados, permisos, fechas, cancelación y asistentes. Ayudantes `buscar()` (trae una fila o responde 404) y `contar_inscritos()`. |
| `app/api/inscripciones.py` | Las rutas del grupo `inscripciones`. |
| `app/main.py` | Registra el router. |
| `Dockerfile` | Copia `scripts/` a la imagen, para poder ejecutar las pruebas dentro del contenedor. |
| `.gitignore` | Una regla por línea (`.env`, `.venv/`, `__pycache__/`, `*.py[cod]`). |
| `scripts/utilidades.py` | Funciones compartidas por los scripts de prueba: llamar a la API, PASS/FAIL y resumen. |
| `scripts/prueba_hu19.py` | Prueba de punta a punta (18 casos, con concurrencia real por HTTP). |
| `docs/evidencia/HU-19/` | Evidencia de concurrencia en PostgreSQL y el script para repetirla. |

**Restricciones en PostgreSQL:**
- `UNIQUE (actividad_id, alumno_id)`: impide duplicados.
- `CHECK (estado IN ('inscrita','cancelada'))` y `CHECK (cupo_maximo > 0)`.
- Claves foráneas con `ON DELETE RESTRICT`: no se puede borrar un alumno ni una actividad que tenga inscripciones.

</details>
