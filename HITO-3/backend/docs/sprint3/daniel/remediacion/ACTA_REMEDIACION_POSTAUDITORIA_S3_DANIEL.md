# Acta de remediación postauditoría · Sprint 3 · Daniel Cortez

**Fecha:** 09-11-2026 · **Ejecutor:** Claude Code (Opus 5.5) a pedido de Daniel Cortez ·
**Base de trabajo:** la entrega del 08-11-2026 (`ENTREGA_SPRINT3_DANIEL.zip`, SHA-256
`a3e8a154c01ec144f1777af2f707ad93035da3a2a3097892495b9c6d6427b2f4`).
**Tickets (sin cambios de trazabilidad):** SCRUM-92, 96, 121, 122, 102, 126, 127, 105, 107, 114.

> **Dictamen de esta remediación: NO hay certificación final.** Quedan riesgos que dependen de
> otros integrantes (sección 7) y la revisión cruzada humana está pendiente. Esta acta no autoriza
> el merge.

> **Informe de auditoría:** el archivo `AUDITORIA_SPRINT3_DANIEL_PEQUENOS_REYES_2026-11-08.md` **no
> fue entregado** en esta sesión (no estaba adjunto ni se encontró en el equipo). La remediación se
> hizo sobre los 6 objetivos del encargo. Si el informe contiene hallazgos adicionales, deben
> cruzarse con esta acta.

**Restricciones cumplidas:** no se modificó Jira; no hubo commit, push, merge, rebase ni PR; no se
tocó el repositorio oficial; no se cambiaron migraciones existentes; no se eliminó ningún archivo de
compañeros; solo se usaron datos ficticios (`@ejemplo.cl`, `DEMO-*`).

---

## 0. Hallazgo previo: la copia original es idéntica al `main` oficial

Se compararon los 219 archivos de `HITO-2/frontend-react` y `HITO-3/backend` de la copia original
(tomada antes de implementar) con el árbol de `main` de `BenjaUnab101/Grupo-Proyecto-Semestral-3---Desarrollo-Web-y-M-vil`
(último push 2026-11-08T14:13Z, API pública de GitHub), usando el hash de blob de Git de cada archivo.
**Resultado: 219/219 idénticos, sin archivos de más ni de menos.** Por lo tanto, `DIFF_vs_original.diff`
de la entrega anterior es también el diff exacto contra el `main` oficial a esa fecha.

---

## 1. Seguridad: suplantación (`X-Usuario-Id`) y falsificación de rol (`X-Rol`)

### 1.1 Mapa de rutas

| Grupo | Rutas | Autor | Cómo se identifica | Estado |
|---|---|---|---|---|
| **Nuevas (Sprint 3, Daniel)** | `/auth/*`, `/portal/*`, `/auditoria/*`, `/panel/*`, `/contacto` (GET/PATCH), `/contacto/mias` | Daniel | **Solo Bearer** (`usuario_autenticado` / `roles_requeridos`). Ignoran `X-Usuario-Id`. | Protegidas (R-01…R-06) |
| Nuevas públicas | `POST /contacto`, `POST /contacto/seguimiento` | Daniel | Sin sesión, por diseño (código + correo) | Protegidas por diseño |
| **Heredadas con `X-Usuario-Id`** | `/sesion/*`, `/comunicados` (escritura), `/prematriculas` (dirección) | Mirko (TEC-17, HU-21, HU-25) | `usuario_opcional`: Bearer o, si la identidad demo está activa, `X-Usuario-Id` | **Mitigado** (ver 1.2) |
| **Heredadas con `X-Rol`** | `/categorias-actividad`, `/organizadores`, `/actividades/*`, `/pagos/*`, `/documentos` (escritura) | HU-17/18/20/27 (otros integrantes) | El rol lo declara el navegador | **Mitigado parcialmente** (ver 1.3); corrección definitiva propuesta, sin aplicar |
| Heredadas sin identidad | `POST /eventos/{id}/inscripciones`, `GET /apoderados/{id}/inscripciones`, entre otras | Mirko (HU-19) | `apoderado_id` en el cuerpo o la URL, sin sesión | **Sin cambios: riesgo residual** (R-3) |

### 1.2 `X-Usuario-Id`: acción realizada
Solo en código ya modificado por Daniel (`app/core/permisos.py`, `app/core/config.py`):
1. **Producción la apaga siempre:** nueva propiedad `settings.identidad_demo_activa`
   (= `PERMITIR_IDENTIDAD_DEMO` **y** `APP_ENV != production`).
2. **Solo cuentas ficticias:** `X-Usuario-Id` solo puede actuar como cuentas `@ejemplo.cl`. Una
   cuenta con otro dominio responde 401 y solo entra con su contraseña.
3. Las rutas nuevas siguen sin aceptarlo en ningún modo.

### 1.3 `X-Rol`: acción realizada (sin tocar el código ajeno)
Nueva dependencia **global** `validar_cabecera_rol` (`app/core/permisos.py`, registrada en
`app/main.py` con `FastAPI(dependencies=[...])`). Se aplica a toda petición que traiga `X-Rol`:

| Petición | Modo desarrollo (identidad demo activa) | Modo estricto o producción |
|---|---|---|
| Bearer + `X-Rol` coherente con la sesión | pasa | pasa |
| Bearer + `X-Rol` distinto del rol de la sesión | **403** | **403** |
| `X-Usuario-Id` demo + `X-Rol` distinto de esa cuenta | **403** | 401 |
| `X-Rol` sin ninguna identidad | pasa (transitorio, **riesgo residual**) | **401** |

Equivalencias: `administrador` ↔ `direccion`/`dirección`; `organizador` ↔ `organizador`;
`apoderado` ↔ `apoderado`. Los encabezados se declaran con `include_in_schema=False` para no ensuciar
Swagger.

**Por qué no se cerró del todo en desarrollo:** las pantallas `GestionActividades.jsx`,
`GestionOrganizadores.jsx`, `Documentos.jsx` y `FlujoInscripcionEventos.jsx` usan
`services/eventosApi.js` y `documentosApi.js`, que llaman con `fetch` directo enviando solo `X-Rol`,
sin token. Cerrarlo rompería esas pantallas, que no son de Daniel.

### 1.4 Corrección definitiva PROPUESTA (no aplicada)
- `remediacion/PROPUESTA_X_ROL_RUTAS_HEREDADAS.patch`: en `app/api/eventos.py` y `app/api/documentos.py`
  reemplaza `x_rol = Header(...)` por `x_rol = Depends(rol_de_sesion)`. El rol sale del token y los
  servicios no cambian. `rol_de_sesion` ya está disponible en `app/core/permisos.py`, sin usar.
- Se probó aplicándolo **solo en una copia desechable** (`evidencias/remediacion/R7`):
  - `X-Rol` sin sesión → 401; Bearer de apoderado → 403; Bearer de dirección → 201.
  - Resultado de la sonda: **PASS**.
- **Requisitos antes de aplicarla, a cargo de sus autores:**
  1. Que `eventosApi.js` y `documentosApi.js` usen `pedir()` de `http.js`, que ya envía el token.
  2. Actualizar `tests_hu17/18/20/27`, que hoy envían solo `X-Rol`. Con la propuesta fallan, como
     se esperaba (registrado en R7).

---

## 2. Credenciales: `.env` versionado

| Archivo | ¿Versionado en `main`? | Claves (sin valores) | Commit que lo agregó o cambió |
|---|---|---|---|
| `HITO-3/backend/.env` | **Sí** (repositorio **público**) | `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `DATABASE_URL`, `MONGODB_URL`, `MONGODB_DATABASE`, `CORS_ORIGINS` | `91ed690` (2026-11-04) |
| `HITO-2/frontend-react/.env` | **Sí** | `VITE_API_URL` (no es secreto) | `842aea9`, `9a03068` (2026-11-03) |

Evaluación, sin revelar valores:
- `POSTGRES_PASSWORD` es **trivial**: igual al usuario o al nombre de la base, y de menos de 16 caracteres.
- `DATABASE_URL` repite esa contraseña.
- `MONGODB_URL` no lleva credenciales: MongoDB corre **sin autenticación** y con el puerto 27017
  publicado en el equipo.
- `.env` sí figura en `.gitignore` (raíz y backend), pero el archivo se versionó igual: ignorar no
  saca de Git lo que ya está versionado.
- El `.env` local es el mismo publicado.
- Ni la entrega ni este paquete incluyen `.env`.

**Severidad:** media. Son credenciales de una base de **desarrollo local** con datos ficticios, pero
están publicadas y son triviales. Si alguien reutilizó esa contraseña en otro lugar, el riesgo es alto.

**Procedimiento recomendado (lo ejecuta el equipo en la fase Git autorizada; aquí NO se ejecutó):**
1. Dejar de versionar sin borrar las copias locales:
   `git rm --cached HITO-3/backend/.env HITO-2/frontend-react/.env`, y luego commit.
   Confirmar que `HITO-2/frontend-react/.gitignore` también ignora `.env`.
2. **Rotar:** definir en cada `.env` local una contraseña nueva y no trivial.
   - Con volúmenes existentes, `POSTGRES_PASSWORD` no se vuelve a aplicar sola: hay que cambiarla
     dentro de la base con `docker compose exec postgres psql -U <usuario> -d <base> -c "ALTER USER <usuario> PASSWORD '<nueva>'"`
     y actualizar `DATABASE_URL`.
   - Con volúmenes nuevos basta con el `.env`.
3. **Historial:** la contraseña sigue en commits antiguos. Para purgarla hace falta `git filter-repo`
   o BFG más un push forzado, y que todos vuelvan a clonar. Es una decisión del equipo; si la
   contraseña se rota y no se usa en otro lugar, purgar es opcional.
4. Opcional y recomendado: activar autenticación en MongoDB, o no publicar 27017/5432 fuera de
   `localhost` (`127.0.0.1:5432:5432`).
5. Revisar si GitHub marcó alertas de *secret scanning* en el repositorio.

---

## 3. Migraciones V006/V007

| Comprobación | Resultado |
|---|---|
| `main` oficial | Solo tiene V001–V005 y S001–S004. **No hay colisión de numeración.** |
| Nombres de objetos | `sesiones`, `ix_sesiones_*`, `consultas_contacto`, `ix_contacto_*`, `ck_*` nuevos: **ninguno se repite** en V001–V005 (análisis estático) |
| Dependencias | Ambas usan `REFERENCES usuarios(id)` de V003 (CASCADE en sesiones; SET NULL en consultas) |
| Migraciones existentes | **Sin modificar** (219/219 idénticos a `main`) |
| Actualización sobre una base del equipo (solo V001–V005 + datos) | Se aplican **solo V006 y V007**. Conteos antes → después: usuarios 4 → 5 y apoderados 2 → 3 (solo agrega la cuenta demo S005); alumnos 107, actividades 3, inscripciones 1, comunicados 8 y solicitudes 3 **sin cambios** |
| Idempotencia | Tercera ejecución: las 7 aparecen como «ya aplicada» |
| Restricciones | Rechazan sesión con vencimiento anterior a su creación, estado de consulta inválido, correo con mayúsculas y mensaje de menos de 10 caracteres. Borrar un usuario borra sus sesiones (CASCADE) y conserva sus consultas con `usuario_id` NULL |
| Stack de prueba | `schema_migraciones` registra V001–V007 |

Las pruebas usaron contenedores PostgreSQL **desechables** (`pr_s3_mig_test*`, `--rm`), nunca datos reales.

**Para la revisión de Mirko (SCRUM-95):**
1. ¿Acepta V006/V007 con su convención (IF NOT EXISTS, una transacción por archivo, registro en
   `schema_migraciones`)?
2. ¿Acepta el seed S005 (apoderado demo sin hijos)?
3. Si alguien crea otra migración antes del merge, renumerar las de Daniel (nunca editar una ya aplicada).
4. En volúmenes existentes, recordar ejecutar `docker compose exec postgres sh /sql/migrar.sh`.

---

## 4. Pruebas reproducidas (resultados reales, 09-11-2026)

Salidas completas en `evidencias/remediacion/`:

| # | Prueba | Resultado |
|---|---|---|
| R1 | `tests_s3_daniel` (30 originales + 10 de remediación) · `tests_hu17/18/20/27` | **40/40 OK** · **8/8 OK** |
| R2 | `prueba_remediacion_s3 dev` (negativas contra el stack real) | **13/13 PASS**; repetido con la API recompilada: 13/13 |
| R3 | `prueba_s3_daniel crear` + `prueba_tec17`, `hu19`, `hu21`, `hu25 crear`, `tec16 crear` (modo dev) | 22/22 · 10/10 · 18/18 · 23/23 · 3/3 · 20/20 |
| R4 | `down` **sin -v** → `up` → `prueba_s3_daniel verificar`, `tec16 verificar`, `hu25 verificar`, `hu25 negativos` | 3/3 · 4/4 · 4/4 · 13/13 |
| R5 | Modo estricto (`PERMITIR_IDENTIDAD_DEMO=false`): `prueba_remediacion_s3 estricto` + `prueba_s3_daniel crear` | **15/15 PASS** · **22/22 PASS** |
| R5 | Scripts de compañeros en modo estricto (informativo) | tec16 20/20, hu19 18/18. **hu21 6/23** y **hu25 crear C.3 FAIL**: usan `X-Usuario-Id`. **tec17 sin resultado**: el script termina con `KeyError`. Es lo esperado del modo estricto y explica por qué aún no se puede activar. |
| R6 | Frontend: `npm test` · `npx eslint .` · `npm run build` | 132/132 · los mismos 26 problemas previos (0 nuevos) · build OK |
| R7 | Propuesta X-Rol aplicada en una copia | Sonda **PASS**; `tests_hu17/18/20/27` **FALLAN** con la propuesta (esperado; requisito 1.4) |
| — | Compose: `config --quiet` y `ps` | config OK; los 4 servicios healthy (en R2) |

No se repitió la verificación manual en el navegador: el frontend no cambió en esta remediación
(0 archivos distintos respecto de la entrega).

---

## 5. Archivos modificados en esta remediación

| Archivo | Cambio | Ticket |
|---|---|---|
| `HITO-3/backend/app/core/permisos.py` | `_usuario_demo` (solo `@ejemplo.cl`, respeta producción), `validar_cabecera_rol`, `ROLES_EN_CABECERA`, `rol_de_sesion` (para la propuesta) | SCRUM-96 / 122 |
| `HITO-3/backend/app/core/config.py` | Propiedad `identidad_demo_activa` | SCRUM-96 |
| `HITO-3/backend/app/main.py` | `dependencies=[Depends(validar_cabecera_rol)]` y aviso de modo en el log | SCRUM-96 / 122 |
| `HITO-3/backend/.env.example` | Comentario sobre el comportamiento de `PERMITIR_IDENTIDAD_DEMO` | SCRUM-107 |
| `HITO-3/backend/tests_s3_daniel.py` | Clase `TestRemediacionIdentidad` (10 pruebas) y cuenta de otro dominio en los datos de prueba | SCRUM-122 |
| `HITO-3/backend/scripts/prueba_remediacion_s3.py` (nuevo) | Pruebas negativas contra el stack real (modos dev y estricto) | SCRUM-122 |
| `HITO-3/backend/docs/sprint3/daniel/remediacion/*` (nuevo) | Esta acta, la propuesta `.patch` y su sonda | — |
| `HITO-3/backend/docs/sprint3/daniel/evidencias/remediacion/R1–R7` (nuevo) | Salidas reales | — |

No se modificó ningún archivo de compañeros en esta remediación. `eventos.py` y `documentos.py`
solo tienen la propuesta, sin aplicar.

---

## 6. Revisión cruzada requerida

### Mirko Massa
1. `app/core/permisos.py`, porque cambia `usuario_opcional`, que usan TEC-17, HU-21 y HU-25:
   - Bearer prioritario sobre `X-Usuario-Id`.
   - `X-Usuario-Id` solo para `@ejemplo.cl` y apagado en producción.
   - `validar_cabecera_rol` global.
2. Migraciones **V006** y **V007**, y el seed **S005** (sección 3).
3. `app/services/inscripciones.py`: 2 llamadas `auditoria.registrar(...)` después del commit (HU-22).
4. `src/services/http.js` y `src/context/SesionProvider.jsx`: soporte de token Bearer.
5. Plan para retirar la barra demo (`BarraSesionDemo`) y migrar `scripts/prueba_tec17/hu21/hu25`
   a Bearer, condición para poner `PERMITIR_IDENTIDAD_DEMO=false`.
6. `src/services/prematricula.test(IA).js`: 1 aserción actualizada (HU-26).

### Benjamín Concha
1. `docker-compose.yml`, Dockerfile y `nginx.conf` del frontend, y `.env.example` (revisor de SCRUM-107).
2. Colección `auditoria_eventos` e índices provisionales (TTL 365 días, `tipo+fecha`, `recurso+fecha`,
   `actor+fecha`), frente a SCRUM-116/118.
3. Procedimiento de retiro y rotación del `.env` versionado (sección 2), porque los commits que lo
   agregaron son suyos.
4. Insumo para SCRUM-108: `scripts/prueba_remediacion_s3.py` y la evidencia R2/R5.

### Diego Rubilar
1. HU-26 (SCRUM-114, revisor indicado): `FormContacto`, `ContactoSeccion`, `PanelContacto` y
   `src/utils/contacto.test(IA).js` (prueba del Taller 2 actualizada).
2. SCRUM-105: la descripción de Jira lo nombra revisor; confirmar responsable y revisor (discrepancia registrada).

### Autores de HU-17/18/20/27 (rutas con `X-Rol`)
- Aprobar o rechazar `PROPUESTA_X_ROL_RUTAS_HEREDADAS.patch` y sus dos requisitos (sección 1.4).

---

## 7. Riesgos residuales

| # | Riesgo | Severidad | Responsable | Cierre |
|---|---|---|---|---|
| R-1 | En modo dev, `X-Rol` **sin identidad** se sigue aceptando en las rutas heredadas | **Alta** si el despliegue usa modo dev | Autores HU-17/18/20/27 | Aplicar la propuesta 1.4 y desplegar con `PERMITIR_IDENTIDAD_DEMO=false` o `APP_ENV=production` |
| R-2 | En modo dev, `X-Usuario-Id` permite actuar como cualquier cuenta **ficticia** `@ejemplo.cl`, incluida dirección demo | Media (solo datos ficticios) | Mirko | Migrar la barra demo y los scripts a Bearer; luego modo estricto |
| R-3 | Rutas heredadas de HU-19 reciben `apoderado_id` sin sesión | Media | Mirko | Tomar el apoderado del token |
| R-4 | `.env` versionado con contraseña trivial en un repositorio público | Media | Equipo (Benjamín / Daniel) | Procedimiento de la sección 2 |
| R-5 | MongoDB sin autenticación y puertos 5432/27017 publicados | Media en redes compartidas | Benjamín | Credenciales Mongo o publicar solo en 127.0.0.1 |
| R-6 | Sin límite de intentos de login | Media | Daniel (siguiente sprint) | Contador por cuenta o IP con bloqueo temporal |
| R-7 | Bitácora sin entrega garantizada | Baja (documentado) | — | Aceptado |
| R-8 | `docker compose up --build` desde un clon Git limpio aún no probado | — | Daniel / Benjamín | Probar tras el merge |
| R-9 | Encuadre del caso 3.6 sin confirmación docente | Académico | Equipo | Confirmación escrita |

**Bloqueantes para el merge:** R-4 (retirar `.env` en el mismo PR o antes), la revisión cruzada de
la sección 6 y la decisión sobre R-1 para la demo final. **Certificación final: no emitida.**
