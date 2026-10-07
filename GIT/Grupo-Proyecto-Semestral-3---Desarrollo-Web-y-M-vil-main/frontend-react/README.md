# frontend-react

App React + Vite de Pequeños Reyes.

## Scripts

- `npm run dev` — servidor de desarrollo.
- `npm run build` — build de producción.
- `npm run preview` — previsualiza el build.
- `npm run lint` — ESLint sobre todo el proyecto.

## Arquitectura de carpetas (`src/`)

- `components/` — piezas de UI reutilizables o específicas de una sección. Sin lógica de negocio.
- `data/` — fixtures y datos estáticos (JSON o módulos JS) que alimentan componentes y servicios.
- `services/` — funciones puras de acceso/transformación de datos (ordenar, autenticar, formatear).
- `hooks/` — hooks de React que encapsulan estado y comportamiento compartido entre componentes.
- `utils/` — utilidades puras sin dependencia de React (validaciones, formateo, cálculos).
- `styles/` — hojas de estilo CSS.

`App.jsx` actúa como composición: importa componentes y los ordena, sin contener lógica de negocio propia. Las secciones cuya historia aún no se implementa se listan en `data/secciones.js` y se renderizan con `components/SeccionPendiente.jsx`.
