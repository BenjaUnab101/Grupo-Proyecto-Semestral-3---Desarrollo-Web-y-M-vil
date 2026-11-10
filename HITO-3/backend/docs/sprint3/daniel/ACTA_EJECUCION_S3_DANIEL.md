# Acta de ejecución · Sprint 3 / Hito 3 · Daniel Cortez

**Fecha:** 08-11-2026 · **Ejecutor técnico:** Claude Code (Opus 5.5), a pedido de Daniel Cortez ·
**Alcance:** SCRUM-92, 96 (+121, 122), 102 (+126, 127), 105, 107, 114 — 6 padres, 26 SP.

## 1. Línea base (antes de editar)

| Elemento | Estado encontrado |
|---|---|
| Carpeta | `Grupo-Proyecto-Semestral-3---Desarrollo-Web-y-M-vil-main/` (HITO-1, HITO-2/frontend-react, HITO-3/backend) |
| Git | **La carpeta NO es un repositorio Git** (`git status` → «not a git repository»). No hay rama ni HEAD que registrar. Se guardó una copia de la línea base fuera del proyecto para comparar cambios (ver sección 4). |
| Backend | FastAPI 0.115 · SQLAlchemy 2 · psycopg 3 · pymongo 4 · Python 3.12 (imagen Docker). Python local 3.15 no instala `psycopg-binary==3.2.10`: las pruebas se corren en `python:3.12-slim`. |
| Frontend | React 18 · Vite 5 · Bootstrap 5 · pruebas `node --test` |
| Docker | `HITO-3/backend/docker-compose.yml` con api + postgres + mongo (sin React). Docker Desktop estaba detenido; se inició. |
| Pruebas backend | `tests_hu17/18/20/27`: **8/8 OK** |
| Pruebas frontend | `npm test`: **123/123 OK** · `npm run build`: OK |
| Lint frontend | `npx eslint .`: **26 problemas preexistentes (21 errores, 5 avisos)**, todos en archivos de otros integrantes (`docs/evidencia/TEC-17/*.mjs`, `Documentos.jsx`, `FlujoInscripcionEventos.jsx`, `GestionActividades.jsx`, `GestionOrganizadores.jsx`, `LightboxModal.jsx`, `SalaCard.jsx`, `useClima.js`). No se corrigieron (no son de este alcance). |

## 2. Qué se implementó y decisiones

### HU-16 · SCRUM-96 / 121 / 122 — Autenticación real
- **Hash:** PBKDF2-HMAC-SHA256, 310.000 iteraciones, sal aleatoria de 16 bytes, comparación en tiempo
  constante (`app/core/seguridad.py`). Se eligió la biblioteca estándar para **no agregar
  dependencias** (bcrypt/argon2 exigirían paquetes nuevos).
- **Sesión:** token aleatorio de 256 bits; en PostgreSQL solo se guarda su SHA-256 (tabla `sesiones`,
  migración V006). Expira a los `SESION_MINUTOS` (120). **Logout real:** `revocada_en` en el servidor;
  el token deja de servir (401) aunque alguien lo haya copiado.
- **Autorización en el servidor:** `usuario_autenticado` / `roles_requeridos(...)` en
  `app/core/permisos.py`. El portal (`/portal/alumnos`, `/portal/alumnos/{id}`) usa la relación
  `apoderados_alumnos`; un alumno ajeno o inexistente responde **403** (no revela si existe) y queda
  en la bitácora como `acceso_denegado`.
- **Credenciales demo sin secretos en el código:** las cuentas ficticias `@ejemplo.cl` tienen el
  marcador `demo-sin-contrasena`, que nunca es válido. Al arrancar, la API les asigna el hash de
  `DEMO_PASSWORD` (variable de entorno) solo si `APP_ENV != production`.
- **Compatibilidad con TEC-17 (Mirko):** `usuario_opcional` ahora acepta `Authorization: Bearer` y,
  de forma transitoria y configurable (`PERMITIR_IDENTIDAD_DEMO`), el encabezado `X-Usuario-Id`. Si
  llega token, el encabezado demo se ignora. Así las pantallas y scripts del equipo siguen pasando.
- **React:** `LoginForm` real, `PortalApoderados` con hijos/ficha desde la API, token solo en memoria
  (`services/http.js` → `establecerToken`). Se eliminaron `services/auth.js`,
  `hooks/useSesionApoderado.js`, `data/apoderados.json` (contraseñas en texto plano) y
  `data/alumnos.json`.

### HU-22 · SCRUM-102 / 126 / 127 — Bitácora MongoDB
- Colección `auditoria_eventos` (`app/services/auditoria.py`). Tipos: login (éxito/fallido), logout,
  acceso denegado, inscripción creada/cancelada, consulta creada / cambio de estado.
- **Minimización:** lista blanca de claves en `datos`; nunca correo, RUT, teléfono, contraseña,
  token ni nombre de niños. Retención por índice TTL (`AUDITORIA_RETENCION_DIAS`, 365).
- **Consistencia:** el evento se escribe después del commit SQL. Si Mongo cae, la operación de
  negocio se guarda igual y el evento se pierde (aviso en el log). **No hay transacción distribuida
  ni entrega garantizada** — decisión documentada.
- `GET /auditoria/eventos` (solo dirección): filtros por tipo, actor, recurso, resultado y fechas;
  paginación; 503 si Mongo no responde.
- Índices provisionales creados al arrancar, a la espera del diseño de Benjamín (SCRUM-116/118).
- Única edición en archivo de compañero: 2 llamadas `auditoria.registrar(...)` después del commit en
  `app/services/inscripciones.py` (HU-19, Mirko), marcadas `HU-22 (Sprint 3 · Daniel)`.

### HU-26 · SCRUM-114 — Contacto con dirección
- Tabla `consultas_contacto` (V007): código `CT-XXXXXX`, estados `nuevo / en_gestion / cerrado`,
  `usuario_id` si la envía una cuenta con sesión.
- `POST /contacto` (201) · `POST /contacto/seguimiento` (código + correo, 404 genérico) ·
  `GET /contacto/mias` (solo las propias) · `GET /contacto` y `PATCH /contacto/{id}/estado` (solo
  dirección; 401/403 al resto; 409 si se intenta reabrir una cerrada).
- React: `FormContacto` (HU-12) conserva campos, validaciones y diseño; ahora envía por
  `services/contactoApi.js`. Nuevos: `SeguimientoContacto`, `PanelContacto`, `pages/ContactoSeccion`.

### HU-24 · SCRUM-105 — Panel de participación
- `GET /panel/participacion`: agregaciones SQL (`LEFT JOIN` + `SUM(CASE ...)`) sobre `actividades` e
  `inscripciones` reales: inscritos, cancelados, cupos, % ocupación, estado
  (`sin_inscritos/con_cupos/completa`), totales; filtros por actividad y período.
- `GET /panel/participacion/historial`: eventos de inscripción desde MongoDB.
- Roles: dirección y personal (`administrador`, `organizador`); apoderado 403; sin sesión 401.
- React: `PanelParticipacion` (tarjetas, tabla, barra de ocupación, historial paginado) y
  `PanelAuditoria`; solo visibles con sesión real del personal.

### TEC-19 · SCRUM-107 — Docker Compose
- Se amplió el `docker-compose.yml` existente (no se creó otro): servicio `frontend` (Dockerfile
  multi-etapa Node 22 → nginx 1.27, `HITO-2/frontend-react/Dockerfile`), healthcheck de la API, red
  `pequenos_reyes`, `restart: unless-stopped`, puertos configurables y variables de login.
- Se conservó el mecanismo de migraciones de TEC-16 (initdb + `sql/migrar.sh`).
- `.env.example` con valores ficticios; `.env` ya estaba en `.gitignore`; se agregaron
  `.dockerignore` para no copiar `.env` a las imágenes.

### TEC-13 · SCRUM-92 — Diagnóstico
- `DIAGNOSTICO_TALLER2_S3_DANIEL.md` (matriz, inventario, brechas, riesgo 3.6).

## 3. Pruebas actualizadas de otros integrantes (mínimo indispensable)
- `src/utils/contacto.test(IA).js`: la prueba «CA3: mensaje de demostración exacto» exigía que el
  contacto dijera «no enviada a la dirección». HU-26 reemplaza esa demo, así que se cambió por una
  prueba del nuevo contrato (envío por `contactoApi.js` y código de seguimiento).
- `src/services/prematricula.test(IA).js`: una línea afirmaba que `FormContacto` no tenía `enviar:`.
  Se cambió para verificar que tampoco usa `fetch` ni almacenamiento del navegador.
Ambos cambios están marcados con un comentario `HU-26 (Sprint 3 · Daniel)`.

## 4. Archivos (comparación contra la copia de línea base)

**Nuevos (backend):** `app/core/seguridad.py`, `app/api/{auth,auditoria,contacto,panel}.py`,
`app/schemas/{auth,auditoria,contacto}.py`, `app/services/{auth,auditoria,contacto,panel,portal}.py`,
`sql/migraciones/V006__sesiones_autenticacion.sql`, `sql/migraciones/V007__consultas_contacto.sql`,
`sql/seed/S005__cuentas_portal_demo.sql`, `scripts/prueba_s3_daniel.py`, `tests_s3_daniel.py`,
`.dockerignore`, `docs/sprint3/daniel/**`.

**Modificados (backend):** `app/main.py`, `app/core/config.py`, `app/core/permisos.py`,
`app/db/models.py` (2 modelos al final), `app/services/inscripciones.py` (2 llamadas de bitácora),
`docker-compose.yml`, `.env.example`.

**Nuevos (frontend):** `Dockerfile`, `nginx.conf`, `.dockerignore`, `src/services/{authApi,contactoApi,panelApi}.js`,
`src/services/s3_daniel.test(IA).js`, `src/components/{PanelAuditoria,PanelContacto,PanelParticipacion,SeguimientoContacto}.jsx`,
`src/pages/{ContactoSeccion,PanelDireccionSeccion}.jsx`, `src/styles/PanelDireccion.css`.

**Modificados (frontend):** `src/services/http.js` (token Bearer), `src/context/SesionProvider.jsx`
(login/logout real), `src/components/{LoginForm,PortalApoderados,FichaAlumno,FormContacto,AvisoPrivacidad}.jsx`,
`src/pages/PaginaPrincipal.jsx` (2 secciones), 2 archivos de prueba (sección 3).

**Eliminados (frontend):** `src/services/auth.js`, `src/hooks/useSesionApoderado.js`,
`src/data/apoderados.json`, `src/data/alumnos.json`.

No se modificó `.env` real, ni migraciones existentes (V001–V005), ni semillas existentes.

## 5. Jira y Git
- Por instrucción directa de Daniel (que prevalece sobre el prompt maestro, el cual pedía no tocar
  Jira), el 08-11-2026 se pasaron a **Finalizado** las 10 incidencias: SCRUM-92, 96, 121, 122, 102,
  126, 127, 105, 107 y 114. No se agregaron comentarios ni se cambiaron responsables, SP o descripciones.
  Las descripciones de Jira piden revisión cruzada antes de Finalizado: esa revisión queda pendiente
  (ver `USO_IA_S3_DANIEL.md`).
- No se realizaron commits, pushes, merges ni PR (la carpeta no es un repositorio Git). La integración
  a GitHub la hace Daniel manualmente.

## 6. Recursos Docker creados para las pruebas
Proyecto aislado `-p pr_s3_daniel` (contenedores `pr_s3_daniel-*` y `pequenos_reyes_mongo`, volúmenes
`pr_s3_daniel_postgres_data` y `pr_s3_daniel_mongo_data`). No se tocó el proyecto S.A.P.I. ni sus
volúmenes. Nunca se usó `down -v`, `volume rm` ni `prune`.
