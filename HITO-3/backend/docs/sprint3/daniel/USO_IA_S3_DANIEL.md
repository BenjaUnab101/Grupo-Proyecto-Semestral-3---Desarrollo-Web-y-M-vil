# Uso de IA · Sprint 3 · Daniel Cortez

| Campo | Detalle |
|---|---|
| Herramienta | Claude Code (modelo Claude Opus 5.5, Anthropic), en la app de escritorio, con acceso al repositorio local, Docker y Jira (conector Atlassian). |
| Prompt de referencia | `PROMPT_MAESTRO_CLAUDE_PEQUENOS_REYES_SPRINT3_DANIEL.md` (redactado por Daniel con ayuda de ChatGPT) + la instrucción directa de Daniel de realizar sus tareas y marcarlas como realizadas en Jira. |
| Propósito | Implementar los 10 tickets de Daniel del Sprint 3 (código backend y React, migraciones, Docker, pruebas) y su documentación. |
| Resultado | Ver `ACTA_EJECUCION_S3_DANIEL.md` y `MATRIZ_TRAZABILIDAD_S3_DANIEL.md`. |

## Validación técnica realizada (automática, por la IA)
- Pruebas unitarias del backend (30 nuevas + 8 previas) en Python 3.12.
- Pruebas de integración contra PostgreSQL y MongoDB reales en Docker (22 + 3 tras reinicio).
- Regresión de todos los scripts de integración de los compañeros (sin fallos).
- Pruebas, lint y build del frontend (132/132; sin problemas de lint nuevos).
- Recorrido manual del flujo en el navegador (login, hermanos, ficha, logout, paneles, contacto).
- Revisión de que la contraseña de prueba no quedó escrita en ningún archivo del proyecto.

## Lo que requiere validación HUMANA (no hecha por la IA)
- **Revisión cruzada** de cada ticket por el revisor indicado en Jira (Mirko, Benjamín, Diego).
- Lectura y comprensión del código por Daniel para la **defensa individual**: decisiones de hash
  (PBKDF2 vs bcrypt), sesiones en BD vs JWT, consistencia SQL→Mongo sin transacción distribuida.
- Aceptación por Mirko de las migraciones V006/V007 y del cambio en `http.js` / `SesionProvider`.
- Aceptación por Benjamín de la colección e índices de auditoría.
- Confirmación docente del encuadre del caso 3.6 (no existe a la fecha).
- Prueba de `docker compose up --build` desde un **clon Git limpio** después de integrar.

Ninguna persona del equipo ni el docente validó este trabajo dentro de esta ejecución.
