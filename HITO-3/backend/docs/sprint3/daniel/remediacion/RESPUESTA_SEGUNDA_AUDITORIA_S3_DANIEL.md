# Respuesta a la segunda auditoría · Remediación Sprint 3 · Daniel Cortez

**Fecha:** 09-11-2026 · **Informe respondido:** `SEGUNDA_AUDITORIA_REMEDIACION_SPRINT3_PEQUENOS_REYES_2026-11-09.md`
(dictamen: «apto para revisión cruzada en rama aislada; no autorizado para merge ni despliegue público»).
**Ejecutor:** Claude Code (Opus 5.5) a pedido de Daniel Cortez.

**Restricciones:**
- No se modificó Jira y no hubo commit, push, merge, rebase ni PR.
- No se tocó el repositorio oficial ni archivos de compañeros.
- Solo datos ficticios, en el stack de prueba `pr_s3_daniel` y en contenedores desechables.

> **No hay certificación final.** El hallazgo H-02, confirmado ahora con peticiones reales, está en
> código de otros integrantes y necesita su autorización. El dictamen del auditor se mantiene:
> **no apto para merge ni despliegue público.**

## Resumen

| Hallazgo | Estado tras esta respuesta | Dónde está el problema |
|---|---|---|
| H-01 · `X-Rol` sin sesión aceptado en modo dev | **Abierto (riesgo aceptado solo en desarrollo aislado)**. Mitigado: ahora además los puertos se publican solo en 127.0.0.1 | Pantallas y rutas HU-17/18/20/27 (otros integrantes) |
| H-02 · Rutas heredadas sin autenticación | **Confirmado con HTTP real: 12/12 rutas sondeadas abiertas en modo estricto.** El inventario completo encuentra **34 rutas sin ninguna protección** (algunas públicas por diseño). **No corregido:** es código ajeno | `inscripciones.py`, `eventos.py` (pagos), `academico.py`, `catalogo.py`, `comunicados.py`, `sesion.py` |
| H-03 · Parche `X-Rol` limitado y no aplicado | **Abierto.** Se confirma que no cubre H-02 | Propuesta para sus autores |
| H-04 · Endurecimiento de producción y red | **Corregido en archivos de Daniel:** `APP_ENV` con lista permitida y falla segura; puertos en 127.0.0.1; sin `container_name` fijo. **Pendiente:** `.env` versionado (fase Git) y autenticación de MongoDB (Benjamín) | `config.py`, `auth.py`, `docker-compose.yml`, `.env.example` |
| H-05 · Gobernanza (revisiones, estados Jira, caso 3.6) | **Abierto.** Requiere personas; no se tocó Jira | Equipo |

---

## H-02 · Rutas heredadas sin autenticación: evidencia

### Inventario automático
`remediacion/inventario_rutas.py` recorre todas las rutas de la app y sus dependencias.
Resultado completo en `evidencias/remediacion/R10-inventario-rutas.txt`.

| Clasificación | Rutas |
|---|---|
| **Escritura sin protección (crítico)** | `POST/PATCH/DELETE /eventos`, `POST /eventos/{id}/inscripciones`, `POST /inscripciones/{id}/cancelar`, `POST /inscripciones/{id}/pagos`, `POST /pagos`, `PATCH /pagos/{id}/estado`, `POST /matriculas`, `POST /categorias` |
| **Lectura de datos personales sin protección (alto)** | `GET /alumnos` (107 nombres), `GET /matriculas`, `GET /eventos/{id}/asistentes` (nombres), `GET /apoderados/{id}/inscripciones`, `GET /inscripciones/{id}/pagos`, `GET /pagos` (RUT y nombre de párvulo), `GET /pagos/comprobante/{codigo}`, `GET /apoderados/{id}/comunicados` |
| Decididas por `X-Rol` del cliente | Escrituras de `/categorias-actividad`, `/organizadores`, `/actividades/*` y `/documentos` (cubiertas por la propuesta H-03) |
| Públicas **por diseño** (correcto) | `/health`, `POST /auth/login`, `GET /eventos`, `GET /eventos/{id}`, `GET /institucion`, `GET /salas`, `GET /salas/cupos`, `GET /categorias`, `GET /categorias-actividad`, `GET /organizadores`, `GET /actividades`, `GET /documentos`, `GET /comunicados*` (solo vigentes), `POST /prematriculas`, `POST /prematriculas/seguimiento`, `POST /contacto`, `POST /contacto/seguimiento` |
| Demo transitoria | `GET /sesion/cuentas-demo` (lista cuentas ficticias; retirar junto con la barra demo) |
| **Rutas de Daniel** | Todas exigen Bearer, salvo las 3 públicas por diseño (`login`, `POST /contacto`, `/contacto/seguimiento`) |

### Prueba HTTP real
`scripts/sonda_rutas_abiertas_s3.py`, ejecutado con `PERMITIR_IDENTIDAD_DEMO=false`, sin token,
sin `X-Usuario-Id` y sin `X-Rol`. Evidencia: `R8`.

**Resultado: 12/12 rutas ABIERTAS.**
- Lecturas: `GET /alumnos` devuelve 107 alumnos; asistentes, inscripciones de un apoderado, pagos y
  matrículas responden 200.
- Escrituras: se creó, modificó y eliminó un evento (201/200/204) y se creó una categoría (201).
- `PATCH /pagos/{id}`, `POST /matriculas` y `POST /inscripciones/{id}/cancelar` llegan a la lógica de
  negocio y responden 404, no 401.

**Conclusión:** concuerda con el auditor. **El modo estricto no protege estas rutas.** El hallazgo
existía antes del Sprint 3: está en código del Sprint 2 y de HU-19/TEC-16. El trabajo de Daniel no
lo introdujo ni lo agravó.

### Corrección necesaria (NO aplicada: requiere autorización de los autores)

| Ruta | Protección propuesta | Dueño |
|---|---|---|
| `POST/PATCH/DELETE /eventos` | `roles_requeridos("administrador","organizador")` | Mirko (HU-19/TEC-16) |
| `POST /eventos/{id}/inscripciones`, `POST /inscripciones/{id}/cancelar`, `POST /inscripciones/{id}/pagos` | Bearer de apoderado; `apoderado_id` **tomado del token**, no del cuerpo; verificar el vínculo con el alumno (ya existe `revisar_apoderado`) | Mirko |
| `GET /apoderados/{id}/inscripciones`, `GET /apoderados/{id}/comunicados` | Bearer; el `{id}` debe ser el del token, o rol de personal | Mirko |
| `GET /eventos/{id}/asistentes`, `GET /inscripciones/{id}/pagos` | Personal (`administrador`/`organizador`) o el apoderado dueño | Mirko |
| `GET/POST /pagos`, `PATCH /pagos/{id}/estado`, `GET /pagos/comprobante/{codigo}` | Dirección para listar o cambiar estado; apoderado dueño para su comprobante | Autor HU-20 |
| `GET /alumnos`, `GET/POST /matriculas` | `roles_requeridos("administrador")` (y organizador para leer, si se decide) | Autor académico / TEC-16 |
| `POST /categorias` | `roles_requeridos("administrador")` | Mirko (TEC-16) |

Las piezas ya existen (`usuario_autenticado`, `roles_requeridos`, `rol_de_sesion` en
`app/core/permisos.py`). Cada cambio exige además que el frontend envíe el token: hoy
`eventosApi.js` y `documentosApi.js` usan `fetch` sin `Authorization`, y `actividadesApi.js` envía
`apoderado_id`. También hay que actualizar las pruebas de cada dueño, y el modo estricto debe pasar
las suites nuevas y las heredadas (gate 2 del auditor).

---

## H-04 · Corregido en archivos de Daniel

| Cambio | Archivo | Prueba |
|---|---|---|
| `APP_ENV` se normaliza (espacios y mayúsculas) y se valida con **lista permitida** `{development, test}`. Cualquier otro valor (`Production`, `prod`, `staging`, vacío, con errores) se trata como producción: identidad demo y `DEMO_PASSWORD` desactivadas | `app/core/config.py` (`entorno`, `es_entorno_de_desarrollo`, `identidad_demo_activa`), `app/services/auth.py` | `test_app_env_solo_development_o_test_activan_la_identidad_demo`, `test_demo_password_se_ignora_fuera_de_development` |
| Puertos publicados solo en `127.0.0.1` por defecto (`BIND_HOST`) para frontend, API, PostgreSQL y MongoDB | `docker-compose.yml`, `.env.example` | R9: `docker compose ps` muestra `127.0.0.1:…` en los 4 |
| Se quitó `container_name: pequenos_reyes_mongo`. Ningún script ni documento lo usaba; el volumen se conserva | `docker-compose.yml` | R9: 7 consultas y 169 eventos Mongo conservados tras recrear el contenedor |

**Pendientes de H-04 que no corresponden a esta fase o a Daniel:**
- Retirar los `.env` del seguimiento Git y rotar la contraseña: fase Git autorizada. El procedimiento
  está en el acta anterior, sección 2.
- Autenticación de MongoDB: decisión de Benjamín (SCRUM-116/118). Requiere crear credenciales al
  iniciar el volumen y cambiar `MONGODB_URL`; con el puerto en 127.0.0.1 el riesgo baja, pero no
  desaparece.

---

## Pruebas de esta respuesta (resultados reales, 09-11-2026)

| # | Prueba | Resultado |
|---|---|---|
| — | `tests_s3_daniel` (40 previas + 2 de H-04) · `tests_hu17/18/20/27` | **42/42 OK** · **8/8 OK** |
| R8 | Sonda de rutas abiertas, modo estricto | **12/12 ABIERTAS**: confirma H-02 |
| R9 | Compose recreado con 127.0.0.1 y sin `container_name` + `prueba_remediacion_s3 dev`, integración propia y todas las regresiones | `config` OK; 4 servicios healthy; datos conservados; 13/13, 22/22, 10/10, 18/18, 23/23, 3/3, 4/4, 13/13, 20/20, 4/4 |
| R10 | Inventario de 66 rutas | 34 sin protección (ver la clasificación anterior) |
| — | Frontend | Sin cambios en esta respuesta. Última corrida: 132/132 (R6); el auditor también reprodujo 132/132 |

**Límite declarado:** estas son ejecuciones de Claude, no reproducciones independientes. El auditor
no pudo reproducir backend ni Docker en su entorno. El gate 5 (repetición independiente desde un clon
Git limpio) sigue pendiente.

## Archivos de esta respuesta

- **Modificados (de Daniel):** `app/core/config.py`, `app/services/auth.py`, `docker-compose.yml`,
  `.env.example`, `tests_s3_daniel.py`.
- **Nuevos:**
  - `scripts/sonda_rutas_abiertas_s3.py`
  - `docs/sprint3/daniel/remediacion/RESPUESTA_SEGUNDA_AUDITORIA_S3_DANIEL.md` (este documento)
  - `docs/sprint3/daniel/remediacion/inventario_rutas.py`
  - `docs/sprint3/daniel/evidencias/remediacion/R8`, `R9` y `R10`
- **Archivos de compañeros modificados:** ninguno. Frontend: sin cambios.

## Decisión que se necesita

Para cerrar H-02 y H-03 hay que modificar rutas de otros integrantes. Opciones:
1. **Que cada dueño lo haga** usando la tabla de corrección y la sonda R8 como prueba de aceptación.
2. **Que Daniel lo haga en una rama aislada,** con autorización expresa de Mirko y de los autores de
   HU-17/18/20/27. Se aplicaría backend y frontend (`eventosApi.js`, `documentosApi.js`,
   `actividadesApi.js` con token), se actualizarían sus pruebas y se exigiría que el modo estricto
   pase todas las suites.
