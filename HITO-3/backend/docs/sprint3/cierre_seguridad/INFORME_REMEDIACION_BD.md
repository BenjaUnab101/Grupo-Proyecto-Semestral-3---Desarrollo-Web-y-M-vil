# Informe de remediación de bases de datos · PR #23 · 09-11-2026

**Ejecutor:** Claude Code (Opus 5.5), autorizado por Daniel Cortez (rotación automática con claves generadas).
**Restricciones respetadas:**
- Ningún README modificado.
- S.A.P.I. sin tocar.
- Ningún volumen de proyecto eliminado.
- Ningún secreto versionado.
- Sin merge.

## 1. Problemas de partida

| Riesgo | Hallazgo |
|---|---|
| PostgreSQL | La contraseña del usuario de la aplicación estaba publicada en el historial de `main` (commit anterior a `b6e145e`) y además era **igual al nombre del usuario y de la base**. Los tres volúmenes locales (`pr_ci`, `pr_cierre`, `pr_s3_daniel`) la usaban; se comprobó comparando huellas SHA-256, sin imprimirla |
| MongoDB | Sin autenticación. Ningún volumen tenía usuarios en `admin` |

## 2. Respaldo previo (fuera del repositorio)

Carpeta: `C:\Desktop\E2 Pequeños reyes\respaldos_bd_20261109\`
- Copia cruda (`tar.gz`) de los volúmenes PostgreSQL y MongoDB de `pr_cierre` y `pr_s3_daniel`, tomada con los contenedores detenidos.
- `pg_dumpall` y `mongodump --archive --gzip` de los tres proyectos.
- Huellas: filas por tabla y documentos por colección.
- `SHA256SUMS.txt`.
- **Verificación:** cada volcado se restauró en contenedores temporales y sus conteos coincidieron exactamente con las huellas.

Los volcados contienen el hash SCRAM de la clave anterior: deben quedarse locales.

## 3. Cambios publicados (sin secretos)

| Archivo | Cambio |
|---|---|
| `docker-compose.yml` | `mongod --auth`. Cuenta root solo para administración. La API usa una cuenta con `readWrite` **solo** en `pequenos_reyes` y `MONGODB_URL` autenticada |
| `mongo/usuario_app.js`, `mongo/01_usuario_app.js` | Crean de forma idempotente la cuenta de la API. Con un volumen vacío, la imagen los ejecuta como root |
| `scripts/habilitar_auth_mongo.sh` | Habilita la autenticación en un **volumen existente**. Las variables `MONGO_INITDB_*` no crean cuentas cuando el volumen ya tiene datos, así que la cuenta root se crea mediante la excepción de localhost |
| `scripts/rotar_clave_postgres.sh` | Ejecuta `ALTER ROLE`. La clave llega por stdin o se genera con `secrets.token_urlsafe(32)` y se guarda solo en el archivo de entorno. Comprueba por TCP que la clave anterior se rechaza |
| `scripts/verificar_auth_bd.sh` | Siete comprobaciones de autenticación |
| `scripts/_bd_comun.sh` | Soporte de `ENV_FILE`: un archivo de credenciales por entorno |
| `.gitignore` | `.env.*` (salvo `.env.example`) y `.secretos/` |
| `.env.example` | Claves de MongoDB con valores ficticios |
| CI (`ci_integracion.sh`, `ci.yml`) | Credenciales ficticias generadas; fases nuevas 3b, 8 y 9 (sección 5) |

## 4. Resultados por entorno

Credenciales **independientes** por entorno:

| Entorno | Archivo | Permisos |
|---|---|---|
| `pr_ci` | `.env` | solo el usuario de Windows |
| `pr_cierre` | `.env.pr_cierre` | solo el usuario de Windows |
| `pr_s3_daniel` | `.env.pr_s3_daniel` | solo el usuario de Windows |

| | `pr_ci` | `pr_cierre` | `pr_s3_daniel` |
|---|---|---|---|
| Respaldo verificado | Sí (volcado restaurado) | Sí (cruda + volcado) | Sí (cruda + volcado) |
| PostgreSQL: clave anterior | **Rechazada** | **Rechazada** | **Rechazada** |
| PostgreSQL: clave nueva | Acepta | Acepta | Acepta |
| MongoDB: sin credenciales | Denegado (lectura y listado) | Denegado | Denegado |
| MongoDB: cuenta de la API | `readWrite` solo en `pequenos_reyes`; sin acceso a `admin` ni a otras bases; no puede crear usuarios | Igual | Igual |
| Filas PostgreSQL (22 tablas) frente al respaldo | Idénticas, salvo una actividad `CIERRE-…` creada por `prueba_cierre_h02` **después** de la rotación (ver la nota) | **Idénticas** | **Idénticas** |
| Documentos MongoDB | 55 → 55 (ninguno perdido) | 152 → 152 | 269 → 269 |
| Usuarios y hashes de la aplicación | Sin cambios | md5 idéntico al respaldo | md5 idéntico al respaldo |
| Persistencia (`down` sin `-v` → `up`) | 4 *healthy*, conteos idénticos | Igual | Igual |
| Sonda H-02 (sin login) | 0/12 abiertas | 0/12 | 0/12 |
| Pruebas con login demo (H-02, identidad, TEC-17, HU-19, HU-21) | **6/6 PASS** | No ejecutables (ver la nota) | HU-19 PASS; el resto no ejecutables |

**Nota sobre `pr_ci`:** la actividad adicional la creó el primer intento de certificación. Ese
intento contó mal las tablas por un error del script de certificación, que ya está corregido.

**Nota sobre las pruebas con login en `pr_cierre` y `pr_s3_daniel`:**
- Las cuentas demo `@ejemplo.cl` de esos volúmenes recibieron, en sesiones anteriores, una `DEMO_PASSWORD` que no se conserva. El login responde 401.
- No es un efecto de la remediación: el md5 de `email || password_hash` de todos los usuarios es idéntico al del respaldo previo.
- Restablecer esas claves habría modificado registros de usuarios, por eso no se hizo.
- Las mismas pruebas pasan con autenticación en `pr_ci` y en CI.

## 5. CI

Ensayo local completo en un *worktree* limpio, con proyecto `pr_ci_ensayo` y credenciales ficticias generadas: **0 fallas**.
- Fases 1–7 previas.
- 3b: autenticación con un volumen nuevo.
- 8: rotación sobre un volumen existente; la clave anterior se rechaza y los conteos se conservan.
- 9: MongoDB heredado sin autenticación con 25 documentos → `habilitar_auth_mongo.sh` → 25 documentos conservados y la consulta anónima denegada.

Resultados de GitHub Actions: sección 7.

## 6. Bloqueantes restantes

1. **El historial de `main` sigue conteniendo la clave anterior.** Ya no autentica en ningún volumen local, pero cualquier otro equipo que la use debe rotarla con `scripts/rotar_clave_postgres.sh`. Purgar el historial es una decisión del equipo (requiere reescritura y push forzado).
2. **Clones de otros integrantes:**
   - Necesitan agregar a su `.env` las claves `MONGO_ROOT_*` y `MONGO_APP_*`.
   - Si su volumen de MongoDB ya tiene datos, deben ejecutar `bash scripts/habilitar_auth_mongo.sh`.
   - Sin esas claves, `docker compose` no arranca y muestra un mensaje explícito.
3. Revisión cruzada humana del PR y aprobación en GitHub.
4. README (Benjamín): documentar el paso 2. No se tocó.
5. Pruebas con login demo en `pr_cierre` y `pr_s3_daniel`: requieren decidir si se restablecen las claves demo de esos volúmenes de prueba.

## 7. GitHub Actions

| Commit | Contenido | Checks |
|---|---|---|
| `7f8f15f` | Remediación BD (Compose, scripts, CI) | Sin run propio: se publicó junto con `be7b3f7` |
| `be7b3f7` | Fases de CI 8 y 9 e informe | 5/6: integración del run *push* fallida; la del run *pull_request* pasó |
| `c75004c` | Anotación `::error` por gate fallido | 5/6: la anotación identificó el gate `documentos conservados (25)` |
| `2c104cc` | Escrituras *journaled* y parada ordenada en la fase de MongoDB heredado | **6/6 PASS** (runs 42731151086 *push* y 42731158072 *pull_request*) |

**Causa del fallo intermitente:** la prueba eliminaba con `docker rm -f` el MongoDB temporal justo
después de insertar los documentos. Una escritura reciente del journal podía no llegar al disco.
El fallo estaba en el montaje de la prueba, no en `habilitar_auth_mongo.sh`. En los volúmenes
reales, el script nunca mata MongoDB: Compose lo detiene de forma ordenada.

Este informe se publica en un commit posterior; sus checks se verifican sobre ese nuevo SHA.
