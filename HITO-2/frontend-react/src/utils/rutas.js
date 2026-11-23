// Navegación por apartados: cada sección del portal es una "página" con su propia dirección
// (#/calendario, #/matricula, ...). Se usa el hash (#) porque funciona igual en el navegador,
// en `npm run preview` y dentro de la app Android (Capacitor), sin configurar el servidor ni
// instalar un router. Aquí solo hay datos y funciones puras (se prueban con node --test).

export const RUTA_INICIO = 'inicio'

// Orden = orden del menú. `soloPersonal`: solo aparece con sesión del personal del jardín.
export const RUTAS = [
  { id: 'inicio', titulo: 'Inicio', icono: '🏠', descripcion: 'Portada del portal.' },
  { id: 'nosotros', titulo: 'Nosotros', icono: '🏫', descripcion: 'Historia, misión, niveles y datos de contacto.' },
  { id: 'galeria', titulo: 'Galería', icono: '🖼️', descripcion: 'Fotos de talleres y vida escolar.' },
  { id: 'cupos', titulo: 'Cupos', icono: '🪑', descripcion: 'Disponibilidad por sala para postular.' },
  { id: 'comunicados', titulo: 'Comunicados', icono: '📢', descripcion: 'Avisos oficiales para las familias.' },
  { id: 'calendario', titulo: 'Calendario', icono: '📅', descripcion: 'Actividades, eventos e inscripciones.' },
  { id: 'documentos', titulo: 'Documentos', icono: '📄', descripcion: 'Reglamentos y protocolos.' },
  { id: 'matricula', titulo: 'Matrícula', icono: '📝', descripcion: 'Etapas, pre-matrícula y seguimiento.' },
  { id: 'contacto', titulo: 'Contacto', icono: '✉️', descripcion: 'Escribe a la dirección y revisa tu consulta.' },
  { id: 'panel', titulo: 'Panel', icono: '📊', descripcion: 'Participación y auditoría.', soloPersonal: true },
]

const IDS = new Set(RUTAS.map((r) => r.id))

// Direcciones antiguas (cuando todo estaba en una sola página con anclas) siguen funcionando.
const ALIAS = {
  informacion: 'nosotros',
  'info-institucional': 'nosotros',
  'cupos-salas': 'cupos',
  'panel-direccion': 'panel',
  'mis-consultas': 'contacto',
}

/** "#/calendario" -> "calendario". Vacío o desconocido -> "inicio". También acepta "#matricula". */
export function rutaDesdeHash(hash) {
  const id = String(hash ?? '')
    .replace(/^#\/?/, '')
    .split(/[/?]/)[0]
    .trim()
    .toLowerCase()
  const real = ALIAS[id] ?? id
  return IDS.has(real) ? real : RUTA_INICIO
}

/** "calendario" -> "#/calendario". */
export function hrefDeRuta(id) {
  return id === RUTA_INICIO ? '#/' : `#/${id}`
}

export function datosDeRuta(id) {
  return RUTAS.find((r) => r.id === id) ?? RUTAS[0]
}

/** Enlaces del menú según quién navega: el Panel solo para el personal (no apoderados). */
export function rutasDelMenu(esPersonal = false) {
  return RUTAS.filter((r) => r.id !== RUTA_INICIO && (!r.soloPersonal || esPersonal))
}

/** Título de la pestaña del navegador. */
export function tituloDocumento(id) {
  const ruta = datosDeRuta(id)
  return ruta.id === RUTA_INICIO ? 'Pequeños Reyes · Escuela de Lenguaje' : `${ruta.titulo} · Pequeños Reyes`
}
