# Evidencias y comandos reproducibles · Sprint 3 · Daniel Cortez

Entorno de ejecución: Windows 11 · Docker Desktop 29.9.2 · Node 26.13 / npm 11.20 · imagen
`python:3.12-slim` para el backend. Fecha: 08-11-2026 (hora de Chile). Las salidas completas están en
`evidencias/`; aquí, el resumen. Nada se inventó: cada número viene de una ejecución real.

## Preparación

```bash
cd HITO-3/backend
cp .env.example .env              # cambiar POSTGRES_PASSWORD y definir DEMO_PASSWORD (solo local)
docker compose up --build -d
docker compose ps                 # los 4 servicios deben quedar (healthy)
```

URLs: React http://localhost:5173 · API http://localhost:8000/health · Swagger http://localhost:8000/docs

Cuentas ficticias (contraseña = la `DEMO_PASSWORD` que cada uno define en su `.env`):
`apoderado.demo1@ejemplo.cl` (5 hijos), `apoderado.demo2@ejemplo.cl` (1 hijo),
`apoderado.demo3@ejemplo.cl` (0 hijos), `educadora.demo@ejemplo.cl` (personal),
`direccion.demo@ejemplo.cl` (dirección).

> Si el volumen de PostgreSQL ya existía antes de este sprint, aplicar las migraciones nuevas sin
> borrar datos: `docker compose exec postgres sh /sql/migrar.sh`

## Resultados

| # | Comando | Resultado |
|---|---|---|
| 01 | `python -m unittest -v tests_s3_daniel` (en `python:3.12-slim`) | **30/30 OK** |
| 01 | `python -m unittest tests_hu17 / hu18 / hu20 / hu27` (regresión) | **8/8 OK** (igual que la línea base) |
| 02 | `docker compose config --quiet` · `docker compose ps` | config OK · frontend, api, postgres, mongo **healthy** · `/health` 200 · `/docs` 200 · React 200 |
| 03 | `docker compose exec api python -m scripts.prueba_s3_daniel crear` | **22/22 PASS** |
| 04 | `docker compose down` (**sin -v**) → `up -d` → `prueba_s3_daniel verificar` | **3/3 PASS** (consulta de contacto con su estado, eventos Mongo y panel siguen ahí) |
| 05 | Scripts de compañeros: `prueba_tec17`, `prueba_hu19`, `prueba_hu21`, `prueba_hu25 crear/verificar/negativos`, `prueba_tec16 crear/verificar` | 10/10 · 18/18 · 23/23 · 3/3 · 4/4 · 13/13 · 20/20 · 4/4 — **sin regresiones** |
| 06 | `npm test` (HITO-2/frontend-react) | **132/132** (123 previas + 9 nuevas) |
| 06 | `npx eslint .` | 26 problemas, **los mismos 26 preexistentes**; 0 en archivos tocados por este sprint |
| 06 | `npm run build` | OK |

Nota sobre la regresión de HU-25: `prueba_hu25 negativos` borra los datos que deja `crear`, así que el
orden correcto es `crear` → (reinicio) → `verificar` → `negativos`. En una primera corrida se ejecutó
en otro orden y `verificar` falló por esa razón (no por un defecto); en la corrida registrada en
`evidencias/05` el orden es el correcto.

## Verificación manual en el navegador (sin capturas guardadas)
Con el stack de Docker, en http://localhost:5173:
1. Portal familias → contraseña incorrecta → «Credenciales inválidas…» (genérico).
2. Login `apoderado.demo1` → 5 botones de hermanos; ficha con sala, nivel, matrícula 2026; al elegir
   «Alumno Demo 05» aparece su inscripción al «Taller de reciclaje con familias».
3. «Cerrar sesión» → la barra vuelve a «Visitante».
4. Login `direccion.demo` → aparecen «Participación en actividades» (3 actividades, 1 inscrito, 3,1 %),
   la bitácora (49 eventos en ese momento) y «Consultas de familias».
5. Formulario de contacto → «Consulta recibida. Tu código de seguimiento es CT-JW5KU6».
En esta verificación se detectó y corrigió un defecto: las horas de Mongo llegaban sin zona y React
las mostraba 3 horas adelantadas. Ahora la API las envía en UTC explícito (prueba agregada).

No se guardaron capturas de pantalla: SCRUM-108 (Benjamín) puede generarlas con estos mismos pasos.

## Material para SCRUM-108 (E2E del equipo, Benjamín)
- Flujo React → API → SQL/Mongo → React: pasos 1–5 de arriba.
- Swagger: http://localhost:8000/docs (grupos `autenticacion`, `portal`, `auditoria`, `panel`, `contacto`).
- 403: ficha de un hijo ajeno (`GET /api/v1/portal/alumnos/{id}` con token de otro apoderado).
- 409: sobrecupo con el evento `DEMO-CUPO-REDUCIDO` (HU-19), o reabrir una consulta cerrada (HU-26).
