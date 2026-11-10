# TEC-20 · Pruebas de integración, seguridad y E2E (SCRUM-108, 130, 131)

**Fecha:** 09-11-2026.
**Entorno:**
- Clon del repositorio oficial, rama `sprint3/daniel-cierre-seguridad`.
- Docker Compose (proyecto `pr_cierre`) con **volúmenes nuevos**: frontend nginx, API FastAPI, PostgreSQL 16 y MongoDB 7.
- Puertos solo en `127.0.0.1`.
- Datos ficticios (`@ejemplo.cl`, `DEMO-*`).

**Evidencias:** `evidencias/C-01` (modo estricto, clon limpio), `C-02` (estricto completo + persistencia) y `C-03` (desarrollo con demo + producción).

> Esta ejecución la hizo Claude Code a pedido de Daniel Cortez. Sirve como insumo de SCRUM-108; la
> **revisión cruzada humana** que exige la incidencia sigue pendiente.

## Criterios de aceptación de SCRUM-108

| CA | Criterio | Cómo se probó | Resultado |
|---|---|---|---|
| CA1 | Creación y lectura SQL | `prueba_tec16 crear/verificar`, `prueba_hu19`, `prueba_s3_daniel` (consultas de contacto, inscripciones, pagos) | **PASS**: 20/20, 4/4, 18/18 y 22/22 |
| CA2 | Escritura y lectura Mongo | `prueba_s3_daniel` S3-16 y S3-19 (historial y bitácora); `S3-P2` tras reinicio | **PASS** |
| CA3 | Swagger ejecutando una operación | Swagger UI en `http://localhost:8000/docs`: *Try it out* → *Execute* en `GET /api/v1/eventos` (navegador integrado) | **PASS**: HTTP 200 con los eventos demo |
| CA4 | React → API → BD → React | Navegador: login de dirección en el portal → «Nuevo organizador» → la API lo guarda en PostgreSQL → aparece en la lista con «Organizador registrado correctamente». También: consulta de contacto `CT-…` creada desde el formulario y paneles de dirección con datos SQL y Mongo | **PASS** (verificación manual; sin capturas guardadas) |
| CA5 | 409 por cupo y 403 por acceso ajeno | `prueba_hu19` (sobrecupo 409, alumno ajeno 403); `prueba_cierre_h02` C-07/C-08/C-09/C-10/C-12/C-16 (acceso ajeno 403) | **PASS** |
| CA6 | Build y Docker verificados | `npm run build` OK; `docker compose config` OK; 4 servicios *healthy*; `down` sin `-v` → `up` conserva datos | **PASS** |

## Seguridad (cierre de H-01, H-02 y H-03)

| Prueba | Modo | Resultado |
|---|---|---|
| Sonda de 12 rutas sensibles sin token, `X-Usuario-Id` ni `X-Rol` | desarrollo estricto · desarrollo con demo · producción | **0/12 abiertas** en los tres |
| `prueba_cierre_h02` (rol y propiedad: apoderado A contra B, personal, dirección, `X-Rol` falsificado) | estricto y desarrollo con demo | **29/29** |
| `prueba_remediacion_s3` (identidad demo y `X-Rol`) | estricto 15/15 · dev 13/13 | PASS |
| `prueba_transicion_entorno_r4` (cuentas demo bloqueadas en producción) | dev → producción con el mismo volumen | 4/4 + 14/14 |

## SCRUM-130 · Integración SQL, MongoDB y reglas de negocio

| Regla | Prueba | Resultado |
|---|---|---|
| Persistencia SQL + NoSQL | `prueba_s3_daniel crear` → reinicio → `verificar` | PASS |
| Autenticación 401/403 | `prueba_remediacion_s3`, `prueba_cierre_h02`, `tests_hu17/18/20/27` | PASS |
| Sobrecupo 409 | `prueba_hu19` (incluye concurrencia con hilos) | PASS |
| Contrato API (Swagger) | `/openapi.json`: 64 operaciones (catálogo en `docs/ARQUITECTURA_DATOS.md` §4) | Verificado |

## SCRUM-131 · Demo E2E React → API → ambas persistencias

Recorrido reproducible con `APP_ENV=development` y `PERMITIR_IDENTIDAD_DEMO=false`:
1. Abrir http://localhost:5173 sin sesión. Se ve el calendario con insignias de clima (HU-06), las
   pantallas de gestión en «Solo lectura» y ninguna barra demo.
2. Abrir «Portal familias» e iniciar sesión con `direccion.demo@ejemplo.cl`. La contraseña es la
   `DEMO_PASSWORD` del `.env` local.
3. En «Administración de Organizadores» registrar un organizador ficticio. Se guarda en
   **PostgreSQL** y aparece en la lista.
4. En «Panel del jardín» ver la participación (agregaciones SQL) y la bitácora de accesos, donde
   figura el inicio de sesión del paso 2, guardado en **MongoDB**.
5. Cerrar sesión. El token se revoca en el servidor.

Resultado de la ejecución del 09-11-2026: **todos los pasos se observaron correctamente**. No se
guardaron capturas.

## Límites

- La ejecución no es independiente: la hizo el mismo agente que implementó los cambios.
- No hay pruebas automáticas de interfaz (Playwright) para los flujos nuevos; la verificación de
  interfaz fue manual.
- No se probó en un dispositivo móvil real.
