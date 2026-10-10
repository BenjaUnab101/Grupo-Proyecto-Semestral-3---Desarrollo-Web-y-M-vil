const FORMATO_FECHA = /^(\d{4})-(\d{2})-(\d{2})$/

// HU-03: valor del filtro que muestra la colección completa.
export const FILTRO_TODOS = 'Todos'

// HU-03: niveles válidos del campo `nivel` de cada comunicado.
export const NIVELES = ['General', 'Salas TEL', 'Preescolar']

// HU-03: opciones que ve el apoderado, en el orden en que se muestran.
export const OPCIONES_FILTRO_NIVEL = [FILTRO_TODOS, ...NIVELES]

// HU-03 — Regla pendiente de validar con la encuesta original (Q4, Q5).
// Mientras no se contraste, el filtro es estricto: elegir "Salas TEL" o
// "Preescolar" NO incluye los comunicados "General"; estos se ven en "Todos"
// y en "General". Si la encuesta indica lo contrario, basta con cambiar este
// valor a `true` (las pruebas cubren ambos casos). Ver docs/HU-03-filtro-nivel.md.
export const INCLUIR_GENERALES_EN_NIVELES = false

// Convierte una fecha con formato AAAA-MM-DD en un objeto Date válido.
export function parseFecha(valor) {
  if (typeof valor !== 'string') return null

  const partes = valor.trim().match(FORMATO_FECHA)
  if (!partes) return null

  const anio = Number(partes[1])
  const mes = Number(partes[2])
  const dia = Number(partes[3])
  const fecha = new Date(anio, mes - 1, dia)

  // Date ajusta automáticamente fechas imposibles, por eso se comparan sus partes.
  const esUnaFechaValida =
    fecha.getFullYear() === anio &&
    fecha.getMonth() === mes - 1 &&
    fecha.getDate() === dia

  if (!esUnaFechaValida) return null
  return fecha
}

// Devuelve la fecha en un formato largo y legible para la interfaz.
export function formatearFecha(valor) {
  const fecha = parseFecha(valor)
  if (!fecha) return null

  return new Intl.DateTimeFormat('es-CL', { dateStyle: 'long' }).format(fecha)
}

// Ordena los comunicados del más reciente al más antiguo.
export function ordenarComunicados(comunicados) {
  if (!Array.isArray(comunicados)) return []

  const comunicadosOrdenados = [...comunicados]

  // Los comunicados sin una fecha válida quedan después de los que sí tienen fecha.
  comunicadosOrdenados.sort((primerComunicado, segundoComunicado) => {
    const fechaPrimerComunicado = parseFecha(primerComunicado?.fecha)
    const fechaSegundoComunicado = parseFecha(segundoComunicado?.fecha)

    if (fechaPrimerComunicado && fechaSegundoComunicado) {
      return fechaSegundoComunicado - fechaPrimerComunicado
    }

    if (fechaPrimerComunicado) return -1
    if (fechaSegundoComunicado) return 1

    return 0
  })

  return comunicadosOrdenados
}

// HU-03: devuelve solo los comunicados del nivel elegido, sin mutar la entrada.
// "Todos" (o un filtro desconocido) restaura la colección completa.
export function filtrarPorNivel(
  comunicados,
  filtro,
  { incluirGenerales = INCLUIR_GENERALES_EN_NIVELES } = {},
) {
  if (!Array.isArray(comunicados)) return []
  if (filtro === FILTRO_TODOS || !NIVELES.includes(filtro)) return [...comunicados]

  return comunicados.filter((comunicado) => {
    if (comunicado?.nivel === filtro) return true
    return incluirGenerales && filtro !== 'General' && comunicado?.nivel === 'General'
  })
}
