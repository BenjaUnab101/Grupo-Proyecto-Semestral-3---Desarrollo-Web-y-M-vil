# La página React usa los datos de la API (TEC-17)

> **Revisor cruzado:** Daniel Cortez · **Restricción:** solo datos ficticios, nada de datos reales de menores.

## En pocas palabras

Las secciones de la página que muestran información que cambia con el uso dejaron de leer arreglos escritos a mano en el frontend (`salas.json`, `actividades.json`, `comunicados.json`). Ahora **le piden los datos a la API** (PostgreSQL):

| Sección | De dónde salen los datos |
|---|---|
| Cupos por sala | La API cuenta las matrículas de cada sala |
| Comunicados | La API (HU-21); el apoderado ve solo los que le corresponden |
| Calendario | La API: los eventos con cupos de HU-19 (`/eventos`) y las actividades escolares publicadas de HU-18 (`/actividades`), juntos en la misma agenda |
| Inscripciones | El apoderado inscribe y cancela a sus hijos en los eventos desde la página |
| Publicar comunicados | Dirección y personal publican y eliminan desde la página |

La página además **avisa con claridad cuando algo falla** (sin internet, servidor apagado, datos mal escritos, sin permiso o sin cupos). Nunca se queda en blanco.

## Cómo se usa

Todavía no hay inicio de sesión con contraseña. Para la demo, bajo el menú hay una barra **«Ver el portal como:»** con las cuentas ficticias que entrega la API:

- **Visitante (sin cuenta):** ve cupos, comunicados vigentes y el calendario.
- **Apoderado:** ve solo los comunicados de los niveles de sus hijos y, bajo el calendario, puede **inscribir o cancelar** a cada hijo.
- **Personal del jardín / Dirección:** ve un formulario para **publicar** comunicados y un botón **Eliminar** en cada uno.

La cuenta elegida **no da permisos por sí sola**: el backend revisa cada acción. Por ejemplo, si la educadora intenta eliminar un comunicado de Dirección, la API lo rechaza y la página muestra el motivo. Al recargar la página se vuelve a modo visitante.

## Qué ve el usuario en cada situación (CA3)

| Situación | Lo que muestra la página |
|---|---|
| Esperando respuesta | «Cargando comunicados…» (o cupos, actividades) con un indicador |
| No hay datos | Un mensaje, por ejemplo «Por ahora no hay comunicados publicados» |
| Sin internet o servidor apagado | «No hay conexión con el servidor. Revisa tu internet e intenta de nuevo.» + botón **Reintentar** |
| Servidor con problemas (5xx) | «El servicio no está disponible en este momento.» + **Reintentar** |
| Datos mal escritos (400) | El error **junto al campo**, en español (ej.: «Debe tener al menos 3 caracteres.») |
| Cuenta no reconocida (401) | Aviso, y la página vuelve a modo visitante |
| Sin permiso (403) | El motivo que da la API |
| Sin cupos o ya inscrito (409) | El motivo que da la API (ej.: «No quedan cupos disponibles para esta actividad») y los cupos se actualizan solos |

Si falla un envío, **lo escrito en el formulario no se pierde**.

## Qué agrega el backend para la página

| Endpoint | Para qué |
|---|---|
| `GET /api/v1/sesion/cuentas-demo` | Las cuentas ficticias de la barra «Ver el portal como». |
| `GET /api/v1/sesion/yo` | Rol, nombre e hijos de la cuenta elegida (401 sin cuenta o con una que no existe). |
| `GET /api/v1/salas/cupos` | Capacidad, matriculados y cupos de cada sala, contados en SQL. |
| `GET /api/v1/apoderados/{id}/inscripciones` | Las inscripciones de los hijos de un apoderado. |

Además, el CORS del backend permite el encabezado `X-Usuario-Id`, que la página envía con la cuenta elegida, y la semilla `S003` crea las 8 salas con matrículas ficticias para que la sección de cupos tenga datos.

## Cómo probarlo

1. **Backend** (`HITO-3/backend`): `docker compose up -d --build` y `docker compose exec postgres sh /sql/migrar.sh`.
2. **Frontend** (`HITO-2/frontend-react`): `npm install` y `npm run dev`. Abrir **http://localhost:5173**, con `localhost` y no `127.0.0.1`, porque es el origen que permite el backend.
3. **Recorrido:**
   - Como **visitante**: 8 salas con sus cupos, los comunicados vigentes y el calendario.
   - Con **Dirección**: publicar un comunicado → aparece de inmediato. Con un título de 2 letras → error junto al campo.
   - Con **Apoderada Demo Uno**: inscribir a un hijo → los cupos bajan; cancelar → vuelven a subir.
   - `docker compose stop api` y recargar → «sin conexión» con **Reintentar**; `docker compose start api` y pulsar **Reintentar**.
4. **Pruebas automáticas:**
   - Frontend: `node --test "src/**/*.test(IA).js"` → **114 de 114** (incluye las de HU-17, HU-18, HU-20, HU-23 y HU-27).
   - Backend: `docker compose exec api python -m scripts.prueba_tec17` → 10 comprobaciones de solo lectura (sesión demo, cupos, inscripciones y CORS).

## Evidencia

En `HITO-2/frontend-react/docs/evidencia/TEC-17/` está el resultado de la prueba de la interfaz (**28 de 28**) y las capturas:

| Captura | Qué muestra |
|---|---|
| `01-visitante.png`, `02-comunicados-visitante.png` | La página como visitante, con datos de la API |
| `03-publicar-400.png` | Error 400 junto al campo «Título» |
| `04-publicado.png` | El comunicado recién publicado, arriba de la lista |
| `05-inscripciones-409.png` | Inscripción correcta y rechazo por falta de cupos (409) |
| `06-error-cupos.png` | Servidor apagado: mensaje y botón Reintentar |
| `07-movil-barra.png`, `08-movil-inscripciones.png` | Vista en celular (375 px), sin desplazamiento horizontal |

> La prueba de la interfaz se hizo con una **API simulada** que responde igual que la real (mismas rutas, datos y errores), porque en el equipo donde se preparó no se pudo levantar Docker. Conviene repetir el recorrido del punto 3 con el backend real antes de la revisión, y correr `npm run lint`.

## Lo que no viene de la API

- **Portal familias** (botón del menú): usa su inicio de sesión de demostración y las fichas de `alumnos.json`, porque el backend no tiene endpoints de fichas ni de inicio de sesión.
- **Contenido informativo** (información del jardín, galería, documentos, etapas de matrícula y niveles del formulario): son textos fijos de la institución.
- **Formularios de contacto y de pre-matrícula:** no forman parte de esta tarea (son de HU-12 y HU-11).
- **Clima:** viene de Open-Meteo, un servicio externo.

## Decisiones para validar con el equipo

1. **Sesión de demostración con cuentas ficticias**, para probar los permisos sin login. Cuando exista inicio de sesión, solo cambia cómo se obtiene el usuario.
2. **Las reglas las valida el backend:** el formulario para publicar no repite las reglas (largo del título, permisos); muestra lo que responde la API, para que existan en un solo lugar.
3. **El calendario vive en `pages/CalendarioSeccion.jsx`:** ahí se juntan la agenda, las inscripciones de HU-19 y los componentes de HU-17, HU-18 y HU-23 (`FlujoInscripcionEventos`, `GestionActividades`, `GestionOrganizadores`). Por eso tres pruebas de esas historias (`hu17_eventos`, `hu18_actividades` y `hu23_flujo_eventos`) leen ese archivo en vez de `App.jsx`; lo que comprueban no cambia.
4. **Si la lista de HU-18 falla, el calendario sigue funcionando** con los eventos de HU-19. Si fallan los eventos, la agenda muestra el error con «Reintentar».

## Qué falta para cerrar la tarea

- [ ] Recorrer la página con el backend real (punto 3) y correr `prueba_tec17`.
- [ ] Correr `npm run lint`.
- [ ] PR revisado por Daniel Cortez.

<details>
<summary><strong>Detalles técnicos</strong> (archivos de esta carpeta)</summary>

### Estructura del frontend (CA4)

```
src/
├── services/          ← el único lugar que habla con la API (CA1)
│   ├── http.js            pedir(): URL base, JSON, X-Usuario-Id y ErrorApi
│   ├── comunicadosApi.js  comunicados vigentes, del apoderado, publicar, eliminar
│   ├── actividadesApi.js  eventos (/eventos), inscripciones, inscribir, cancelar
│   ├── salasApi.js        cupos por sala
│   ├── sesionApi.js       cuentas demo y perfil
│   └── comunicados.js     utilidades de HU-02/HU-03 (orden y filtro por nivel)
├── hooks/useRecurso.js    carga datos: { datos, error, cargando, recargar }
├── context/               la cuenta demo elegida (SesionProvider + useSesion)
├── pages/                 secciones que piden datos: PaginaPrincipal, CuposSeccion,
│                          ComunicadosSeccion, CalendarioSeccion
├── components/            solo muestran lo que reciben (BarraSesionDemo, EstadoCarga,
│                          FormPublicarComunicado, InscripcionesActividades…)
└── datos-prueba/          comunicados.json y actividades.json, SOLO para las pruebas
                           unitarias de HU-03 y HU-04 (la app no los importa)
```

- **`services/http.js`:** `pedir(ruta, { metodo, cuerpo, parametros, usuarioId })` devuelve el JSON o lanza un `ErrorApi` con `estado` (código HTTP; 0 = sin conexión) y un mensaje en español según el código. En 403, 404 y 409 usa el motivo que envía la API. `erroresPorCampo()` convierte los errores de un 400 en `{ campo: mensaje }`.
- **Conversión de datos (CA2):** cada servicio pasa el JSON de la API (snake_case) al formato que ya usaban los componentes de HU-02, HU-03, HU-04 y HU-09. Por ejemplo, la hora `"18:30:00"` → `"18:30"` y la fecha de publicación → el día en Chile.
- **`useRecurso(cargar)`:** pide los datos al montar o cuando cambia `cargar` (por ejemplo, al cambiar de cuenta), ignora respuestas que llegan tarde y deja `recargar()` para el botón «Reintentar» o después de publicar.
- **`EstadoCarga`** (`components/EstadosApi.jsx`): muestra el error con «Reintentar», «Cargando…», el mensaje de lista vacía o el contenido.

### Archivos

| Parte | Archivos |
|---|---|
| Backend | `app/main.py` (CORS con `X-Usuario-Id` y router `sesion`), `app/api/sesion.py`, `app/{api,schemas,services}/catalogo.py` (cupos por sala), `app/{api,schemas,services}/inscripciones.py` (inscripciones del apoderado), `sql/seed/S003__salas_cupos_demo.sql` (8 salas con 101 alumnos y matrículas ficticios), `scripts/utilidades.py`, `scripts/prueba_tec17.py`. |
| Frontend: servicios y estado | `services/http.js`, `comunicadosApi.js`, `actividadesApi.js`, `salasApi.js`, `sesionApi.js`, `comunicados.js` (sin llamadas a la red), `hooks/useRecurso.js`, `context/SesionProvider.jsx`, `context/sesionContexto.js`. |
| Frontend: pantallas | `App.jsx`, `main.jsx` (importa `Api.css`), `pages/PaginaPrincipal.jsx`, `CuposSeccion.jsx`, `ComunicadosSeccion.jsx`, `CalendarioSeccion.jsx`, `components/BarraSesionDemo.jsx`, `EstadosApi.jsx`, `FormPublicarComunicado.jsx`, `InscripcionesActividades.jsx`, `CuposSalas.jsx` (las tarjetas llegan como `children`), `ComunicadosBoard.jsx` y `ComunicadoCard.jsx` (botón Eliminar opcional), `styles/Api.css`. |
| Frontend: pruebas | `services/http.test(IA).js` (13 pruebas: URL y encabezados, 400, 401, 403, 409, 5xx, sin conexión, conversión de datos, y revisiones de estructura: solo `services/` usa `fetch`, la app no importa los JSON operacionales y las secciones viven en `pages/`), `comunicados.test(IA).js`, `filtroNivel.test(IA).js` y `utils/fechas.test(IA).js` (leen sus datos de `datos-prueba/`), y `hu17_eventos`, `hu18_actividades` y `hu23_flujo_eventos` (ahora leen `pages/CalendarioSeccion.jsx`). |
| Evidencia | `docs/evidencia/TEC-17/` (capturas, resultado y el script de la prueba de interfaz). |

**Archivos que se eliminan del frontend:** `src/data/salas.json`, `src/data/actividades.json` y `src/data/comunicados.json` (los dos últimos quedan en `src/datos-prueba/` solo para las pruebas).

</details>
