# Acta de CI · PR #23 · 09-11-2026

**Rama:** `cierre-total-daniel-20261109` (local `sprint3/daniel-cierre-seguridad`).
**Ejecutor:** Claude Code (Opus 5.5), a pedido de Daniel Cortez. El PR **no se fusionó**.
**Restricciones respetadas:**
- Ningún README modificado.
- S.A.P.I. sin tocar.
- Solo credenciales ficticias de CI.
- Los seis commits publicados (`d395956` … `e738626`) quedaron intactos.

## 1. Commits nuevos

| Commit | Contenido |
|---|---|
| `8f5b56e29c91903a20729ffa3d7d8d9eb71a3ecf` | `.github/workflows/ci.yml`, `scripts/ci_integracion.sh` y el código de salida de `sonda_rutas_abiertas_s3.py` |
| (este) | Esta acta |

## 2. Workflow `CI`

| Job | Qué ejecuta |
|---|---|
| Frontend | `npm ci`, `npm test` (143), `eslint --max-warnings 0`, `npm run build` |
| Backend | `pip install`, `unittest discover` con `APP_ENV=test` (62). Comprueba que la API no arranca sin `APP_ENV`, que no arranca en producción con identidad demo y que sí arranca con `APP_ENV=production` |
| Integración (requiere los dos anteriores) | Docker Compose con PostgreSQL 16, MongoDB 7, la API y el frontend, en el proyecto `pr_ci` con volúmenes nuevos. Detalle en la sección 3 |

## 3. Resultados

### GitHub Actions (commit `8f5b56e`), consultado en la API pública de GitHub

| Run | Evento | Frontend | Backend | Integración |
|---|---|---|---|---|
| 42700529513 | pull_request | success (16 s) | success (30 s) | success (1 min 43 s) |
| 42700520337 | push | success | success | success |

`check-runs` del commit: **6**, todos con `success`. Los registros detallados de los jobs requieren
iniciar sesión en GitHub. Desde aquí solo se verificó la conclusión de cada job; se pueden revisar en
la pestaña *Checks* del PR.

### Ejecución local (Docker Desktop, Windows): 29 gates PASS, 0 fallas

- **APP_ENV:** `docker compose config` falla sin `APP_ENV` y pasa con `APP_ENV=development`.
- **Arranque:** `up --build` con 4 servicios *healthy*; `schema_migraciones` registra V001–V007.
- **Seguridad, modo estricto:**
  - Sonda H-02: 0/12 rutas abiertas.
  - `prueba_cierre_h02`: rol, propiedad y aislamiento entre familias (401/403).
  - `prueba_remediacion_s3 estricto`: `X-Usuario-Id` y `X-Rol` no otorgan permisos.
- **Regresiones:** S3 Daniel, TEC-17, HU-19, HU-21, HU-25 y TEC-16.
- **Persistencia:** `down` sin `-v`, luego `up`. Los volúmenes se conservan y pasan las verificaciones de S3, TEC-16 y HU-25 (incluidos los negativos).
- **Producción con el mismo volumen:**
  - API sana.
  - Cuentas demo bloqueadas y cuenta legítima operativa.
  - Sonda 0/12.
  - No arranca con `PERMITIR_IDENTIDAD_DEMO=true`.

**Fallos encontrados y corregidos durante la preparación:**
- Volúmenes `pr_ci` de una ejecución abortada tenían hashes demo con otra contraseña. Se corrigió con una `DEMO_PASSWORD` ficticia fija y con `down -v` limitado a los proyectos `pr_ci*`.
- `docker cp` con una ruta `/tmp` de Git Bash fallaba en Windows. Se reemplazó por `docker compose cp` con una ruta relativa.

## 4. Inventario real de Jira (sin modificar Jira)

| Categoría | Incidencias |
|---|---|
| Implementación pendiente | Ninguna dentro del alcance de Pequeños Reyes. Mejoras futuras sin incidencia: límite de intentos de login y credenciales de MongoDB |
| Documentación pendiente | SCRUM-54 CA2, SCRUM-66 (TEC-08) y la parte de README de SCRUM-109/132: **Benjamín**. Reporte de IA del equipo (SCRUM-109) |
| Validación o revisión humana | SCRUM-108, 130 y 131 (revisión cruzada) · 119, 120, 123, 124, 125, 128, 129, 73, 74, 75 y 59 (implementadas; falta el cambio de estado) · 14, 25, 27, 28, 44, 45 y 46 («En revisión») · 53, 67, 84, 116, 117 y 118 (entregadas en el PR) |
| Personales | SCRUM-69, 81, 82, 83 y 85 (defensa individual) |
| Requiere administrador | SCRUM-65 (app «GitHub for Jira») |
| Excluidas | SCRUM-39, 40 y 41 (S.A.P.I.) · SCRUM-4 (sin criterios) · épicas (se cierran con sus hijas) |

## 5. Bloqueantes restantes para el merge

1. **Rotar la contraseña de PostgreSQL** publicada en el historial de `main`. Es una acción humana.
2. **Revisión cruzada humana** del PR (Mirko, Benjamín y Diego) y aprobación en GitHub.
3. Actualizar los estados de Jira, a cargo de cada responsable.
4. README (Benjamín), si el docente exige el enlace de SCRUM-54 CA2 antes de integrar.

**Gate de CI:** aprobado, con resultados verificables (6/6 checks en GitHub y 29/29 gates locales).
**Gate de merge:** **no aprobado** mientras sigan abiertos los bloqueantes 1 y 2.
