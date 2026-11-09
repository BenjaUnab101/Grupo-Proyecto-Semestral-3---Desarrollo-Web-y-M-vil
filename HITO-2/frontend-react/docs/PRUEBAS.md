# Plan y ejecución de pruebas · Pequeños Reyes

**Incidencia:** TEC-10 (SCRUM-67) · **Ejecución registrada:** 09-11-2026 · **Rama:** `sprint3/daniel-cierre-seguridad`.

> Regla de registro: un resultado figura como **PASS** solo si se ejecutó en esta fecha. Lo que no
> tiene prueba automática ni ejecución manual registrada figura como **Pendiente**. Los inventarios
> de las secciones 3 y 4 se **generaron automáticamente** a partir de la salida de los ejecutores;
> no se escribieron a mano.

## 1. Niveles de prueba y cómo ejecutarlos

| Nivel | Qué cubre | Comando | Dónde |
|---|---|---|---|
| Unitarias y de servicios (frontend) | Utilidades puras, servicios HTTP con `fetch` simulado, contratos de componentes | `npm test` | `HITO-2/frontend-react` |
| Lint y build | Calidad estática y compilación de producción | `npx eslint .` · `npm run build` | `HITO-2/frontend-react` |
| Unitarias y de API (backend) | Rutas FastAPI con SQLite y Mongo simulado: permisos, validaciones, reglas | `APP_ENV=test python -m unittest discover -p "tests_*.py"` | `HITO-3/backend` (Python 3.12) |
| Integración real | API + PostgreSQL 16 + MongoDB 7 en Docker | `docker compose exec api python -m scripts.<script>` | `HITO-3/backend/scripts` |
| Seguridad (negativas) | 401/403, propiedad del recurso, rutas abiertas | `prueba_cierre_h02`, `sonda_rutas_abiertas_s3`, `prueba_remediacion_s3` | ídem |
| Interfaz (manual) | React → API → BD → React en el navegador | Pasos en `HITO-3/backend/docs/sprint3/cierre_seguridad/INFORME_TEC20_PRUEBAS.md` | navegador |

**Tipos de caso exigidos (CA2):**
- Positivos: flujo exitoso.
- Negativos: 400, 401, 403, 404 y 409.
- Frontera:
  - mensaje de 9 contra 10 caracteres (HU-12);
  - cupo exacto contra sobrecupo (HU-19);
  - fechas fuera del pronóstico (HU-06);
  - `APP_ENV` vacío o desconocido.
- Caída de API:
  - clima con HTTP de error y contrato inválido;
  - MongoDB caído (503 en lectura; el negocio sigue funcionando).

## 2. Resumen de resultados (09-11-2026)

| Suite | Resultado |
|---|---|
| Frontend `npm test` | **143/143 PASS** |
| Frontend `eslint` | **0 problemas** (antes 26, corregidos en esta rama) |
| Frontend `npm run build` | OK |
| Backend `unittest discover` | **62/62 PASS**, también en un solo proceso y en orden inverso |
| Integración en modo estricto (sin identidad demo) | `prueba_cierre_h02` 29/29 · `prueba_remediacion_s3 estricto` 15/15 · `prueba_s3_daniel` 22/22 · `prueba_tec17` 12/12 · `prueba_hu19` 18/18 · `prueba_hu21` 23/23 · `prueba_hu25` 3/3 · `prueba_tec16` 20/20 |
| Persistencia tras `down` sin `-v` | `prueba_s3_daniel verificar` 3/3 · `prueba_tec16 verificar` 4/4 · `prueba_hu25 verificar` 4/4 · `negativos` 13/13 |
| Integración en desarrollo con identidad demo | Mismos scripts: todos PASS; transición a producción 4/4 + 14/14 |
| Sonda de rutas abiertas | **0/12** en desarrollo estricto, desarrollo con demo y producción |

Las salidas completas están en `HITO-3/backend/docs/sprint3/cierre_seguridad/evidencias/C-01`…`C-03`.

## 3. Inventario de casos del frontend (generado desde `node --test --test-reporter=tap`)

| # | Caso (nombre de la prueba) | Resultado |
|---|---|---|
| 1 | H-01: con sesión, las escrituras heredadas envían Bearer y nunca X-Rol | PASS |
| 2 | H-02: el apoderado no envía apoderado_id; el personal puede indicarlo | PASS |
| 3 | H-02: sin sesión, la API responde 401 y el servicio lo propaga | PASS |
| 4 | H-01/H-03: no quedan X-Rol ni selectores de rol en servicios ni pantallas heredadas | PASS |
| 5 | CP-TEC-18-01: obtenerPronostico transforma respuesta válida de Open-Meteo | PASS |
| 6 | CP-TEC-18-01: utilidades traducen códigos WMO y generan recomendaciones | PASS |
| 7 | CP-TEC-18-02: error HTTP del servidor externo lanza excepción controlada | PASS |
| 8 | CP-TEC-18-02: respuesta con formato JSON inválido o contrato corrupto es rechazada | PASS |
| 9 | CA3 y CA4: ClimaWidget incluye atribución, roles accesibles y no existen secretos hardcodeados | PASS |
| 10 | CA1: ordena de más reciente a más antiguo | PASS |
| 11 | CA1: no muta el arreglo de origen | PASS |
| 12 | CA3: los ids del JSON son únicos (sirven como key) | PASS |
| 13 | CA4: fechas inválidas no rompen y van al final | PASS |
| 14 | fecha ISO se interpreta como día local, sin desfase | PASS |
| 15 | CA3: lista vacía o valor no-arreglo devuelve [] | PASS |
| 16 | CA1: las opciones son Todos, General, Salas TEL y Preescolar, con Todos primero | PASS |
| 17 | CP-HU-03-01: elegir "Salas TEL" deja solo comunicados de ese nivel | PASS |
| 18 | CA1: cada nivel devuelve solo sus comunicados | PASS |
| 19 | CP-HU-03-02: un nivel sin comunicados devuelve lista vacía (dispara el mensaje vacío) | PASS |
| 20 | CA4: "Todos" restaura la colección completa y en el mismo orden | PASS |
| 21 | filtrar no muta la colección de origen | PASS |
| 22 | filtrar conserva el orden por fecha (más reciente primero) | PASS |
| 23 | entradas inválidas no rompen: no-arreglo da [], filtro desconocido equivale a Todos | PASS |
| 24 | regla General: por defecto el filtro es estricto (decisión pendiente de encuesta) | PASS |
| 25 | regla General: si se activa, cada nivel incluye también los General | PASS |
| 26 | datos: todo comunicado del JSON tiene un nivel válido | PASS |
| 27 | CP-HU-03-03 (estático): la lista se deriva en render, sin useEffect | PASS |
| 28 | CA1/CA4 (estático): FiltroNivel usa <button> con aria-pressed dentro de role="group" | PASS |
| 29 | CA1: usa la URL base, omite parámetros vacíos y envía X-Usuario-Id | PASS |
| 30 | CA1: POST envía el cuerpo en JSON; 204 devuelve null | PASS |
| 31 | CA3: 400 trae los errores por campo, traducidos | PASS |
| 32 | CA3: 401 y 403 tienen su propio mensaje | PASS |
| 33 | CA3: 409 muestra el motivo que da la API | PASS |
| 34 | CA3: 503 -> servicio no disponible | PASS |
| 35 | CA3: sin internet o servidor apagado -> estado 0 y mensaje de conexión | PASS |
| 36 | comunicado: snake_case -> props de ComunicadoCard; fecha en hora de Chile | PASS |
| 37 | publicar comunicado: POST con la cuenta elegida | PASS |
| 38 | actividad y perfil | PASS |
| 39 | CA1: solo services/ llama a fetch | PASS |
| 40 | CA2: la app ya no importa los JSON de salas, actividades ni comunicados | PASS |
| 41 | CA4: las secciones con datos de la API están en pages/ y usan useRecurso | PASS |
| 42 | CP-HU-17-01: flujo exitoso crear, editar y listar organizadores y categorías desde servicio React | PASS |
| 43 | CP-HU-17-02: rechazo por permiso insuficiente (403) o duplicado (409) propaga detalle de dominio | PASS |
| 44 | CA4: GestionOrganizadores está integrado en App.jsx y expone formularios y alertas accesibles | PASS |
| 45 | CP-HU-18-01: ciclo completo crear, editar, publicar, cancelar y filtrar solo publicadas | PASS |
| 46 | CP-HU-18-02: rechazo HTTP 400/403/409 en actividades propaga mensaje claro | PASS |
| 47 | CA5: App.jsx integra GestionActividades y sincroniza Agenda con actividadesCalendario | PASS |
| 48 | CP-HU-20-01: registra pago simulado, retorna comprobante verificable y permite transición autorizada | PASS |
| 49 | CP-HU-20-02: rechaza código de comprobante vacío, inexistente (404) o transición ilegal (409) | PASS |
| 50 | CP-HU-23-01: filtra actividades por categoría, disponibilidad de cupos y estado, y consulta inscripciones | PASS |
| 51 | CP-HU-23-02: maneja entradas inválidas en filtros, error de red 503 y estructura responsive | PASS |
| 52 | CP-HU-27-01: crear, editar, listar desde API y filtrar por categoría y vigencia | PASS |
| 53 | CP-HU-27-02: rechazo por permisos (403) o duplicado (409) y verificación de componentes accesibles | PASS |
| 54 | CA1: el consentimiento es obligatorio | PASS |
| 55 | CA2: enviarSolicitud hace POST /prematriculas y devuelve código y estado | PASS |
| 56 | CA4: un 400 de la API se muestra en los campos del formulario | PASS |
| 57 | 409 solicitud repetida: se muestra el motivo de la API | PASS |
| 58 | seguimiento: código y correo van en el cuerpo (no en la URL); 404 con el mensaje de la API | PASS |
| 59 | CA3: dirección lista con filtro y cambia el estado con su cuenta; 403 para otros | PASS |
| 60 | código guardado: sin almacenamiento del navegador (Node) no falla | PASS |
| 61 | privacidad: en el navegador solo se guarda el código; el formulario no usa fetch ni almacenamiento | PASS |
| 62 | solo dirección revisa las solicitudes (esDireccion) | PASS |
| 63 | HU-16: login envía email+contraseña por POST y devuelve token y perfil | PASS |
| 64 | HU-16: con token, pedir() envía Authorization y NO X-Usuario-Id | PASS |
| 65 | HU-16: logout llama al servidor; credenciales inválidas -> ErrorApi 401 | PASS |
| 66 | HU-16: hijos y ficha desde la API; 403 de un alumno ajeno llega como error | PASS |
| 67 | HU-16: el token no se guarda en el navegador y ya no existe la autenticación simulada | PASS |
| 68 | HU-26: enviar consulta (201) y mapear errores 400 por campo | PASS |
| 69 | HU-26: dirección filtra y cambia estado; 403 se informa | PASS |
| 70 | HU-24: el panel envía filtros y mapea las agregaciones | PASS |
| 71 | HU-22: historial y bitácora paginados; 503 de Mongo llega como error | PASS |
| 72 | CA1: formulario vacío marca los 5 campos como obligatorios | PASS |
| 73 | CA1: solo espacios cuenta como vacío (trim) | PASS |
| 74 | CA1: correo y teléfono con formato inválido dan error específico | PASS |
| 75 | CA1: datos válidos no generan errores | PASS |
| 76 | CA1: al corregir, el error del campo desaparece | PASS |
| 77 | CA-C: no exige un correo real, solo el formato | PASS |
| 78 | foco: el primer error sigue el orden visual | PASS |
| 79 | CA2: el mínimo documentado es 10 caracteres | PASS |
| 80 | CA2 / CP-HU-12-02: 9 caracteres fallan e indican el mínimo | PASS |
| 81 | CA2: 10 caracteres cumplen el mínimo | PASS |
| 82 | CA2: los espacios de los extremos no cuentan para el mínimo | PASS |
| 83 | CA2: tildes y emojis cuentan como un carácter | PASS |
| 84 | CA2: mensaje de faltantes en plural | PASS |
| 85 | límites máximos: asunto 100 y consulta 1000 | PASS |
| 86 | normalización al salir del campo: trim y formato de teléfono | PASS |
| 87 | CA4: FormContacto reutiliza FormField, FormularioDemo y el hook compartido | PASS |
| 88 | CA4: contacto.js usa validaciones.js y no redefine reglas | PASS |
| 89 | CA4: pre-matrícula (HU-11) usa las mismas validaciones compartidas | PASS |
| 90 | CA4: las reglas de correo y teléfono existen en un solo archivo | PASS |
| 91 | regresión: al confirmar se quita el foco antes de limpiar (sin error fantasma) | PASS |
| 92 | HU-26: FormContacto envía con services/contactoApi.js y muestra el código de seguimiento | PASS |
| 93 | CA3: sin solicitudes HTTP ni almacenamiento en el flujo de contacto | PASS |
| 94 | CA4: diasHasta cuenta días calendario (ayer -1, hoy 0, +7, +8) | PASS |
| 95 | CA2: «Próxima» incluye de 0 a 7 días; excluye +8 y ayer | PASS |
| 96 | CA4: diasHasta cruza meses, años y años bisiestos | PASS |
| 97 | CA-C: los cambios de hora de Chile no alteran el conteo de días | PASS |
| 98 | CA4: obtenerHoy usa America/Santiago y no la zona UTC del equipo | PASS |
| 99 | CA4: una fecha AAAA-MM-DD no se desplaza al día anterior al formatearla | PASS |
| 100 | CA-C: fechas vacías o inválidas devuelven null y no rompen | PASS |
| 101 | CA1: solo desde hoy en adelante y en orden ascendente | PASS |
| 102 | CA1: excluye ayer y las actividades sin fecha válida | PASS |
| 103 | CA1: no muta el arreglo de entrada | PASS |
| 104 | CA3: lista vacía, solo pasadas o valor no-arreglo devuelven [] | PASS |
| 105 | CP-HU-04-01: con actividades.json y hoy=2026-10-09 se listan 7 en orden | PASS |
| 106 | CP-HU-04-02: con hoy=2026-10-09 son «Próxima» hoy, +3, +5 y +7, pero no +8 | PASS |
| 107 | CP-HU-04-03: con hoy=2027-01-01 no quedan actividades futuras | PASS |
| 108 | fixtures: actividades.json está identificado como demo, con ids únicos y fechas válidas | PASS |
| 109 | contrato: Agenda → Calendario → ActividadItem, derivado en render y sin useEffect | PASS |
| 110 | formatearAsistencia acepta el rango 0-100 | PASS |
| 111 | formatearAsistencia rechaza valores fuera de rango o no numéricos | PASS |
| 112 | formatearAtrasos acepta enteros >= 0 | PASS |
| 113 | formatearAtrasos rechaza negativos, decimales o no numéricos | PASS |
| 114 | hayAlertaAtrasos solo es true para enteros válidos mayores a 2 | PASS |
| 115 | CP-HU-06-01 (CA1): actividad dentro del pronóstico -> condición, máxima y recomendación principal | PASS |
| 116 | CA3: varias recomendaciones -> orden definido (lluvia, sol, abrigo) y las demás accesibles | PASS |
| 117 | CP-HU-06-02 (CA2): fuera del rango, sin pronóstico o API caída -> sin insignia | PASS |
| 118 | CA2: datos nulos no se muestran como 0 ni disparan recomendaciones | PASS |
| 119 | Unión por fecha civil: compara "AAAA-MM-DD" sin convertir a UTC | PASS |
| 120 | Notas técnicas: useClima una vez en PaginaPrincipal y el pronóstico baja por props | PASS |
| 121 | TEC-06: el mapa WMO cubre todos los códigos documentados por Open-Meteo | PASS |
| 122 | CA1: formulario vacío marca los 7 obligatorios (incluido el consentimiento) y no el comentario opcional | PASS |
| 123 | CA-C: trim — un obligatorio con solo espacios cuenta como vacío | PASS |
| 124 | CA1: datos válidos no generan errores | PASS |
| 125 | CA4: el foco va al primer campo con error según el orden visual | PASS |
| 126 | CA-C RUT: acepta formatos normalizables y DV K mayúscula o minúscula | PASS |
| 127 | CA-C RUT: mensajes específicos para formato y para dígito verificador | PASS |
| 128 | CA-C RUT: al salir del campo se normaliza a 12.345.678-5 | PASS |
| 129 | CA2 correo: válidos e inválidos | PASS |
| 130 | CA-C teléfono: regla documentada — 9 dígitos, prefijo +56 opcional, no empieza en 0 ni 1 | PASS |
| 131 | CA-C teléfono: limpieza y formato consistente | PASS |
| 132 | CA2: un campo con error queda sin error al corregirlo | PASS |
| 133 | nivel: debe ser un id existente en niveles.json | PASS |
| 134 | niveles.json: ids únicos (sirven como key) y nombres no vacíos | PASS |
| 135 | comentario opcional y límites de largo | PASS |
| 136 | contrato: formulario controlado con valores/errores y FormField con aria | PASS |
| 137 | privacidad (HU-25): el formulario no guarda datos en el navegador ni hace fetch directo | PASS |
| 138 | limpiarRut quita puntos, guion y espacios, y sube el DV | PASS |
| 139 | calcularDigitoVerificador coincide con RUTs demo conocidos | PASS |
| 140 | validarRut acepta RUTs demo válidos en distintos formatos | PASS |
| 141 | validarRut rechaza DV incorrecto o estructura inválida | PASS |
| 142 | formatearRut devuelve el formato con puntos y guion | PASS |
| 143 | formatearRut devuelve null si el RUT no es válido | PASS |

## 4. Inventario de casos del backend (generado con `unittest.TestLoader().discover`)

Evento de auditoría acceso_login no guardado (MongoDB no disponible: ServerSelectionTimeoutError)
DEMO_PASSWORD se ignora: APP_ENV no es development ni test
| # | Prueba (módulo.clase.método) | Resultado |
|---|---|---|
| 1 | `tests_hu17.TestHU17OrganizadoresCategorias.test_cierre_h01_x_rol_ya_no_otorga_permisos` | PASS |
| 2 | `tests_hu17.TestHU17OrganizadoresCategorias.test_cp_hu_17_01_flujo_exitoso_crear_editar_listar` | PASS |
| 3 | `tests_hu17.TestHU17OrganizadoresCategorias.test_cp_hu_17_02_rechazo_permisos_duplicados_y_validacion` | PASS |
| 4 | `tests_hu18.TestHU18ActividadesEscolares.test_cp_hu_18_01_ciclo_crear_editar_publicar_cancelar_y_visibilidad` | PASS |
| 5 | `tests_hu18.TestHU18ActividadesEscolares.test_cp_hu_18_02_validaciones_entrada_y_rechazo_dominio` | PASS |
| 6 | `tests_hu20.TestHU20PagosYComprobantes.test_cp_hu_20_01_flujo_pago_simulado_comprobante_y_transiciones` | PASS |
| 7 | `tests_hu20.TestHU20PagosYComprobantes.test_cp_hu_20_02_rechazo_sin_cupos_transicion_invalida_y_validacion` | PASS |
| 8 | `tests_hu20.TestHU20PagosYComprobantes.test_cp_hu_20_03_pagos_exigen_sesion_y_rol` | PASS |
| 9 | `tests_hu27.TestHU27DocumentosProtocolos.test_cierre_h01_x_rol_ya_no_otorga_permisos` | PASS |
| 10 | `tests_hu27.TestHU27DocumentosProtocolos.test_cp_hu_27_01_crear_editar_filtrar_y_vigencia` | PASS |
| 11 | `tests_hu27.TestHU27DocumentosProtocolos.test_cp_hu_27_02_rechazo_sin_permisos_duplicados_y_categoria_invalida` | PASS |
| 12 | `tests_s3_daniel.TestCredencialesDemo.test_demo_password_reemplaza_solo_el_marcador_de_cuentas_ficticias` | PASS |
| 13 | `tests_s3_daniel.TestHU16Autenticacion.test_hash_pbkdf2_con_sal_y_verificacion` | PASS |
| 14 | `tests_s3_daniel.TestHU16Autenticacion.test_login_datos_invalidos_400` | PASS |
| 15 | `tests_s3_daniel.TestHU16Autenticacion.test_login_invalido_401_generico` | PASS |
| 16 | `tests_s3_daniel.TestHU16Autenticacion.test_login_queda_en_bitacora_sin_datos_sensibles` | PASS |
| 17 | `tests_s3_daniel.TestHU16Autenticacion.test_login_valido_entrega_token_y_perfil_con_hijos_sql` | PASS |
| 18 | `tests_s3_daniel.TestHU16Autenticacion.test_logout_revoca_el_token_en_el_servidor` | PASS |
| 19 | `tests_s3_daniel.TestHU16Autenticacion.test_portal_no_acepta_identidad_demo_x_usuario_id` | PASS |
| 20 | `tests_s3_daniel.TestHU16Autenticacion.test_token_expirado_401` | PASS |
| 21 | `tests_s3_daniel.TestHU16Autenticacion.test_token_inventado_o_mal_formado_401` | PASS |
| 22 | `tests_s3_daniel.TestHU16Autorizacion.test_acceso_cruzado_a_hijo_ajeno_403_y_queda_registrado` | PASS |
| 23 | `tests_s3_daniel.TestHU16Autorizacion.test_alumno_inexistente_tambien_403_para_no_revelar_ids` | PASS |
| 24 | `tests_s3_daniel.TestHU16Autorizacion.test_ficha_de_hijo_propio_con_matricula_e_inscripciones` | PASS |
| 25 | `tests_s3_daniel.TestHU16Autorizacion.test_roles_sin_portal_403` | PASS |
| 26 | `tests_s3_daniel.TestHU16Autorizacion.test_selector_hermanos_0_1_y_2_hijos_desde_sql` | PASS |
| 27 | `tests_s3_daniel.TestHU16Autorizacion.test_sin_sesion_401` | PASS |
| 28 | `tests_s3_daniel.TestHU16Autorizacion.test_token_tiene_prioridad_sobre_x_usuario_id` | PASS |
| 29 | `tests_s3_daniel.TestHU22Auditoria.test_datos_no_permitidos_se_descartan` | PASS |
| 30 | `tests_s3_daniel.TestHU22Auditoria.test_filtro_por_fecha_y_validaciones` | PASS |
| 31 | `tests_s3_daniel.TestHU22Auditoria.test_filtros_y_paginacion` | PASS |
| 32 | `tests_s3_daniel.TestHU22Auditoria.test_mongo_caido_lectura_503_y_escritura_no_rompe_el_negocio` | PASS |
| 33 | `tests_s3_daniel.TestHU22Auditoria.test_solo_direccion_consulta_la_bitacora` | PASS |
| 34 | `tests_s3_daniel.TestHU24Panel.test_agregaciones_sql_incluyen_actividad_sin_inscritos` | PASS |
| 35 | `tests_s3_daniel.TestHU24Panel.test_filtros_actividad_y_periodo` | PASS |
| 36 | `tests_s3_daniel.TestHU24Panel.test_historial_desde_mongo_filtrado_por_actividad` | PASS |
| 37 | `tests_s3_daniel.TestHU24Panel.test_permisos_por_rol` | PASS |
| 38 | `tests_s3_daniel.TestHU26Contacto.test_apoderado_ve_solo_sus_consultas` | PASS |
| 39 | `tests_s3_daniel.TestHU26Contacto.test_solo_direccion_lista_y_cambia_estado` | PASS |
| 40 | `tests_s3_daniel.TestHU26Contacto.test_validaciones_400` | PASS |
| 41 | `tests_s3_daniel.TestHU26Contacto.test_visitante_crea_201_con_codigo_y_consulta_seguimiento` | PASS |
| 42 | `tests_s3_daniel.TestR4ConfiguracionObligatoria.test_identidad_demo_desactivada_por_defecto` | PASS |
| 43 | `tests_s3_daniel.TestR4ConfiguracionObligatoria.test_la_aplicacion_no_inicia_sin_app_env` | PASS |
| 44 | `tests_s3_daniel.TestR4ConfiguracionObligatoria.test_sin_app_env_no_hay_valor_por_defecto_y_se_rechaza` | PASS |
| 45 | `tests_s3_daniel.TestR4ConfiguracionObligatoria.test_staging_y_production_nunca_admiten_demo` | PASS |
| 46 | `tests_s3_daniel.TestR4ConfiguracionObligatoria.test_valores_desconocidos_se_rechazan` | PASS |
| 47 | `tests_s3_daniel.TestR4ConfiguracionObligatoria.test_valores_validos_explicitos` | PASS |
| 48 | `tests_s3_daniel.TestR4CuentasDemoFueraDeDesarrollo.test_demo_reconocida_sin_importar_mayusculas` | PASS |
| 49 | `tests_s3_daniel.TestR4CuentasDemoFueraDeDesarrollo.test_login_demo_bloqueado_queda_en_bitacora_sin_datos_sensibles` | PASS |
| 50 | `tests_s3_daniel.TestR4CuentasDemoFueraDeDesarrollo.test_transicion_desarrollo_a_produccion_misma_base` | PASS |
| 51 | `tests_s3_daniel.TestRemediacionIdentidad.test_app_env_solo_development_o_test_activan_la_identidad_demo` | PASS |
| 52 | `tests_s3_daniel.TestRemediacionIdentidad.test_bearer_con_x_rol_coherente_201` | PASS |
| 53 | `tests_s3_daniel.TestRemediacionIdentidad.test_bearer_con_x_rol_falsificado_403` | PASS |
| 54 | `tests_s3_daniel.TestRemediacionIdentidad.test_demo_password_se_ignora_fuera_de_development` | PASS |
| 55 | `tests_s3_daniel.TestRemediacionIdentidad.test_estricto_x_rol_sin_sesion_401_y_x_usuario_id_401` | PASS |
| 56 | `tests_s3_daniel.TestRemediacionIdentidad.test_produccion_apaga_identidad_demo_aunque_el_flag_diga_true` | PASS |
| 57 | `tests_s3_daniel.TestRemediacionIdentidad.test_rutas_sin_x_rol_no_se_ven_afectadas` | PASS |
| 58 | `tests_s3_daniel.TestRemediacionIdentidad.test_x_rol_no_aparece_como_parametro_global_en_swagger` | PASS |
| 59 | `tests_s3_daniel.TestRemediacionIdentidad.test_x_rol_sin_identidad_ya_no_otorga_permisos` | PASS |
| 60 | `tests_s3_daniel.TestRemediacionIdentidad.test_x_usuario_id_demo_con_x_rol_falsificado_403` | PASS |
| 61 | `tests_s3_daniel.TestRemediacionIdentidad.test_x_usuario_id_mal_formado_401` | PASS |
| 62 | `tests_s3_daniel.TestRemediacionIdentidad.test_x_usuario_id_no_suplanta_cuentas_fuera_de_ejemplo_cl` | PASS |

## 5. Defectos reales encontrados y su estado (CA3)

| ID | Reproducción | Esperado / obtenido | Vínculo | Estado |
|---|---|---|---|---|
| DEF-01 | Revisar el historial Mongo en el panel de dirección | Hora de Chile / la hora salía 3 h adelantada (UTC sin zona) | HU-22 / HU-24 | Corregido (`_a_salida` envía UTC explícito) con prueba |
| DEF-02 | `GET /alumnos`, `/pagos`, `/eventos/{id}/asistentes` sin token | 401 / 200 con datos de alumnos y pagos | H-02 (HU-19, HU-20, TEC-16) | Corregido; sonda 0/12 |
| DEF-03 | `POST /organizadores` con `X-Rol: direccion` sin sesión | 401 / 201 | H-01 (HU-17/18/20/27) | Corregido |
| DEF-04 | Inscribir enviando el `apoderado_id` de otra familia | 403 / se aceptaba | H-02 (HU-19) | Corregido (el apoderado sale del token); `prueba_cierre_h02` C-08 |
| DEF-05 | `python -m unittest discover` con todos los módulos | Todo OK / 33 fallos y 3 errores por reemplazos globales | Calidad backend | Corregido (`setUpModule` por módulo) |
| DEF-06 | `npx eslint .` | 0 problemas / 26 (21 errores) | Calidad frontend | Corregido |
| DEF-07 | Abrir el portal sin identidad demo activa | Sin barra demo / barra con «No disponible» | TEC-17 | Corregido (la barra se oculta con 404) |
| DEF-08 | Mapa WMO con código 56, 66, 77, 85 | Condición documentada / «Condición no disponible» | TEC-06 | Corregido con prueba |

## 6. Pendiente (no se declara PASS)

- **Interfaz en móvil (TEC-09):** sin ejecución registrada en esta fecha. Queda pendiente de la
  revisión de Diego (SCRUM-46).
- **Timeout de 8 s del clima:** sin prueba automática; verificación manual pendiente.
- **Cobertura por CA de cada HU del Sprint 2:** los inventarios de arriba muestran los casos que
  existen. Una matriz CA por CA de las HU del Sprint 2 requiere el listado oficial de CA del sprint y
  queda pendiente de revisión con el responsable (Mirko).
