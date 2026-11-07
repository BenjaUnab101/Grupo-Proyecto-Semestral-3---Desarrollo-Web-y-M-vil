# Comunicados guardados en PostgreSQL (HU-21)

> **ID estable:** PR-S3/HU-21 · **Referencias previas:** SCRUM-47, 48 · **Dependencias:** SCRUM-94, SCRUM-95
> **Revisor cruzado:** Diego Rubilar · **Restricción:** solo datos ficticios.

## En pocas palabras

- **Dirección** y el **personal** del jardín **publican, editan y eliminan comunicados** desde la API, indicando a qué nivel van dirigidos.
- Cada **apoderado** ve **solo los comunicados vigentes que le corresponden**: los generales y los del nivel de sus hijos.
- Los comunicados se guardan en **PostgreSQL**. **MongoDB** guarda una **bitácora**: quién publicó, editó o eliminó cada comunicado, cuándo y qué cambió.

Los comunicados de ejemplo del proyecto pasaron a la semilla de PostgreSQL (`sql/seed/S002__comunicados_demo.sql`), junto con casos para probar los filtros (uno vencido, uno programado y un borrador).

## Reglas

### ¿Cuándo se muestra un comunicado? (vigencia)

Un apoderado ve un comunicado solo si:
1. Está **publicado** (no es un borrador).
2. Su **fecha de publicación ya llegó**. Un comunicado programado para el futuro no aparece antes de tiempo.
3. **No venció:** no tiene fecha de término, o la fecha es hoy o posterior (hora de Chile).

Los borradores, programados y vencidos solo los ven dirección y el personal, con `?vigentes=false`.

### ¿Cuáles le corresponden a cada apoderado?

`GET /api/v1/apoderados/{id}/comunicados` devuelve los vigentes de nivel **General** más los del **grupo de las salas** donde sus hijos están matriculados este año. Cada sala tiene su grupo (`Preescolar` o `Salas TEL`) en la columna `salas.grupo_comunicados`.

| Apoderado demo | Hijos | Ve los niveles |
|---|---|---|
| `apoderado.demo1@ejemplo.cl` | DEMO-A01 a A05 (salas de preescolar) | General y **Preescolar** |
| `apoderado.demo2@ejemplo.cl` | DEMO-A06 (sala TEL) | General y **Salas TEL** |

### Permisos (CA3)

La API todavía no tiene inicio de sesión, así que quien publica se identifica con el encabezado **`X-Usuario-Id`** (el `id` de la tabla `usuarios`).

| Usuario | Puede |
|---|---|
| Sin identificarse | Ver los comunicados vigentes. |
| **Dirección** (`direccion.demo@ejemplo.cl`) | Publicar, editar o eliminar **cualquier** comunicado; ver borradores y la bitácora. |
| **Personal** (`educadora.demo@ejemplo.cl`) | Publicar, y editar o eliminar **solo los suyos**; ver borradores y la bitácora. |
| **Apoderado** | Solo ver. Si intenta publicar, recibe **403**. |

> **Es una simulación:** cualquiera podría enviar otro `X-Usuario-Id`. Cuando exista inicio de sesión, solo cambia la función `usuario_opcional()` de `app/core/permisos.py`.

## Endpoints

| Método | Ruta | Quién | Qué hace |
|---|---|---|---|
| `GET` | `/api/v1/comunicados` | Todos | Lista los vigentes. Filtros: `nivel`, `urgente`, `desde`, `hasta`, `limite` y `desplazamiento`. |
| `GET` | `/api/v1/comunicados/{id}` | Todos | Ver uno. Para un apoderado, un borrador o un vencido responde 404. |
| `GET` | `/api/v1/apoderados/{id}/comunicados` | Todos | Los vigentes que le corresponden a ese apoderado. |
| `POST` | `/api/v1/comunicados` | Dirección o personal | Publicar. |
| `PATCH` | `/api/v1/comunicados/{id}` | Dirección o su autor | Modificar solo los campos enviados. |
| `DELETE` | `/api/v1/comunicados/{id}` | Dirección o su autor | Eliminar (el contenido queda en la bitácora). |
| `GET` | `/api/v1/comunicados/{id}/bitacora` | Dirección o personal | Historial de cambios, leído desde MongoDB. |

**Ejemplo para publicar** (`POST /api/v1/comunicados` con `X-Usuario-Id` de dirección):

```json
{
  "titulo": "Taller de estimulación del lenguaje",
  "cuerpo": "Invitamos a las familias de las salas TEL a un taller práctico.",
  "nivel": "Salas TEL",
  "categoria": "Actividades",
  "es_urgente": false,
  "fecha_publicacion": "2026-11-10T09:00:00-03:00",
  "vigente_hasta": "2026-11-30"
}
```

- `fecha_publicacion` es opcional (si no se envía, vale «ahora») y debe llevar zona horaria, como el `-03:00` del ejemplo.
- `vigente_hasta` es opcional (sin él, no vence) y debe ser igual o posterior al día de publicación.

### Respuestas de error

| Código | Cuándo |
|---|---|
| **400** | Nivel inexistente, título de menos de 3 letras, cuerpo vacío, fecha sin zona horaria, vigencia que termina antes de publicarse, o `desde` posterior a `hasta`. |
| **401** | Publicar, editar, eliminar o ver la bitácora sin `X-Usuario-Id`, o con un usuario que no existe. |
| **403** | Un apoderado intenta publicar, alguien del personal intenta modificar un comunicado ajeno, o se pide `vigentes=false` sin ser dirección ni personal. |
| **404** | El comunicado o el apoderado no existen. |
| **503** | PostgreSQL no disponible (o MongoDB, al pedir la bitácora). |

## La bitácora en MongoDB

Cada vez que se publica, edita o elimina un comunicado, se agrega un documento a la colección **`bitacora_comunicados`**:

```json
{
  "comunicado_id": 9,
  "accion": "editar",
  "usuario_id": 2,
  "rol": "administrador",
  "fecha": "2026-11-07T15:40:00Z",
  "cambios": { "titulo": "Taller TEL (actualizado)", "es_urgente": false }
}
```

- **Publicar** y **eliminar:** guardan el comunicado completo, así el contenido de uno eliminado no se pierde.
- **Editar:** guarda los campos que se cambiaron, con su valor nuevo.

**¿Por qué así?** PostgreSQL guarda el estado **actual**, con sus relaciones y restricciones. MongoDB guarda el **historial**, que tiene una forma distinta según la acción; para eso un documento flexible es más cómodo que una tabla.

## Cómo probarlo

Desde `HITO-3/backend`, con Docker levantado:

1. Aplicar las migraciones: `docker compose exec postgres sh /sql/migrar.sh`.
2. **Base de datos:** `bash docs/evidencia/HU-21/pruebas-postgresql.sh` (vigencia, pertinencia y restricciones; solo lee).
3. **API de punta a punta (23 casos):**
   ```bash
   docker compose exec api python -m scripts.prueba_hu21
   ```
   Cubre publicar, leer, modificar y eliminar; los filtros; permisos (401 y 403); datos inválidos (400 y 404) y la bitácora en MongoDB. Termina con `Resultado: 23/23 PASS` y borra lo que creó. Para guardar la evidencia: `... > docs/evidencia/HU-21/prueba-api.txt`.
4. **Indisponibilidad:**
   ```bash
   docker compose stop postgres     # GET /api/v1/comunicados → 503
   docker compose start postgres
   docker compose stop mongo        # POST /api/v1/comunicados → 201 igual (la bitácora no bloquea)
   docker compose start mongo
   ```

## Evidencia

`docs/evidencia/HU-21/pruebas-postgresql.txt`, en un **PostgreSQL 16 real**:

| Prueba | Resultado |
|---|---|
| Vigentes: de 8 comunicados demo se muestran 5 | ✅ Quedan fuera el vencido, el programado y el borrador |
| Pertinencia: apoderado 1 → General y Preescolar; apoderado 2 → General y Salas TEL | ✅ |
| 7 restricciones (nivel, título, cuerpo, vigencia, autor, borrar un autor y grupo de sala) | ✅ Todas rechazan |

> **Falta ejecutar la API real.** En el equipo donde se programó no se pudieron instalar FastAPI ni SQLAlchemy. El código se revisó con `pyflakes`. El equipo debe ejecutar el paso 3 y guardar la salida.

## Decisiones para validar con el equipo

1. **PostgreSQL es la fuente de los comunicados y MongoDB guarda la bitácora**, porque la historia pide comunicados persistidos en SQL y así la parte NoSQL sigue teniendo un uso claro.
2. **La bitácora no bloquea:** si MongoDB está caído, el comunicado se guarda igual (solo falta esa entrada en la bitácora). Rechazar la publicación por un problema de la bitácora impediría publicar avisos urgentes.
3. **Filtro de nivel estricto:** `?nivel=Preescolar` devuelve solo los de Preescolar, igual que el filtro de HU-03. La vista de cada apoderado sí suma los generales.
4. **Identidad simulada con `X-Usuario-Id`** hasta que exista inicio de sesión.
5. **Restricción académica:** si esto equivale al **caso 3.6** de la pauta, hay que ratificarlo con el docente.

## Qué falta para cerrar la historia

- [ ] Ejecutar `pruebas-postgresql.sh` y `prueba_hu21` en Docker y guardar las salidas en `docs/evidencia/HU-21/`.
- [ ] Capturas de Swagger: publicar (201), apoderado intentando publicar (403) y lista filtrada.
- [ ] PR revisado por Diego Rubilar.

Esta historia entrega la API de comunicados; la pantalla de React no forma parte de ella.

<details>
<summary><strong>Detalles técnicos</strong> (archivos de esta carpeta)</summary>

| Archivo | Qué contiene |
|---|---|
| `sql/migraciones/V004__comunicados.sql` | Tabla `comunicados` con restricciones (nivel, título, cuerpo, vigencia) e índices; columna `salas.grupo_comunicados`. |
| `sql/seed/S002__comunicados_demo.sql` | 3 salas demo, matrículas del año y 8 comunicados ficticios. |
| `app/db/models.py` | Modelo `Comunicado` y `Sala.grupo_comunicados`. |
| `app/db/mongo.py` | Conexión a MongoDB y colección `bitacora_comunicados`. |
| `mongo/init.js` | Crea la colección de la bitácora con su validador e índices (en un volumen vacío). |
| `app/schemas/comunicado.py` | `ComunicadoIn` y `ComunicadoUpdate` (quitan espacios sobrantes con `str_strip_whitespace`), `ComunicadoOut`, `ComunicadosPertinentesOut` y `EntradaBitacoraOut`. |
| `app/services/comunicados.py` | Vigencia (condición `VIGENTE`), filtros, pertinencia, permisos, bloqueo al modificar y registro en la bitácora. |
| `app/api/comunicados.py` | Las 7 rutas. |
| `app/core/permisos.py` | Identidad con `X-Usuario-Id` y los permisos `editor_requerido`, `es_editor` y `puede_modificar`. |
| `app/main.py` | Documenta en Swagger las respuestas 401 (sin identificarse) y 403 (sin permiso). |
| `scripts/utilidades.py`, `scripts/prueba_hu21.py` | Prueba de punta a punta (23 casos). |
| `docs/evidencia/HU-21/` | Script y resultado de las pruebas en PostgreSQL. |

</details>
