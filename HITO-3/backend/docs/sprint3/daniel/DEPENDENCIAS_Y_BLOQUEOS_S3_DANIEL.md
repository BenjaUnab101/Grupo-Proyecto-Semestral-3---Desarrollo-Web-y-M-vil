# Dependencias y bloqueos · Sprint 3 · Daniel Cortez

Estados de Jira consultados el 08-11-2026.

| Dependencia | Propietario | Estado Jira | Qué se verificó en el código | Impacto en mis tickets | Acción para el equipo |
|---|---|---|---|---|---|
| SCRUM-93 Arquitectura | Benjamín | Finalizado | No hay un documento ER/contratos en el repo; la arquitectura se deduce de `app/` | Ninguno bloqueante | Benjamín: adjuntar el ER/contratos al repo. |
| SCRUM-94 Backend + Swagger | Benjamín | Finalizado | Presente y funcionando (`/docs` 200) | Ninguno | — |
| SCRUM-95 Migraciones PostgreSQL | Mirko | En curso | V001–V005 y `migrar.sh` funcionan | Agregué **V006** (sesiones) y **V007** (contacto) siguiendo su convención, sin tocar las existentes | **Mirko:** revisar y aceptar V006/V007 como parte del esquema oficial. |
| SCRUM-99 Inscripciones/cupos | Mirko | En curso | Tablas y endpoints de HU-19 presentes; 18/18 PASS | El panel (HU-24) usa esas tablas. Agregué 2 llamadas de bitácora en `services/inscripciones.py` | **Mirko:** revisar esas 2 líneas (marcadas `HU-22 (Sprint 3 · Daniel)`). |
| SCRUM-103 Cliente HTTP React | Mirko | En curso | `services/http.js`, `useRecurso`, `EstadoCarga` presentes | Agregué `establecerToken` y el envío de `Authorization` en `pedir()` (sin quitar `X-Usuario-Id`); `SesionProvider` ganó `iniciarSesion/cerrarSesion` | **Mirko:** revisar el cambio; decidir cuándo retirar la barra demo y poner `PERMITIR_IDENTIDAD_DEMO=false`. |
| SCRUM-116 Índices/privacidad Mongo | Benjamín | Por hacer | — | Creé índices **provisionales** (TTL 365 d, tipo+fecha, recurso+fecha, actor+fecha) al arrancar | **Benjamín:** validar o reemplazar; documentar en SCRUM-116. |
| SCRUM-118 Colecciones NoSQL | Benjamín | Por hacer | — | Colección `auditoria_eventos` definida en `app/services/auditoria.py` | **Benjamín:** incorporarla al catálogo. |
| SCRUM-108 E2E integral | Benjamín | Por hacer | — | Mi evidencia es insumo, no lo reemplaza | Usar `EVIDENCIAS_Y_COMANDOS_S3_DANIEL.md` §«Material para SCRUM-108». |
| SCRUM-109 README / IA / defensa | Benjamín | Por hacer | — | — | Enlazar `USO_IA_S3_DANIEL.md` y la sección Docker. |

## Riesgos y hallazgos fuera de mi alcance (no corregidos)
1. **`X-Rol` en HU-17/18/20** (`app/api/eventos.py`): el rol lo declara el cliente, por lo que
   cualquiera puede decir `X-Rol: direccion`. Recomendación: migrar a `roles_requeridos(...)`.
2. **Identidad demo `X-Usuario-Id`** sigue activa por compatibilidad (`PERMITIR_IDENTIDAD_DEMO=true`).
   Con ella, cualquiera puede actuar como otra cuenta en las rutas antiguas. Las rutas nuevas de este
   sprint **no** la aceptan.
3. Varias rutas antiguas (p. ej. `POST /eventos/{id}/inscripciones`, `GET /apoderados/{id}/inscripciones`)
   reciben `apoderado_id` en el cuerpo/URL sin sesión. Recomendación: tomarlo del token.
4. No hay límite de intentos de login (fuerza bruta). Recomendación para un sprint siguiente.

## Discrepancias de Jira registradas (sin cambiar responsables)
- **SCRUM-105:** la persona asignada es **Daniel Cortez**, pero la descripción dice «Responsable
  propuesto: Mirko Massa» y «Revisor cruzado: Diego Rubilar». Se implementó porque está asignado a
  Daniel; el equipo debe confirmar responsable y revisor antes de la revisión cruzada.
- **SCRUM-35, SCRUM-39, SCRUM-40, SCRUM-41** aparecen asignados a Daniel y «Por hacer» en el backlog
  de `SCRUM`. SCRUM-35 es la épica 7 (migración a React, ya entregada en el Sprint 2). SCRUM-39/40/41
  hablan de «dataset temporal DMC», «ranking de riesgo» y «DEM», que no corresponden a Pequeños Reyes
  (parecen del proyecto S.A.P.I.). **No se implementaron.** Acción: Daniel decide si se cierran,
  se mueven al proyecto correcto o se descartan.
