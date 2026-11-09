# Acta de cierre total · Pequeños Reyes · 09-11-2026

**Ejecutor:** Claude Code (Opus 5.5), por autorización ejecutiva de Daniel Cortez.
**Repositorio:** `BenjaUnab101/Grupo-Proyecto-Semestral-3---Desarrollo-Web-y-M-vil`.
**Rama:** `sprint3/daniel-cierre-seguridad`, creada desde `main` en `a2f62cb`.
**Exclusión respetada:** ningún archivo README fue modificado; lo verifica `git diff main --name-only`.

> **Mandato maestro:** el archivo `PAQUETE_MAESTRO_CIERRE_TOTAL_PEQUENOS_REYES_2026-11-09.zip` /
> `MANDATO_MAESTRO_CLAUDE_CIERRE_TOTAL.md` **no se encontró en el equipo** (búsqueda en Descargas,
> Escritorio y todo el perfil del usuario). El trabajo siguió el mensaje de autorización y la lista
> real de incidencias abiertas en Jira (57 al 09-11-2026). Si el mandato trae criterios adicionales,
> hay que contrastarlos con esta acta.

## 1. Commits en la rama (sin push: falta autenticación de GitHub)

| Commit | Contenido |
|---|---|
| `d395956` | Sprint 3 de Daniel (HU-16/22/24/26, TEC-13/19) y remediaciones R1–R4 |
| `b6e145e` | Deja de versionar `HITO-3/backend/.env` y `HITO-2/frontend-react/.env` |
| `68f1022` | Cierre de H-01, H-02 y H-03 en rutas heredadas, frontend con sesión y 0 problemas de lint |
| `721b3c5` | HU-06 (SCRUM-53): clima por actividad |
| `1d9f7f7` | Documentación TEC-06/10/14/20/22, comparativa NestJS/FastAPI y aislamiento de pruebas |
| (este) | Acta de cierre |

## 2. Gate de integración a `main`

| Condición del mandato | Estado |
|---|---|
| Vulnerabilidades críticas | **H-01, H-02 y H-03 cerrados**: sonda 0/12 rutas abiertas y 29/29 de rol y propiedad, en desarrollo estricto, desarrollo con demo y producción |
| Pruebas | Frontend 143/143 · ESLint 0 · build OK · backend 62/62 · integración y regresiones del equipo PASS en modo estricto y en desarrollo · persistencia PASS |
| Credenciales expuestas | Los `.env` salen del índice (`b6e145e`). **Pendiente, bloqueante:** rotar la contraseña de PostgreSQL publicada, porque sigue en el historial de `main`. Es una acción humana; ver la sección 5 |
| README | Sin cambios |

**Recomendación:** abrir un PR desde la rama, pero **no fusionarlo** hasta que (a) se rote la
contraseña de PostgreSQL publicada y (b) se complete la revisión cruzada humana que exigen las
incidencias.

## 3. Estado de las 57 incidencias abiertas en Jira

**Jira no se modificó.** Los estados de Jira deben actualizarlos los responsables tras su revisión.

### 3.1 Completadas en esta rama (código o documento con evidencia)

| Incidencia | Qué se hizo | Evidencia |
|---|---|---|
| SCRUM-53 · HU-06 | Clima previsto por actividad (CA1–CA3) | `hu06_clima_actividades.test(IA).js`; navegador: insignia solo dentro del pronóstico real |
| SCRUM-54 · TEC-06 | `HITO-2/frontend-react/docs/API.md` y mapa WMO completo | Petición real 09-11-2026. **CA2 (enlace en README) pendiente** por la exclusión de README |
| SCRUM-67 · TEC-10 | `HITO-2/frontend-react/docs/PRUEBAS.md` | Inventarios generados (143 + 62) y 8 defectos reales |
| SCRUM-84 | `HITO-2/frontend-react/docs/DEFENSA.md` (comparativa) | Documento |
| SCRUM-108, 130, 131 · TEC-20 | `INFORME_TEC20_PRUEBAS.md` | CA1–CA6 PASS; CA4 E2E en navegador (manual) |
| SCRUM-116 · TEC-22 | Índices verificados, privacidad, retención y consulta | `docs/ARQUITECTURA_DATOS.md` §3 |
| SCRUM-117 | Diagrama ER y restricciones | `docs/ARQUITECTURA_DATOS.md` §2 |
| SCRUM-118 | Colecciones, arquitectura y catálogo REST (64 operaciones) | `docs/ARQUITECTURA_DATOS.md` §1, §3 y §4 |

### 3.2 Ya implementadas en el código y verificadas hoy; solo falta la revisión humana o el cambio de estado

| Incidencia | Verificación |
|---|---|
| SCRUM-119, 120 (migraciones y seed) | V001–V007 aplicadas desde volumen vacío; `prueba_tec16` 20/20 + 4/4 |
| SCRUM-123, 124, 125 (inscripciones, cancelación, concurrencia) | `prueba_hu19` 18/18 (incluye hilos concurrentes y 409) |
| SCRUM-128, 129 (cliente HTTP y estados) | `http.js`, `useRecurso` y `EstadoCarga`; pruebas `http.test(IA).js` |
| SCRUM-73, 74, 75 (ClimaWidget, estados, atribución) | Componentes presentes; atribución visible verificada en el navegador. *Responsive* pendiente de verificación manual |
| SCRUM-59 · TEC-03 (validaciones puras) | `utils/validaciones.js` con pruebas |
| SCRUM-14, 25, 27, 28, 44, 45, 46 («En revisión») | Funcionalidades presentes (responsive, proceso de matrícula, formularios con validación, Bootstrap por npm, navegación). Requieren la revisión del revisor asignado |

### 3.3 Bloqueadas o no ejecutables por Claude

| Incidencia | Motivo |
|---|---|
| SCRUM-66 · TEC-08, y la parte de README de SCRUM-109/132 | **Excluidas:** Benjamín actualiza los README |
| SCRUM-65 · TEC-07 (Git Flow + GitHub for Jira) | Los commits llevan claves Jira. Instalar la app «GitHub for Jira» requiere administrador de GitHub/Atlassian |
| SCRUM-69, 81, 82, 83, 85 (defensa individual y ensayo) | Trabajo personal de cada integrante |
| SCRUM-109 (reporte de IA) | Hay registro parcial en `docs/sprint3/daniel/USO_IA_S3_DANIEL.md`. El reporte del equipo y la revisión de README corresponden a Benjamín |
| SCRUM-39, 40, 41 | No pertenecen a Pequeños Reyes (dataset DMC, ranking de riesgo, DEM: proyecto S.A.P.I.). No se implementaron |
| SCRUM-4 «Subtarea 2.1» | Sin descripción ni criterios: no hay nada verificable que implementar |
| Épicas SCRUM-9, 15, 20, 26, 35, 36, 38, 42, 87–91, 110–112 | Se cierran cuando sus hijas estén finalizadas; es decisión del equipo |

## 4. Seguridad: estado final

| Riesgo | Estado |
|---|---|
| H-01 `X-Rol` del cliente | **Cerrado.** El rol sale de la sesión; `X-Rol` no otorga permisos (pruebas en backend y frontend) |
| H-02 rutas heredadas sin autenticación | **Cerrado.** Sesión, rol y propiedad en inscripciones, asistentes, pagos, alumnos, matrículas, categorías y comunicados por apoderado |
| H-03 propuesta sin aplicar | **Cerrado.** Aplicada a las 10 operaciones, con frontend y pruebas actualizados |
| `APP_ENV` y cuentas demo (R4) | Cerrado; transición a producción 14/14 |
| `.env` versionados | Retirados del índice. **Rotación pendiente** (sección 5) |
| MongoDB sin autenticación | Mitigado: solo `127.0.0.1`. Agregar credenciales queda **pendiente** (decisión de Benjamín) |
| Límite de intentos de login | **Pendiente** (mejora para un sprint siguiente) |

## 5. Acciones humanas necesarias

1. **Autenticar GitHub** para el push y el PR. En una terminal:
   `gh auth login`, luego `git -C repo-oficial push -u origin sprint3/daniel-cierre-seguridad`, y
   después abrir el PR hacia `main`.
2. **Rotar la contraseña de PostgreSQL** publicada en el historial:
   - Definir una nueva en cada `.env` local.
   - En volúmenes existentes, ejecutar `ALTER USER <usuario> PASSWORD '<nueva>'`.
   - Decidir en equipo si se purga el historial con `git filter-repo` (requiere push forzado y que
     todos vuelvan a clonar).
3. Agregar `APP_ENV=development` a cada `.env` local, porque desde R4 es obligatorio. Para la barra
   demo, además `PERMITIR_IDENTIDAD_DEMO=true`.
4. **Revisión cruzada** (Mirko, Benjamín y Diego) y actualización de estados en Jira.
5. Confirmación docente del encuadre del caso 3.6.
