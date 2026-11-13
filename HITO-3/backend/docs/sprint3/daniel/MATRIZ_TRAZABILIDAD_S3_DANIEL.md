# Matriz de trazabilidad · Sprint 3 · Daniel Cortez

Evidencias en `evidencias/`: **01** unitarias backend · **02** compose/healthchecks · **03** integración
SQL+Mongo · **04** persistencia tras reinicio · **05** regresión de compañeros · **06** frontend.
Casos `T:` = `tests_s3_daniel.py` · `S3-xx` = `scripts/prueba_s3_daniel.py` · `F:` = `src/services/s3_daniel.test(IA).js`.

| Ticket | CA | Implementación (archivo / ruta) | Prueba | Evid. | Estado |
|---|---|---|---|---|---|
| SCRUM-92 | CA1 matriz | `DIAGNOSTICO_TALLER2_S3_DANIEL.md` §CA1 | Revisión contra código | — | Cumplido |
| SCRUM-92 | CA2 inventario | ídem §CA2 | — | — | Cumplido |
| SCRUM-92 | CA3 encuadre 3.6 | ídem §CA3 (riesgo registrado, sin aprobación docente) | — | — | Cumplido como «riesgo registrado» |
| SCRUM-92 | CA4 no reabrir | Ningún ticket cerrado modificado | — | — | Cumplido |
| SCRUM-96/121 | CA1 hash | `app/core/seguridad.py` PBKDF2 | T: `test_hash_pbkdf2_con_sal_y_verificacion` | 01 | PASS |
| SCRUM-96/121 | CA2 sesión/logout real | `POST /auth/login`, `POST /auth/logout`, tabla `sesiones` (V006) | T: logout/expirado/inventado · S3-02, S3-21, S3-22 | 01, 03 | PASS |
| SCRUM-96/122 | CA3 401/403 | `app/core/permisos.py` | T: `test_sin_sesion_401`, `test_roles_sin_portal_403` · S3-03, S3-09 | 01, 03 | PASS |
| SCRUM-96/122 | CA4 sin acceso cruzado | `app/services/portal.py::ficha_alumno` | T: `test_acceso_cruzado_...`, `test_alumno_inexistente_...` · S3-07 | 01, 03 | PASS |
| SCRUM-96/122 | CA5 selector desde SQL (0/1/2+) | `GET /portal/alumnos`; `PortalApoderados.jsx` | T: `test_selector_hermanos_0_1_y_2_hijos_desde_sql` · S3-04/05/06 · prueba manual en navegador (5 hermanos) | 01, 03 | PASS |
| SCRUM-102/126 | CA1 escritura de eventos | `app/services/auditoria.py::registrar`; llamadas en auth, portal, contacto, inscripciones | T: `test_login_queda_en_bitacora_sin_datos_sensibles` · S3-16, S3-19 | 01, 03 | PASS |
| SCRUM-102/127 | CA2 consulta filtrada/paginada | `GET /auditoria/eventos` | T: `test_filtros_y_paginacion`, `test_filtro_por_fecha_y_validaciones` | 01 | PASS |
| SCRUM-102/127 | CA3 persiste tras reinicio | Volumen `mongo_data` | S3-P2 tras `down` + `up` (sin `-v`) | 04 | PASS |
| SCRUM-102 | CA4 motivo y minimización | Docstring de `auditoria.py`; ACTA §2 | T: `test_datos_no_permitidos_se_descartan` | 01 | PASS |
| SCRUM-102 | Mongo caído | 503 en lectura; negocio sigue | T: `test_mongo_caido_lectura_503_y_escritura_no_rompe_el_negocio` | 01 | PASS |
| SCRUM-114 | CA1 validado y persistido | `POST /contacto`, tabla `consultas_contacto` (V007); `FormContacto.jsx` | T: `test_visitante_crea_201_...` · S3-11 · envío real desde React (CT-JW5KU6) | 01, 03 | PASS |
| SCRUM-114 | CA2 estados nuevo/en_gestion/cerrado | `PATCH /contacto/{id}/estado`; `PanelContacto.jsx` | T: `test_solo_direccion_lista_y_cambia_estado` · S3-13 | 01, 03 | PASS |
| SCRUM-114 | CA3 solo lo propio | `GET /contacto/mias`; seguimiento con código+correo | T: `test_apoderado_ve_solo_sus_consultas` · S3-14 | 01, 03 | PASS |
| SCRUM-114 | CA4 201 / 400 / 403 | ídem | T: `test_validaciones_400` · S3-10, S3-12 | 01, 03 | PASS |
| SCRUM-114 | Persistencia tras reinicio | Volumen `postgres_data` | S3-P1 | 04 | PASS |
| SCRUM-105 | CA1 agregaciones SQL reales | `app/services/panel.py::indicadores` | T: `test_agregaciones_sql_incluyen_actividad_sin_inscritos` · S3-17 (coincide con HU-19) | 01, 03 | PASS |
| SCRUM-105 | CA2 eventos Mongo por backend | `GET /panel/participacion/historial` | T: `test_historial_desde_mongo_filtrado_por_actividad` · S3-16 | 01, 03 | PASS |
| SCRUM-105 | CA3 filtros actividad/período | ídem | T: `test_filtros_actividad_y_periodo` | 01 | PASS |
| SCRUM-105 | CA4 carga/vacío/error | `PanelParticipacion.jsx` con `EstadoCarga` | F: HU-24/HU-22 · verificación manual en navegador | 06 | PASS (UI sin captura guardada) |
| SCRUM-105 | CA5 permisos por rol | `roles_requeridos("administrador","organizador")` | T: `test_permisos_por_rol` · S3-18 | 01, 03 | PASS |
| SCRUM-107 | CA1 `up --build` desde clon limpio | `docker-compose.yml`, `Dockerfile` frontend | `up --build` en un proyecto aislado con volúmenes NUEVOS | 02 | **Parcial:** no se hizo desde un clon Git limpio (la carpeta no es repo Git) |
| SCRUM-107 | CA2 persistencia SQL y Mongo | volúmenes nombrados | S3-P1/P2/P3 + `prueba_tec16/hu25 verificar` tras `down`/`up` | 04, 05 | PASS |
| SCRUM-107 | CA3 dependencias y puertos | `depends_on: condition: service_healthy`; puertos por variable | `docker compose config` | 02 | PASS |
| SCRUM-107 | CA4 sin secretos versionados | `.env.example` ficticio, `.gitignore` con `.env`, `.dockerignore` | revisión + grep de la clave de prueba (0 coincidencias en el proyecto) | — | PASS |
| SCRUM-107 | CA5 healthchecks | 4 servicios `healthy` | `docker compose ps` | 02 | PASS |
