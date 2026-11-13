# Pequeños Reyes - Fronted React

Aplicacion web desarrollada con React y Vite para Pequeños Reyes, orientado a centralizar informacion relevante del establecimiento y facilitar el acceso de los apoderados a contenidos y funcionalidades del jardin.

## Integrantes del Proyecto
- Daniel Cortez Fierro
- Diego Rubilar Gomez
- Mirko Massa Maldonado
- Benjamin Concha Navarro 

## Problematica
El jardin necesita digitalizar y centralizar la informaciin que actualmente se entrega de manera fisica o mediante medios de comunicacion poco estructurados, permitiendo que los apoderados puedan acceder facilmente a ella desde Internet.

Actualmente, la comunicación entre el establecimiento y los apoderados se realiza principalmente mediante WhatsApp, comunicaciones escritas y avisos verbales, siendo las educadoras de cada nivel y la dirección las responsables de entregar y coordinar la información. Sin embargo, este sistema presenta dificultades, ya que los mensajes y documentos pueden perderse entre las conversaciones y algunos apoderados pueden no revisar la información oportunamente.

## Usuarios Objetivos
- Apoderados: Usuarios principales de la plataforma, quienes podran consultar informacion del establecimiento y acceder a funcionalidades destinadas a facilitar la organizacion y preparacion de las actividades de sus hijos.
- Personal del establecimiento: Responsables de entregar y gestionar la informacion publicada en la plataforma.

## Funcionalidades Principales
- Visualizacion de informacion del establecimiento.
- Componentes reutilizavles para las diferentes secciones de la aplicacion.
- Visualizacion de comunicados e informacion relevante.
- Pronositico meteorologico para los proximos 7 dias.
- Visualizacion de temperatura maxima y minima.
- Visualizacion de probabilidad de lluvia.
- Visualizacion del indice UV.
- Recomdaciones informaticas relacionadas con lluvia, radiacion Uv y bajas temperaturas para los niños.
- Manejo de estados de carga y errores al consultar informacion meteorologica. 
- Opcion para reintentar la consulta cuando ocurre un error. 
- Diseño responsive para distintos tamaños de pantalla. 

## Tecnologias Utilizadas
- React
- Vite
- JavaScript
- JSX
- HTML
- CSS
- Bootstrap
- Fetch API
- Open-Meteo API
- Github
- ESLint

## Instrucciones para ejecutar el proyecto
La forma recomendada es levantar todo con Docker Compose desde `HITO-3/backend` (ver el README de la raíz).
Para trabajar solo en el frontend con la API ya levantada:
1. `cp .env.example .env` (deja `VITE_API_URL=http://localhost:8000/api/v1`).
2. `npm install` y luego `npm run dev`.
3. Pruebas: `npm test` · Lint: `npm run lint` · Build: `npm run build`.

## Estructura general de la aplicación
- `src/main.jsx`: punto de entrada. `src/App.jsx`: monta la sesión y la página.
- `src/pages/`: secciones de la página que piden datos a la API (calendario, comunicados, matrícula, contacto, panel).
- `src/components/`: componentes de interfaz (dibujan lo que reciben).
- `src/context/`: `SesionProvider.jsx`, sesión compartida (perfil, login/logout y el modal del portal).
- `src/hooks/`: `useSesionApoderado.js` (sesión del portal), `useRecurso.js` (estados de carga), `useClima.js`, `useFormularioDemo.js`.
- `src/services/`: acceso HTTP a la API propia (`http.js`, `auth.js`, `eventosApi.js`, …) y a Open-Meteo (`climaService.js`).
- `src/utils/`: funciones puras (RUT, fechas, validaciones…).
- `src/data/`: catálogos estáticos justificados (textos institucionales, galería, niveles). Los datos operacionales vienen de la API.
- `src/datos-prueba/`: fixtures usados solo por las pruebas.
- `src/styles/`: hojas de estilo.

### Flujo de autenticación (según el diagrama de arquitectura)
`PortalApoderados.jsx` → `hooks/useSesionApoderado.js` → `context/SesionProvider.jsx` → `services/auth.js` → `POST /auth/login`.
El token se guarda solo en memoria y viaja en `Authorization: Bearer`. Los permisos los decide la API.