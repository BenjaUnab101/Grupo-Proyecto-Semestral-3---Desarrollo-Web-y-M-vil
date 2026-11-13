# Preparación individual — Daniel Cortez (SCRUM-80)

> **Estado: READY FOR HUMAN PRACTICE.**
> Esta guía es material de estudio. El ensayo oral/humano de la defensa **no se ha realizado**; debe practicarse antes de la presentación.

## Conceptos clave React + Vite

- **Vite**: servidor de desarrollo con recarga instantánea (HMR) y bundler para producción (`npm run build`). Reemplaza configuraciones más pesadas (webpack) para proyectos nuevos.
- **Componente**: función de JavaScript que devuelve JSX. Ej.: `Navbar`, `FichaAlumno`.
- **Props**: datos que un componente padre pasa a un hijo (solo lectura para el hijo).
- **Estado (`useState`)**: datos que un componente puede cambiar y que, al cambiar, vuelven a renderizar el componente.
- **Hook personalizado**: función que empieza con `use` y encapsula lógica de estado reutilizable (ej. `useSesionApoderado`).
- **JSX**: sintaxis que mezcla HTML y JavaScript; se compila a llamadas `React.createElement`.
- **Composición**: construir pantallas combinando componentes pequeños en lugar de uno grande (ver `App.jsx`).
- **ESLint (flat config)**: en ESLint 9+/10 la configuración es un arreglo de objetos (`eslint.config.js`) en vez de `.eslintrc`.
- **`node --test`**: runner de pruebas nativo de Node, usado en este proyecto sin instalar un framework externo (Jest/Vitest).
- **Sesión en memoria**: guardar datos solo con `useState` (sin `localStorage`/`cookies`) implica que se pierden al recargar la página.

## 10 preguntas y respuestas

1. **¿Por qué el login del portal apoderados es "simulado"?**
   Porque no hay backend ni base de datos real: `services/auth.js` compara contra un fixture (`data/apoderados.json`) en memoria.

2. **¿Dónde vive el estado de la sesión y por qué no se usa `localStorage`?**
   En el hook `useSesionApoderado` (solo `useState`). Se eligió no persistir por requerimiento explícito de privacidad: ningún dato de la cuenta demo debe sobrevivir a un refresh.

3. **¿Qué pasa si el RUT o la contraseña son incorrectos?**
   `LoginForm` muestra un mensaje genérico ("Credenciales inválidas...") sin indicar cuál de los dos datos falló, para no filtrar información sobre qué identificadores existen.

4. **¿Cómo se valida un RUT chileno en `utils/rut.js`?**
   Se limpia el valor (sin puntos/guion), se calcula el dígito verificador con el algoritmo módulo 11 (multiplicadores 2-7 cíclicos desde la derecha) y se compara con el DV ingresado.

5. **¿Qué hace `SelectorHermanos` cuando el apoderado tiene un solo hijo?**
   No se renderiza (devuelve `null`): no tiene sentido "elegir" si solo hay una opción; `PortalApoderados` muestra la ficha de ese único alumno directamente.

6. **¿Qué ocurre si `atrasos` o `asistencia` llegan con un valor inválido (negativo, texto, fuera de rango)?**
   `utils/ficha.js` devuelve `"Dato no disponible"` en vez de mostrar un número incorrecto o romper la interfaz.

7. **¿Por qué el botón de "Descargar" en Documentos está deshabilitado?**
   Porque no existen archivos reales detrás: mostrar un botón funcional sería prometer una descarga falsa.

8. **¿Por qué el modal de transferencia de Proceso de Matrícula insiste en que los datos son demo?**
   Para evitar que alguien interprete datos bancarios ficticios como reales y transfiera dinero por error.

9. **¿Qué valida el script `npm run lint`?**
   Ejecuta ESLint sobre todo el proyecto (`eslint.config.js`), detectando errores de JS y malas prácticas de hooks de React (`eslint-plugin-react-hooks`).

10. **¿Por qué `App.jsx` no contiene la lógica del portal apoderados directamente?**
    Porque sigue el patrón de composición: `App.jsx` solo decide *qué* mostrar y cuándo (abrir/cerrar el modal), mientras que `PortalApoderados` y sus hijos contienen la lógica real. Esto facilita probar y reemplazar piezas sin tocar `App.jsx`.

## Explicación de una historia ajena (solo lectura, para la defensa grupal)

**Muro de comunicados** (implementada por otro integrante, componentes `ComunicadosBoard.jsx` / `ComunicadoCard.jsx` / `services/comunicados.js`):

- Los comunicados se cargan desde `data/comunicados.json`.
- `services/comunicados.js` expone `ordenarComunicados`, que ordena por fecha (más reciente primero) usando `parseFecha` para convertir `"AAAA-MM-DD"` a `Date` de forma segura (evita el desfase de zona horaria de `new Date(string)`).
- Los comunicados sin fecha válida quedan al final del listado, no rompen el orden.
- `ComunicadosBoard` recibe el arreglo ya ordenado y renderiza una `ComunicadoCard` por cada comunicado, usando `id` como `key`.

No se debe presentar esta historia como trabajo propio de Daniel; es contexto necesario para entender cómo se integra con las secciones de `App.jsx`.

## Pendiente antes de la defensa

- [ ] Ensayo oral en voz alta de las 10 preguntas (humano, no realizado todavía).
- [ ] Practicar demo en vivo: abrir portal, loguear con cada una de las 3 cuentas demo (0, 1 y 2+ alumnos), cerrar sesión, revisar Documentos y Proceso de Matrícula.
