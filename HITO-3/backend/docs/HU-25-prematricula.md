# Pre-matrícula con seguimiento (HU-25)

> **ID estable:** PR-S3/HU-25 · **Referencia Sprint 2:** SCRUM-60 (HU-11) · **Dependencias:** SCRUM-94, SCRUM-95
> **Revisor cruzado:** Benjamín · **SP:** 5 provisionales (la aceptación requiere validación del equipo)
> **Restricción:** solo datos ficticios, nada de datos reales de niños o niñas.

## En pocas palabras

El formulario de pre-matrícula del Taller 2 (HU-11) validaba los datos, pero no los guardaba: al recargar la página, todo se perdía. Con esta historia:

1. La familia **envía la pre-matrícula** y la solicitud **queda guardada en la base de datos del jardín** (PostgreSQL).
2. Recibe un **código de seguimiento**, por ejemplo `PM-7K3Q9X`.
3. Con ese código y su correo **consulta el estado** cuando quiera: después de recargar, otro día o desde otro dispositivo.
4. **Dirección** ve las solicitudes y **cambia su estado** (Recibida, En revisión, Lista de espera, Aceptada o Rechazada), con un mensaje opcional para la familia.

Se reutiliza el formulario de HU-11 con sus mismas reglas y mensajes. Lo nuevo es que envía los datos a la API, y que tiene una casilla de consentimiento.

## Cómo se usa

**La familia**

1. En **Proceso de Matrícula** llena el formulario. Los datos se revisan mientras escribe (RUT, correo, teléfono y nivel) y **debe marcar la casilla de consentimiento**.
2. Presiona **Enviar pre-matrícula**. Si todo está bien, aparece en verde: *«Solicitud recibida. Tu código de seguimiento es PM-XXXXXX»*.
3. En **Consultar mi solicitud** escribe el código y su correo, y ve el estado y el mensaje del jardín.

El código queda recordado en ese navegador, así que después de recargar ya aparece escrito. El **correo hay que escribirlo cada vez**: es lo que impide que otra persona vea la solicitud.

**Dirección**

Con la cuenta **Dirección** en la barra «Ver el portal como:» (TEC-17), aparece bajo el formulario el panel **Solicitudes de pre-matrícula**. Ahí se puede filtrar por estado, ver los datos de cada solicitud y cambiar su estado con un mensaje para la familia. El personal del jardín y los apoderados **no** ven el panel, y la API también se lo impide (403).

## Qué ve el usuario en cada situación (CA4)

| Situación | Lo que muestra la página |
|---|---|
| Falta un dato o tiene mal formato | El error **junto al campo**; el cursor salta al primero y no se envía nada |
| No marcó el consentimiento | «Debes aceptar el uso de estos datos para gestionar la solicitud.» |
| La API rechaza un dato (400) | El mensaje junto al campo que corresponde |
| Ya hay una solicitud en curso para el mismo párvulo y nivel (409) | «Ya existe una solicitud en curso para este párvulo y nivel…». **Lo escrito no se borra** |
| Sin internet o servidor apagado | «La solicitud no se envió. No hay conexión con el servidor…». Lo escrito no se borra |
| Envío correcto | Mensaje verde con el **código de seguimiento** |
| Código o correo equivocados al consultar (404) | «No encontramos una solicitud con ese código y correo. Revisa ambos datos.» |
| Dirección filtra un estado sin solicitudes | «No hay solicitudes en estado «Aceptada».» |

## Privacidad

- **Consentimiento obligatorio**, con la fecha en que se dio.
- **La consulta del estado pide código + correo.** Si alguno no coincide, el mensaje es siempre el mismo, para que nadie pueda averiguar qué códigos existen. La respuesta **no trae** nombres, teléfono ni RUT: solo el estado y el mensaje.
- **En el navegador se guarda solo el código**, nunca nombres, RUT ni correo.
- **Solo dirección** ve los datos de contacto de las solicitudes.
- **Datos de la demo:** todos ficticios (`@ejemplo.cl`, «Familia Demo», «Párvulo Demo»).

## Endpoints

| Método y ruta | Quién | Respuesta |
|---|---|---|
| `POST /api/v1/prematriculas` | Familia | 201 `{id, codigo, estado, creada_en}` · 400 · 409 |
| `POST /api/v1/prematriculas/seguimiento` con `{codigo, correo}` | Familia | 200 `{codigo, estado, nivel, mensaje_familia, creada_en, actualizada_en}` · 404 |
| `GET /api/v1/prematriculas?estado=` | Dirección | 200 lista de solicitudes · 401 · 403 |
| `PATCH /api/v1/prematriculas/{id}/estado` con `{estado, mensaje_familia}` | Dirección | 200 · 400 · 404 |

El seguimiento usa `POST` para que el correo no quede escrito en la URL.

## Cómo probarlo

1. **Base de datos** (`HITO-3/backend`): `docker compose up -d --build` y `docker compose exec postgres sh /sql/migrar.sh`.
2. **Frontend:** `npm run dev` en `HITO-2/frontend-react` y abrir http://localhost:5173 → **Proceso de Matrícula**.
3. **Solicitudes demo** para probar el seguimiento sin llenar el formulario:

   | Código | Correo | Estado |
   |---|---|---|
   | `PM-DEMAA2` | `familia.demo1@ejemplo.cl` | En revisión (con mensaje) |
   | `PM-DEMBB3` | `familia.demo2@ejemplo.cl` | Recibida |
   | `PM-DEMCC4` | `familia.demo3@ejemplo.cl` | Lista de espera |

4. **CP-HU-25-01 · Caso exitoso y lectura tras reinicio:**
   ```bash
   docker compose exec api python -m scripts.prueba_hu25 crear
   docker compose restart api postgres
   docker compose exec api python -m scripts.prueba_hu25 verificar
   ```
   `crear` envía una solicitud, revisa que quedó en PostgreSQL y dirección la pasa a «En revisión». Después del reinicio, `verificar` la consulta como familia, comprueba el estado y el mensaje, dirección la acepta y se borran los datos de prueba.
5. **CP-HU-25-02 · Casos negativos (13):**
   ```bash
   docker compose exec api python -m scripts.prueba_hu25 negativos
   ```
   Cubre: 400 por cada dato inválido (incluido el consentimiento), 404, 401, 403 y 409.
6. **Pruebas del frontend:** `node --test "src/**/*.test(IA).js"` → **123 de 123**.

## Evidencia

Carpeta `HITO-3/backend/docs/evidencia/HU-25/`:

| Archivo | Qué muestra | Resultado |
|---|---|---|
| `pruebas-postgresql.txt` | Migraciones y datos demo en un PostgreSQL 16 real, 6 pruebas de las reglas de la tabla y una solicitud que **sigue ahí después de reiniciar PostgreSQL** | ✅ |
| `validacion_esquemas.txt` | La API acepta y rechaza lo mismo que el formulario | ✅ 10/10 |
| `interfaz/resultado-e2e.txt` + capturas | Recorrido completo de la página (familia y dirección) | ✅ 27/27 |

| Captura | Caso |
|---|---|
| `01-validacion-react.png` | CA1: obligatorios y consentimiento, sin enviar |
| `02-confirmacion-codigo.png` | CP-01: confirmación con el código |
| `03-seguimiento-tras-recarga.png` | CP-01: después de recargar, la solicitud se consulta desde la API |
| `04-seguimiento-404.png` | CP-02: código con otro correo |
| `05-duplicada-409.png` | CP-02: solicitud repetida; lo escrito se conserva |
| `06-api-400-campo.png` | CP-02: un 400 de la API aparece junto al campo RUT |
| `07-panel-direccion.png` | CA3: panel de dirección después de cambiar un estado |
| `08-familia-ve-cambio.png` | La familia ve el estado nuevo y el mensaje de dirección |
| `09-movil-panel.png` | Vista en celular (375 px) sin desplazamiento horizontal |

> **Falta ejecutar la API real.** En el equipo donde se programó no se pudieron instalar FastAPI ni SQLAlchemy. La base de datos y las reglas de validación se probaron de verdad; el recorrido de la página se hizo con una **API simulada** que responde igual que la real. En la captura `06` el 400 lo forzó la simulación, porque el formulario no deja enviar un RUT inválido. **El equipo debe ejecutar los pasos 4 y 5** y guardar las salidas en esta carpeta, junto con el PR o commit.

## Decisiones para validar con el equipo (y con Benjamín)

1. **El formulario de HU-11 envía los datos a la API.** Se ajustaron 3 pruebas de HU-11 que exigían «no enviar nada». El formulario de contacto (HU-12) sigue siendo una demostración.
2. **El consentimiento es el 7.º campo obligatorio** (CA1).
3. **Solo dirección revisa las solicitudes**, porque traen datos de contacto de las familias.
4. **Seguimiento con código + correo, sin cuenta**, porque las familias que postulan todavía no tienen usuario.
5. **Una solicitud en curso por párvulo y nivel.** Si la anterior ya fue aceptada o rechazada, se puede postular de nuevo.
6. **Dirección puede poner cualquier estado**, sin un orden obligatorio entre ellos.

## Qué falta para cerrar la historia

- [ ] Ejecutar en Docker `prueba_hu25 crear` → reinicio → `verificar`, y `prueba_hu25 negativos`, y guardar las salidas.
- [ ] Capturas de Swagger (http://localhost:8000/docs): POST 201 con el código y POST 400.
- [ ] PR o commit revisado por Benjamín.

<details>
<summary><strong>Detalles técnicos</strong> (archivos de esta carpeta)</summary>

### Backend

| Archivo | Qué contiene |
|---|---|
| `sql/migraciones/V005__solicitudes_prematricula.sql` | Tabla `solicitudes_prematricula`: RUT sin puntos y con guion (`12345678-5`), correo en minúsculas, teléfono de 9 dígitos, `nivel` y `estado` con CHECK, y un índice único **parcial** que impide dos solicitudes en curso para el mismo `(rut, nombre_parvulo, nivel)`. |
| `sql/seed/S004__prematriculas_demo.sql` | 3 solicitudes ficticias. |
| `app/db/models.py` | Modelo `SolicitudPrematricula`. |
| `app/schemas/prematricula.py` | Las mismas reglas que `frontend-react/src/utils/validaciones.js`, con los mismos mensajes: quita espacios sobrantes (`str_strip_whitespace`) y usa 4 validadores cortos (RUT con módulo 11, teléfono, correo en minúsculas y consentimiento). |
| `app/services/prematricula.py` | `crear_solicitud` (revisa repetidas → 409 y genera el código con `secrets`), `consultar_seguimiento` (404 si el código no existe o el correo no coincide), `listar_solicitudes` y `cambiar_estado`. |
| `app/api/prematricula.py` | Las 4 rutas. |
| `app/core/permisos.py` | `direccion_requerida`: 401 sin cuenta, 403 si no es dirección. |
| `app/main.py` | Registra el router. |
| `scripts/utilidades.py`, `scripts/prueba_hu25.py` | Pruebas `crear`, `verificar` y `negativos`. |
| `docs/evidencia/HU-25/` | Pruebas en PostgreSQL, validación de las reglas y prueba de la interfaz con capturas. |

### Frontend

| Archivo | Qué contiene |
|---|---|
| `services/prematriculaApi.js` | Conversión camelCase ↔ snake_case, las 4 llamadas y `erroresDelFormulario` (errores 400 de la API → campos del formulario). |
| `hooks/useFormularioDemo.js` | Opción `enviar(valores)`: sin ella el formulario es una demostración (contacto); con ella entrega `enviando`, `errorEnvio` y `resultado`, y los errores 400 se muestran en los campos. También maneja casillas. |
| `components/FormPreMatricula.jsx` | Envía a la API y muestra el código de seguimiento. |
| `components/FormField.jsx`, `components/FormularioDemo.jsx` | Casilla de consentimiento; botón desactivado mientras se envía; aviso cuando el envío falla. |
| `components/SeguimientoPrematricula.jsx` | Consulta con código + correo. |
| `components/PanelSolicitudes.jsx` | Panel de dirección: filtro, datos de cada solicitud y cambio de estado. |
| `pages/MatriculaSeccion.jsx`, `pages/PaginaPrincipal.jsx` | La sección de matrícula completa. |
| `services/sesionApi.js`, `context/SesionProvider.jsx` | Indican si la cuenta elegida es de dirección. |
| `utils/codigoSeguimiento.js` | Guarda solo el código en el navegador (`localStorage`, con `try/catch`). |
| `utils/preMatricula.js` | Campo `consentimiento`. |
| `utils/fechas.js` | `formatearFechaHora`, en hora de Chile. |
| `styles/Formulario.css`, `styles/Api.css` | Estilos de la casilla, del seguimiento y del panel. |
| `services/prematricula.test(IA).js`, `utils/preMatricula.test(IA).js` | Pruebas del servicio (9, incluida la que revisa que solo dirección ve el panel) y del formulario. |

</details>
