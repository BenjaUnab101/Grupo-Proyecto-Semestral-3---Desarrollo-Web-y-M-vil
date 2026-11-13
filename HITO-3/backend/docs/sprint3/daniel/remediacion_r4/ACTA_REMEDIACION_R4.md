# Acta de remediación R4 · Seguridad · Sprint 3 · Daniel Cortez

**Fecha:** 09-11-2026 · **Ejecutor:** Claude Code (Opus 5.5) a pedido de Daniel Cortez.
**Autorización:** «AUTORIZACIÓN DE REMEDIACIÓN R4» de Daniel (matices A y B autorizados; H-01, H-02
y H-03 asignados a sus autores).
**Insumo:** `TERCERA_AUDITORIA_SPRINT3_PEQUENOS_REYES_2026-11-09.md`.

**Base de trabajo:** versión consolidada de los tres paquetes auditados, que **no se modificaron**:

| Paquete | SHA-256 |
|---|---|
| Entrega | `a3e8a154c01ec144f1777af2f707ad93035da3a2a3097892495b9c6d6427b2f4` |
| Remediación | `89accdadf7ab1cc0e612e37b0fa440716d507f81811b4f84bfa8ae49b9301f6b` |
| Respuesta a la segunda auditoría | `956ae27603ff34bcceb609bc458053dc60fda746c314a3d5c2e30db6c8399e91` |

> **No es una certificación final.** H-01, H-02, H-03, los `.env` publicados, la autenticación de
> MongoDB y las revisiones cruzadas **siguen abiertos**. Terminar R4 **no autoriza** el merge del
> Sprint 3 a GitHub ni ningún despliegue.

**Restricciones cumplidas:**
- Los tres ZIP auditados quedaron intactos y no se modificaron archivos de otros integrantes.
- Sin cambios en Jira; sin commit, push, merge, rebase ni PR; sin cambios en `main`.
- No se eliminaron volúmenes ni datos, y no se publicaron secretos.
- Solo datos ficticios.

---

## 1. Matiz A · APP_ENV obligatorio y configuración segura (implementado)

**Hallazgo:** con `APP_ENV` ausente, la app quedaba en `development` y Compose ponía
`PERMITIR_IDENTIDAD_DEMO=true` por defecto, así que no fallaba en cerrado.

**Acción:**
- `app/core/config.py`:
  - `app_env` ya no tiene valor por defecto.
  - Nueva `validar_configuracion()`, que se ejecuta al importar la configuración. Si falla, lanza
    `ConfiguracionInvalida` y la API **no inicia** en estos casos:
    - `APP_ENV` ausente, vacío o con solo espacios.
    - `APP_ENV` fuera de `development | test | staging | production` (se normalizan espacios y mayúsculas).
    - `staging`/`production` con `PERMITIR_IDENTIDAD_DEMO=true`.
    - `staging`/`production` con `DEMO_PASSWORD` definida. El mensaje no muestra el valor.
  - `PERMITIR_IDENTIDAD_DEMO` pasa a `false` por defecto.
- `docker-compose.yml`:
  - `APP_ENV: ${APP_ENV:?…}`: Compose se niega a arrancar sin él.
  - `PERMITIR_IDENTIDAD_DEMO: ${…:-false}`.
- `.env.example`: `APP_ENV` documentado como obligatorio y `PERMITIR_IDENTIDAD_DEMO=false`.

**Criterio de aceptación («no iniciar accidentalmente en modo demostración»): cumplido.** Ver
`MATRIZ_VALIDACION_R4.md`, filas A1–A10:
- Sin `APP_ENV`, ni Compose ni la API inician.
- Por defecto, la identidad demo está apagada y la contraseña demo vacía.
- `staging` y `production` se niegan a iniciar con cualquier ajuste demo.

## 2. Matiz B · Credenciales y sesiones demo persistentes (implementado)

**Hallazgo:** al reutilizar en producción un volumen de desarrollo, las cuentas `@ejemplo.cl` con
contraseña demo ya guardada podían iniciar sesión, y sus tokens previos seguían vigentes.

**Acción (en `app/services/auth.py`):**
- `es_cuenta_demo()` y `cuenta_demo_bloqueada()`: las cuentas `@ejemplo.cl`, sin distinguir
  mayúsculas, quedan bloqueadas fuera de `development`/`test`.
- **Login:** responde 401 genérico aunque la contraseña sea correcta. La contraseña se verifica
  igual, para no revelar por tiempo de respuesta qué cuentas están bloqueadas. En la bitácora queda
  `motivo: cuenta_demo_fuera_de_desarrollo`.
- **Validación central (`usuario_de_token`):** cualquier token de cuenta demo se rechaza fuera de
  `development`/`test`. Afecta a **todas** las rutas con Bearer, incluidas las heredadas que usan
  `usuario_opcional`.
- **Sin borrar nada:** usuarios, hashes y sesiones quedan intactos; solo se rechaza la identidad.
  Las sesiones de usuarios no demo no se tocan.
- `app/core/permisos.py`: la identidad demo `X-Usuario-Id` usa la misma definición `es_cuenta_demo`.

**Prueba obligatoria: cumplida (R4-04, 4/4 + 14/14).**
1. En desarrollo: login de dirección demo y apoderado demo, y de una cuenta legítima ficticia de
   otro dominio.
2. Se recreó **solo** la API con `APP_ENV=production`, **mismo volumen** PostgreSQL.
3. Resultado:
   - Login demo y tokens demo anteriores: **401** en `/auth/yo`, `/auditoria`, `/contacto`,
     `/prematriculas` y `/portal`.
   - Token legítimo anterior y login legítimo nuevo: **200**.
   - Usuarios 6 → 6, hash demo sin cambio, sesiones 57 → 58 (solo el login legítimo).

## 3. H-01, H-02 y H-03 (sin corregir: asignados a sus autores)

Según la decisión de Daniel, no se modificó código ajeno. Se entregó:
- `MATRIZ_RESPONSABILIDADES_H01_H02_H03.md`: dueño por ruta, contrato de autorización propuesto
  (401/403/éxito), piezas disponibles, cambios de frontend necesarios y gate sugerido para cada PR.
- Pruebas de aceptación ya disponibles: sonda `sonda_rutas_abiertas_s3.py` (hoy 12/12 abiertas),
  `prueba_remediacion_s3.py` e `inventario_rutas.py`.
- Efecto colateral positivo de R4 sobre H-01: como la identidad demo está apagada por defecto,
  `X-Rol` sin sesión responde 401 salvo que alguien la active explícitamente en `development`/`test`.
  **No cierra H-01:** las pantallas heredadas aún la necesitan.
- **H-02 sigue abierto en todos los modos**, también en producción (R4-03 y R4-06: 12/12 abiertas).

## 4. Archivos del incremento R4 (respecto de la tercera entrega)

| Archivo | Tipo | Motivo |
|---|---|---|
| `HITO-3/backend/app/core/config.py` | Modificado | Matiz A |
| `HITO-3/backend/app/services/auth.py` | Modificado | Matiz B (login y validación central) |
| `HITO-3/backend/app/core/permisos.py` | Modificado | Matiz B (definición única de cuenta demo) |
| `HITO-3/backend/docker-compose.yml` | Modificado | Matiz A (`APP_ENV` obligatorio; demo `false` por defecto) |
| `HITO-3/backend/.env.example` | Modificado | Matiz A (documentación de la política, solo valores ficticios) |
| `HITO-3/backend/tests_s3_daniel.py` | Modificado | +9 pruebas (A y B); declara `APP_ENV=test` |
| `HITO-3/backend/scripts/prueba_transicion_entorno_r4.py` | Nuevo | Prueba obligatoria de transición |
| `HITO-3/backend/docs/sprint3/daniel/remediacion_r4/*.md` | Nuevo | Esta acta y las dos matrices |
| `HITO-3/backend/docs/sprint3/daniel/evidencias/remediacion_r4/R4-01…R4-08` | Nuevo | Evidencias |

Archivos de compañeros modificados: **ninguno**. Frontend: **sin cambios** (idéntico a la entrega).

## 5. Impacto para el equipo (aviso)

- **`.env` local:** hay que agregar `APP_ENV=development` o Compose y la API no iniciarán. Es
  intencional (Matiz A).
- **Identidad demo:** la barra demo y los scripts con `X-Usuario-Id`/`X-Rol` necesitan
  `PERMITIR_IDENTIDAD_DEMO=true` explícito, solo en `development`/`test`.
- **Suites heredadas:** pasan sin modificarlas con `APP_ENV=test PERMITIR_IDENTIDAD_DEMO=true` (8/8).
- **Cuentas `@ejemplo.cl`:** quedan inutilizables en `staging`/`production`, por diseño.

## 6. Riesgos residuales y responsables

| # | Riesgo | Responsable |
|---|---|---|
| 1 | H-02: rutas heredadas sin autenticación (crítico si se expone la API) | Mirko; autores HU-20 y académico |
| 2 | H-01/H-03: `X-Rol` del cliente y propuesta sin aplicar | Autores HU-17/18/20/27 |
| 3 | `.env` publicados y contraseña de PostgreSQL trivial publicada | Equipo, en la fase Git (Benjamín) |
| 4 | MongoDB sin autenticación (mitigado con 127.0.0.1) | Benjamín |
| 5 | Sin límite de intentos de login | Daniel (siguiente sprint) |
| 6 | Revisiones cruzadas (Mirko, Benjamín, Diego, autores), estados Jira y caso 3.6 | Equipo y docente |
| 7 | Gate independiente desde clon Git limpio | Equipo / auditor |

**Estado:**
- **Matiz A:** implementado y probado.
- **Matiz B:** implementado y probado.
- **Sprint 3:** no apto para merge ni despliegue público.
