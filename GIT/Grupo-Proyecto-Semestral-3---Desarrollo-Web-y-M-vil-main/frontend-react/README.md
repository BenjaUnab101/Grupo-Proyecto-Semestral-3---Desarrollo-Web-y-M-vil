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

## Instruccciones para Ejecutar el Proyecto
1.- Instalar dependencias: Desde la carpeta "frontend-react" ejecutar el comando "npm install".
2.- Iniciar el servidor de desarrollo: Usando el comando "npm run dev" iniciamos el servidor para visualizar la interfaz mediante el link entregado. 

## Estrucutra General de la Aplicacion
- components/: componentes de interfaz reutilizavles o especificados de una seccion.
- data/: fixtures y datos estaticos utilizados por la aplicacion
- services/: funnciones encargadas del acceso y adaptacion de datos externos
- hooks/: hooks de React que encapsulan estados y comportamientos compartidos
- utils/: funciones auxiliares independientes de React
- styles/: hojas de estilo CSS
- App.jsx/: composicion principal de los componentes de la aplicacion
- main.jsx/: punto de entrada de la aplicacion React

## API Publica Utilizada
La aplicacion utilizada fue Open-Meteo, una API publica para obtener informacion meteorologica.

Documentacion de la API: https://open-meteo.com/en/docs

Endpoint Utilizado: https://api.open-meteo.com/v1/forecast

Parametros establecidos:
- latitude
- longitude
- daily
- timezone
- forecast_days

Datos diarios solicitados por la API:
- weather_code
- temperature_2m_max y min
- precipitation_probability_max
- uv_index_max

La ubicacion utilizada por esta API fue Viña del Mar, una decision por defecto debido a la ubicacion del jardin Pequeños Reyes y con un pronostico de 7 dias. 

## Justificacion Funcional de la API
Esta API permite incorporar informacion meteologica actualizada directamente en la pagina/aplicacion, siendo funcionalmente relevante para los apoderados.

El pronostico permite conocer las condiciones de los proximos dias y asi entregar recomendaciones para preparar a los alumnos para actividades al aire libre.

Esta informacion se muestra mediante componentes reutilizables y se manejan estados de carga, error y reintento para evitar que unn problema con la API impida utilizar el resto del portal. 

## Uso de Inteligencia Artificial 
La IA fue usada como herramienta de apoyo en la implementacion de componentes React, creacion de servicio con la API Open-Meteo, organizacion de archivos y componentes, por ultimo en el apoyo de correcion de errores o mejoras en el codigo de los archivos dentro del proyecto.

Algunas de las IAs utilizadas fueron: 
- ChatGPT
- Cloud

## Limitacion Conocidas
- El pronostico depende de la disponibilidad de la API
- La informacion meteorologica puede cambiar y no representar una garantia de las condiciones reales
- Las recomendaciones entregadas son unicamente informativas y no son modificables
- La aplicacion se encuentra centrada principalmente en un frontend
- Algunas funcionalidades del portal pueden encontrarse pendientes de implementacion o de una mejoria 