# Matriz de validación · Remediación R4 · Sprint 3 · Daniel Cortez

Todas las pruebas se **ejecutaron** el 09-11-2026. Las salidas completas están en
`docs/sprint3/daniel/evidencias/remediacion_r4/R4-01…R4-08`. Ninguna fila declara PASS sin
ejecución. «Unit» = `tests_s3_daniel.py` (`python:3.12-slim`, SQLite y Mongo simulado).
«Stack» = Docker Compose `pr_s3_daniel` con PostgreSQL 16 y MongoDB 7 reales y datos ficticios.

## Matiz A · APP_ENV obligatorio y configuración segura

| # | Criterio | Prueba | Evidencia | Resultado |
|---|---|---|---|---|
| A1 | Sin valor por defecto de `APP_ENV` | Unit `test_sin_app_env_no_hay_valor_por_defecto_y_se_rechaza` | R4-01 | PASS |
| A2 | Ausente, vacío o espacios → error controlado | ídem + subproceso `import app.main` sin `APP_ENV` | R4-01 | PASS (`ConfiguracionInvalida: APP_ENV es obligatorio…`) |
| A3 | Valores desconocidos (`prod`, `dev`, `desarrollo`, `produccion`, `local`, `qa`, `production1`) → error | Unit `test_valores_desconocidos_se_rechazan` · `compose run` con `prod` y `desarrollo` | R4-01, R4-05 | PASS (código de salida 1) |
| A4 | `development` y `test` solo si se declaran | Unit `test_valores_validos_explicitos` | R4-01 | PASS |
| A5 | Identidad demo y `DEMO_PASSWORD` desactivadas por defecto | Unit `test_identidad_demo_desactivada_por_defecto` · `docker compose config` sin variables | R4-01, R4-02 | PASS (`PERMITIR_IDENTIDAD_DEMO: "false"`, `DEMO_PASSWORD: ""`) |
| A6 | `staging`/`production` + identidad demo → no inicia | Unit `test_staging_y_production_nunca_admiten_demo` · `compose run` | R4-01, R4-05 | PASS (código de salida 1) |
| A7 | `staging`/`production` + `DEMO_PASSWORD` → no inicia y no muestra el valor | ídem | R4-01, R4-05 | PASS |
| A8 | `production`/`staging` limpios sí inician | `compose run … import app.main` | R4-05 | PASS (`INICIA`) |
| A9 | Compose exige `APP_ENV` | `docker compose config` sin `APP_ENV` y con `APP_ENV=""` | R4-02, R4-05 | PASS (error de interpolación, código 1) |
| A10 | La app no inicia sin `APP_ENV` (criterio de aceptación) | Heredadas sin `APP_ENV` | R4-01 | PASS: las 4 suites terminan con `ConfiguracionInvalida` |

## Matiz B · Credenciales y sesiones demo persistentes

| # | Criterio | Prueba | Evidencia | Resultado |
|---|---|---|---|---|
| B1 | Login demo rechazado en `production` y `staging` con la contraseña correcta | Unit `test_transicion_desarrollo_a_produccion_misma_base` · Stack P-01, P-02 | R4-01, R4-04 | PASS (401 genérico) |
| B2 | Tokens demo emitidos en desarrollo rechazados después del cambio | Unit (`/auth/yo`, `/portal`, `/auditoria`, `/comunicados`) · Stack P-03…P-07 | R4-01, R4-04 | PASS (401) |
| B3 | Rechazo en la validación **central** (`usuario_de_token`), no solo en el login | P-06: ruta heredada `/prematriculas` (Bearer vía `usuario_opcional`) también rechaza | R4-04 | PASS |
| B4 | No se borran usuarios, contraseñas ni datos | Unit (conteos y hash) · Stack P-11, P-12 | R4-01, R4-04 | PASS (6 → 6 usuarios; hash demo sin cambio) |
| B5 | Las sesiones no se borran | Stack P-13 (57 → 58: +1 del login legítimo) | R4-04 | PASS |
| B6 | Usuario legítimo (no demo): token anterior válido y login nuevo | Unit · Stack P-08, P-09, P-10 | R4-01, R4-04 | PASS (200) |
| B7 | **Prueba obligatoria:** cuentas y sesiones demo en desarrollo → mismo volumen → producción → login y tokens rechazados; legítimo funciona | `scripts/prueba_transicion_entorno_r4.py preparar` (dev) → recrear la API con `APP_ENV=production` → `verificar` | R4-04 | **PASS 4/4 + 14/14** |
| B8 | Al volver a desarrollo, nada quedó destruido | Unit (token demo vuelve a valer en development) | R4-01 | PASS |
| B9 | El login bloqueado queda en la bitácora sin datos sensibles | Unit `test_login_demo_bloqueado_queda_en_bitacora_sin_datos_sensibles` | R4-01 | PASS (`motivo: cuenta_demo_fuera_de_desarrollo`) |
| B10 | Detección de cuenta demo insensible a mayúsculas y sin falsos positivos | Unit `test_demo_reconocida_sin_importar_mayusculas` | R4-01 | PASS |

## Regresión, integración y persistencia

| # | Prueba | Evidencia | Resultado |
|---|---|---|---|
| R1 | `tests_s3_daniel` (42 previas + 9 de R4) | R4-01 | **51/51 OK** |
| R2 | `tests_hu17/18/20/27` con `APP_ENV=test PERMITIR_IDENTIDAD_DEMO=true` | R4-01 | **8/8 OK** |
| R3 | ídem sin `APP_ENV` (informativo) | R4-01 | No inician (esperado, Matiz A) |
| R4 | ídem con identidad demo por defecto (`false`) (informativo) | R4-01 | FAILED (esperado: envían `X-Rol` sin sesión, H-01) |
| R5 | Stack en desarrollo explícito: negativas, integración propia y regresiones | R4-03 | 13/13, 22/22, tec17 10/10, hu19 18/18, hu21 23/23, hu25 3/3 y 13/13, tec16 20/20 y 4/4 |
| R6 | Modo estricto (`development` + identidad demo `false`) | R4-06 | Negativas 15/15; integración 22/22; hu19 18/18; tec16 20/20; **hu21 6/23, hu25 1 FAIL, tec17 se cae** (dependen de `X-Usuario-Id`: responsabilidad de Mirko) |
| R7 | Persistencia: `down` **sin -v** → `up` | R4-07 | `prueba_s3_daniel verificar` 3/3; tec16 4/4; hu25 4/4 y 13/13 tras repetir su secuencia correcta (ver la nota en R4-07); la cuenta legítima persiste |
| R8 | Frontend: test, lint y build | R4-08 | 132/132; los mismos 26 problemas de lint previos; build OK; frontend idéntico a la entrega |
| R9 | Sonda H-02 (informativo) | R4-03, R4-06 | **12/12 ABIERTAS** en desarrollo y estricto: H-02 sigue abierto (no es de Daniel) |
| R10 | Compose: puertos y salud | R4-03, R4-07 | 4 servicios healthy; todos en `127.0.0.1` |

## Límites declarados

- Ejecutado por Claude en el equipo de Daniel; **no es una reproducción independiente**.
- No se probó un clon Git limpio: la carpeta no es un repositorio.
- La prueba de transición usó el volumen del stack de prueba (`pr_s3_daniel_postgres_data`) con
  datos ficticios. Quedó creada la cuenta ficticia `direccion.r4@jardin-ficticio.cl`.
- No se eliminaron volúmenes, usuarios ni datos.
