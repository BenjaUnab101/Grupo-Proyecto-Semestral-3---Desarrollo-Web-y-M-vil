# SCRUM-92 · TEC-13 · Diagnóstico del Taller 2 y continuidad académica

**Responsable:** Daniel Cortez · **Revisor cruzado indicado en Jira:** Mirko Massa
**Fecha de corte:** 08-11-2026 · **Fuentes:** código del repositorio (HITO-1, HITO-2/frontend-react,
HITO-3/backend), Jira del proyecto `SCRUM` (consultado en solo lectura el 08-11-2026) y `Jira.doc`
(exportación del 02-11-2026).

> Este diagnóstico NO afirma ninguna aprobación docente. Donde no hay evidencia escrita de una
> validación, se registra como riesgo.

---

## CA1 · Matriz conservado / modificado / ampliado por HU del Taller 2

Leyenda: **Conservado** = sigue igual en Hito 3 · **Modificado** = mismo componente, otra fuente de
datos o comportamiento · **Ampliado** = se le agregó backend/persistencia sin quitar lo anterior.

| HU Taller 2 (Jira) | Estado Jira | Archivos actuales | Hito 3 | Detalle |
|---|---|---|---|---|
| HU-01 · Navegación (SCRUM-45) | En revisión | `components/Navbar.jsx`, `Footer.jsx`, `pages/PaginaPrincipal.jsx` | Conservado | Se agregaron secciones nuevas sin cambiar la navegación. |
| HU-02 · Muro de comunicados (SCRUM-47) | Finalizado | `pages/ComunicadosSeccion.jsx`, `services/comunicadosApi.js` | Ampliado | HU-21 (Mirko) los llevó a PostgreSQL + bitácora Mongo. |
| HU-03 · Filtro por nivel (SCRUM-48) | Finalizado | `components/FiltroNivel.jsx` | Conservado/Ampliado | El filtro también existe en `GET /comunicados?nivel=`. |
| HU-04 · Calendario (SCRUM-49) | Finalizado | `pages/CalendarioSeccion.jsx`, `utils/fechas.js` | Ampliado | Los eventos vienen de `GET /eventos` (HU-19). |
| HU-05/06 · Clima (SCRUM-52/53) | Finalizado / Por hacer | `hooks/useClima.js`, `services/climaService.js` | Conservado | API pública Open-Meteo; no requiere backend propio. |
| HU-07 · Info institucional (SCRUM-55) | Finalizado | `components/InfoJardin.jsx`, `data/jardin.json` | Conservado | Existe `GET /institucion` (TEC-16) pero el componente aún lee el JSON. |
| HU-08 · Galería (SCRUM-56) | Finalizado | `components/Galeria.jsx`, `data/galeria.json` | Conservado | Contenido estático; no requiere persistencia. |
| HU-09 · Cupos por sala (SCRUM-57) | Finalizado | `pages/CuposSeccion.jsx` | Modificado | Ya cuenta matrículas en SQL (`GET /salas/cupos`, TEC-17). |
| HU-10 · Documentos y matrícula (SCRUM-58) | Finalizado | `components/Documentos.jsx`, `ProcesoMatricula.jsx` | Ampliado | HU-27 (`/documentos`) en PostgreSQL. |
| HU-11 · Pre-matrícula (SCRUM-60) | Finalizado | `components/FormPreMatricula.jsx` | Ampliado | HU-25 (Mirko): `POST /prematriculas` + seguimiento. |
| HU-12 · Contacto con dirección (SCRUM-61) | Finalizado | `components/FormContacto.jsx`, `utils/contacto.js` | **Ampliado (S3, Daniel)** | HU-26: se envía a `POST /contacto`, código CT-, estados y panel de dirección. Se conservaron validaciones, campos y diseño. |
| HU-13 · Acceso simulado (SCRUM-62) | Finalizado | `components/LoginForm.jsx` | **Modificado (S3, Daniel)** | HU-16: login real contra la API (hash PBKDF2, token, logout en servidor). Se eliminó `services/auth.js` y `data/apoderados.json` (credenciales en texto plano). |
| HU-14 · Selector de hermanos y ficha (SCRUM-63) | Finalizado | `SelectorHermanos.jsx`, `FichaAlumno.jsx`, `PortalApoderados.jsx` | **Modificado (S3, Daniel)** | Hijos desde `apoderados_alumnos` (SQL); ficha con 403 si el alumno es ajeno. Se eliminó `data/alumnos.json`. |
| HU-15 · Cierre de sesión y privacidad (SCRUM-64) | Finalizado | `PortalApoderados.jsx`, `AvisoPrivacidad.jsx` | **Modificado (S3, Daniel)** | El logout revoca la sesión en el servidor; el aviso se actualizó. |
| TEC-01 · React+Vite (SCRUM-43) | Finalizado | `HITO-2/frontend-react` | Conservado | Mismo stack (React 18, Vite 5, Bootstrap 5). |
| TEC-03 · Validaciones puras (SCRUM-59) | Por hacer | `utils/validaciones.js` | Conservado | Reutilizado por HU-25 y HU-26; el backend repite las reglas. |
| TEC-11 · Build y Vercel (SCRUM-68) | Finalizado | `vite.config.js` | Ampliado | Ahora también imagen Docker (nginx) en TEC-19. |

Taller 2 – HU-17/18/20/27 (eventos, actividades escolares, pagos y documentos) ya existían con
backend en `HITO-3/backend` (archivos `tests_hu17.py` a `tests_hu27.py`) y no se tocaron.

## CA2 · Inventario de mocks, fixtures y datos simulados

| Recurso | Uso actual | Estado tras Sprint 3 |
|---|---|---|
| `src/data/apoderados.json` (3 cuentas con `clave` en texto plano) | Login simulado HU-13 | **Eliminado** (reemplazado por `POST /auth/login`). |
| `src/data/alumnos.json` (asistencia/atrasos ficticios) | Ficha HU-14 | **Eliminado** (ficha desde SQL). Asistencia/atrasos **no existen** en el esquema: la ficha muestra «Dato no disponible». |
| `src/services/auth.js`, `src/hooks/useSesionApoderado.js` | Sesión simulada | **Eliminados**. |
| `src/data/jardin.json`, `nivelesEducativos.json`, `galeria.json`, `documentos.json`, `matricula.json`, `niveles.json`, `secciones.js` | Contenido institucional estático | Conservados (no son datos operacionales). |
| `src/datos-prueba/actividades.json`, `comunicados.json` | Datos de prueba de TEC-17 | Conservados (de Mirko). |
| Sesión demo TEC-17 (`X-Usuario-Id`, `BarraSesionDemo.jsx`) | Elegir cuenta ficticia sin contraseña | Conservada de forma **transitoria** (`PERMITIR_IDENTIDAD_DEMO=true`). Si llega un token Bearer, el backend lo usa y la ignora. |
| Encabezado `X-Rol` (HU-17/18/20) | Rol enviado por el cliente | **Riesgo:** el rol lo afirma el navegador. No es tarea de Daniel; se registra en `DEPENDENCIAS_Y_BLOQUEOS_S3_DANIEL.md`. |
| `sql/seed/S001–S005` | Datos ficticios `@ejemplo.cl`, `DEMO-*` | Reutilizables. S005 (nuevo) agrega un apoderado sin hijos. |
| `usuarios.password_hash = 'demo-sin-contrasena'` | Marcador de semilla | Nunca es un hash válido; la API lo reemplaza solo si `DEMO_PASSWORD` está en el entorno y `APP_ENV != production`. |

## Brechas frente al Hito 3 (estado al cierre de esta ejecución)

| Requisito | Antes | Después (Sprint 3 · Daniel) | Pendiente |
|---|---|---|---|
| API propia + Swagger | Existía (TEC-16, SCRUM-94) | +12 rutas documentadas (auth, portal, auditoría, panel, contacto) | — |
| PostgreSQL | V001–V005 | +V006 (sesiones), +V007 (consultas de contacto), +S005 | Mirko debe ratificar el esquema (SCRUM-95). |
| MongoDB funcional | Solo bitácora de comunicados (HU-21) | +`auditoria_eventos` con escritura real y consulta paginada | Índices definitivos: Benjamín (SCRUM-116/118). |
| React → API | Parcial (TEC-17) | Login, portal, contacto, panel y bitácora usan la API | Barra demo y `X-Rol` siguen vivos. |
| Docker | API + PostgreSQL + MongoDB | + React (nginx), healthcheck API, red y reinicio | Prueba desde **clon limpio** no realizada. |
| Seguridad | Identidad simulada | Hash PBKDF2, token con expiración, logout real, 401/403, IDOR bloqueado | Límite de intentos de login no implementado. |
| Pruebas | 8 unitarias backend + 123 frontend + scripts | +30 unitarias, +22+3 de integración, +9 frontend | E2E global: SCRUM-108 (Benjamín). |

## CA3 · Continuidad con el caso 3.6 «Agenda de actividades y eventos»

Pequeños Reyes no figura literalmente entre los 8 casos del enunciado. El equipo lo asimila al caso
**3.6**: el jardín publica actividades/eventos (`actividades`), las familias inscriben a sus hijos
(`inscripciones`, con control de cupos y 409 por sobrecupo), y dirección revisa asistentes e
indicadores (HU-24, este sprint) e historial (HU-22, Mongo).

**Estado de la validación docente: NO ACREDITADA.** No se encontró en el repositorio, en Jira ni en
los archivos entregados un registro escrito de que el docente aprobara esta equivalencia.

**Riesgo de aceptación académica (abierto):** si el docente no acepta la equivalencia, partes de la
rúbrica (funciones obligatorias del caso 3.6) podrían evaluarse como no cumplidas.
**Acción propuesta:** que el equipo solicite al docente una confirmación escrita (correo o foro) y la
adjunte a SCRUM-92 antes de la entrega.

## CA4 · No reapertura ni duplicación

- No se reabrió ni se modificó el estado de ningún ticket finalizado del Sprint 1/2.
- No se duplicó trabajo: HU-26 reutiliza `FormContacto`, `useFormularioDemo`, `FormularioDemo` y
  `utils/contacto.js`; HU-16 reutiliza `SelectorHermanos`, `FichaAlumno` y `utils/ficha.js`; el panel
  de contacto reutiliza el diseño del panel de pre-matrícula (HU-25).
- Dos aserciones de pruebas del Taller 2 que exigían que el contacto **no** se enviara se
  actualizaron al nuevo contrato (ver `ACTA_EJECUCION_S3_DANIEL.md`).

## Casos de prueba del ticket

- **CP-TEC-13-01 (flujo exitoso):** la matriz se verificó contra el código y se ejecutaron las
  pruebas de regresión del Taller 2: 132/132 en frontend (incluye las 123 previas, dos de ellas
  actualizadas) — `evidencias/06-frontend-tests-lint-build.txt`.
- **CP-TEC-13-02 (rechazo/indisponibilidad):** cubierto por las pruebas negativas de los paquetes
  B–F (401/403/400/409/503) — `evidencias/01` y `evidencias/03`.
