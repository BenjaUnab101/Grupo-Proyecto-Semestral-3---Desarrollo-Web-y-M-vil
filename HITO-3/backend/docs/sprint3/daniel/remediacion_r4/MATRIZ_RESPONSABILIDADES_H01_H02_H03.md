# Matriz de responsabilidades · H-01, H-02, H-03 · Sprint 3 · Pequeños Reyes

**Fecha:** 09-11-2026 · **Preparada por:** Claude Code (Opus 5.5) a pedido de Daniel Cortez.
**Decisión de Daniel (R4):** la corrección definitiva corresponde a los autores de cada
funcionalidad. **Daniel no tiene autorización para modificar estas rutas.** Este documento solo
propone. Ningún parche de código ajeno está aplicado.

> **Ninguna ruta que exponga datos personales de alumnos o permita operaciones privilegiadas sin
> sesión puede declararse segura para despliegue.** Con la configuración actual, el backend **no
> debe publicarse** ni recibir datos reales.

## 1. Responsables

| Hallazgo | Descripción | Responsable de la corrección | Revisión |
|---|---|---|---|
| **H-01** | `X-Rol` sin sesión se acepta mientras la identidad demo esté activa (solo `development`/`test` con `PERMITIR_IDENTIDAD_DEMO=true`; desde R4 está **apagada por defecto**) | Autores HU-17/18/20/27 (backend y frontend) | Benjamín (integración) |
| **H-02** | Rutas heredadas sin autenticación ni autorización por recurso (lecturas de alumnos, matrículas, asistentes y pagos; escrituras de eventos, inscripciones, pagos, matrículas y categorías). **No dependen de `X-Rol` y siguen abiertas en modo estricto y en producción** | Mirko (HU-19, TEC-16, identidad de apoderados, inscripciones); autores HU-20 (pagos) y del módulo académico | Benjamín (integración y Docker) · Daniel (pruebas negativas, sin aplicar cambios) |
| **H-03** | La propuesta `PROPUESTA_X_ROL_RUTAS_HEREDADAS.patch` (no aplicada) solo cubre `X-Rol` en `eventos.py`/`documentos.py`; no cubre H-02 | Autores HU-17/18/20/27 | Benjamín |
| MongoDB sin autenticación | Puerto restringido a 127.0.0.1 desde H-04; sin credenciales | Benjamín (SCRUM-116/118) | Mirko |
| `.env` publicados en `main` | Contraseña de PostgreSQL trivial y publicada | Equipo, en la fase Git autorizada (Benjamín, autor de los commits) | Daniel |

## 2. Contrato de autorización propuesto (por ruta)

Convención: **sin token → 401**; **token sin rol o sin propiedad del recurso → 403**;
**token válido con permiso → éxito**. «Personal» = `administrador` u `organizador`.
«Propietario» = el apoderado del token está ligado al alumno o recurso en `apoderados_alumnos`.

| Módulo / archivo | Ruta | Hoy | Contrato propuesto | Dueño |
|---|---|---|---|---|
| `api/inscripciones.py` | `POST /eventos` · `PATCH /eventos/{id}` · `DELETE /eventos/{id}` | Abierta | Personal | Mirko |
| | `GET /eventos`, `GET /eventos/{id}` | Abierta | Pública (catálogo); sin datos personales | Mirko |
| | `GET /eventos/{id}/asistentes` | Abierta (nombres de alumnos) | Personal | Mirko |
| | `POST /eventos/{id}/inscripciones` | Abierta (`apoderado_id` en el cuerpo) | Apoderado propietario; `apoderado_id` **del token** | Mirko |
| | `POST /inscripciones/{id}/cancelar` | Abierta | Apoderado propietario o personal | Mirko |
| | `GET /apoderados/{id}/inscripciones` | Abierta | Apoderado con `{id}` igual al del token, o personal | Mirko |
| | `POST/GET /inscripciones/{id}/pagos` | Abierta | Apoderado propietario o dirección | Mirko |
| `api/eventos.py` | `GET /pagos`, `GET /pagos/comprobante/{codigo}` | Abierta (RUT, nombre de párvulo) | Dirección; el comprobante, solo para su propietario | Autor HU-20 |
| | `POST /pagos` · `PATCH /pagos/{id}/estado` | Abierta | Propietario para crear; dirección para cambiar estado | Autor HU-20 |
| | Escrituras de `/categorias-actividad`, `/organizadores`, `/actividades/*` | `X-Rol` del cliente (H-01) | Rol desde el token (propuesta H-03) | Autores HU-17/18 |
| `api/documentos.py` | `POST/PATCH /documentos` | `X-Rol` del cliente | Dirección desde el token (propuesta H-03) | Autor HU-27 |
| `api/academico.py` | `GET /alumnos`, `GET /matriculas` | Abierta (107 alumnos ficticios) | Personal | Autor del módulo académico / TEC-16 |
| | `POST /matriculas` | Abierta | Dirección | Autor del módulo académico / TEC-16 |
| | `GET /salas` | Abierta | Pública | — |
| `api/catalogo.py` | `POST /categorias` | Abierta | Dirección | Mirko (TEC-16) |
| `api/comunicados.py` | `GET /apoderados/{id}/comunicados` | Abierta | Apoderado con `{id}` igual al del token, o personal | Mirko (HU-21) |
| `api/sesion.py` | `GET /sesion/cuentas-demo` | Abierta (lista cuentas ficticias) | Eliminar al retirar la barra demo; mientras tanto, solo con identidad demo activa | Mirko (TEC-17) |

**Piezas ya disponibles para implementarlo,** en `app/core/permisos.py`, sin aplicar a esas rutas:
`usuario_autenticado`, `roles_requeridos(...)`, `rol_de_sesion`. Para la propiedad existe
`revisar_apoderado` en `app/services/inscripciones.py`.

**Cambios de frontend que dependen de esto (mismos dueños):** `services/eventosApi.js`,
`documentosApi.js` y `actividadesApi.js` deben usar `pedir()` de `http.js`, que ya envía el token, y
dejar de enviar `apoderado_id` y `X-Rol`. También hay que retirar `BarraSesionDemo` y migrar
`scripts/prueba_tec17/hu21/hu25` a Bearer.

## 3. Pruebas de aceptación disponibles (no requieren tocar código ajeno)

| Prueba | Qué verifica | Resultado actual |
|---|---|---|
| `scripts/sonda_rutas_abiertas_s3.py` | 12 rutas sin token, `X-Usuario-Id` ni `X-Rol` | **12/12 ABIERTAS** (R4-03 y R4-06). Criterio de cierre: **12/12 en 401/403** |
| `scripts/prueba_remediacion_s3.py estricto` | Rutas nuevas sin `X-Usuario-Id`; `X-Rol` contrastado; heredadas en modo estricto | 15/15 PASS |
| `docs/sprint3/daniel/remediacion/inventario_rutas.py` | Lista toda ruta sin dependencia de autenticación | 34/66 sin dependencia (incluye públicas por diseño) |
| Regresiones heredadas en modo estricto | Que las suites de cada dueño pasen sin identidad demo | hu21 6/23, hu25 1 FAIL, tec17 se cae (`KeyError`); hu19 y tec16 PASS |

**Gate sugerido para el PR de cada dueño:**
1. La sonda llega a 401/403 en sus rutas.
2. Su suite heredada pasa con `APP_ENV=test PERMITIR_IDENTIDAD_DEMO=false`.
3. Agrega pruebas de propiedad: el apoderado A no puede leer ni modificar recursos del apoderado B.

## 4. Impacto de R4 en el trabajo de los compañeros (informativo)

- **`.env` local:** agregar `APP_ENV=development`. Sin esa variable, `docker compose up` y la API se
  niegan a iniciar, lo que es intencional (Matiz A).
- **Identidad demo:** para seguir usando la barra demo y los scripts con `X-Usuario-Id`, poner
  explícitamente `PERMITIR_IDENTIDAD_DEMO=true`, solo en `development`/`test`. Por defecto está en `false`.
- **Suites `tests_hu17/18/20/27`:** ejecutarlas con `APP_ENV=test PERMITIR_IDENTIDAD_DEMO=true`.
  Así pasan 8/8 sin modificarlas (R4-01). Sin `APP_ENV` no inician; con la identidad demo en
  `false` fallan, porque envían `X-Rol` sin sesión.
- **Cuentas `@ejemplo.cl`:** no inician sesión ni usan tokens en `staging` ni `production`. Para
  demos en esos entornos se necesitan cuentas propias de otro dominio.
