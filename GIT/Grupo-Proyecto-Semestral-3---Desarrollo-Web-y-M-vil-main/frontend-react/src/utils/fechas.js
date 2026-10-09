// HU-04: utilidades puras de fechas de calendario (sin React).
//
// Todas las fechas se manejan como días calendario "AAAA-MM-DD", nunca como
// instantes. Así se evitan dos errores clásicos:
//  1. new Date('2026-10-09') se interpreta en UTC y en Chile se muestra como
//     el día anterior (8 de octubre a las 21:00/20:00).
//  2. Restar fechas locales en milisegundos falla los días de cambio de hora,
//     porque esos días duran 23 o 25 horas.

export const ZONA_HORARIA = 'America/Santiago'
export const DIAS_PROXIMA = 7

const FORMATO_FECHA = /^(\d{4})-(\d{2})-(\d{2})$/
const MS_POR_DIA = 24 * 60 * 60 * 1000

// Separa "AAAA-MM-DD" en números y valida que el día exista (rechaza 2026-02-30).
export function parseFechaISO(valor) {
  if (typeof valor !== 'string') return null

  const partes = valor.trim().match(FORMATO_FECHA)
  if (!partes) return null

  const anio = Number(partes[1])
  const mes = Number(partes[2])
  const dia = Number(partes[3])

  // Date.UTC no tiene cambios de hora, por eso sirve para validar y contar días.
  const fecha = new Date(Date.UTC(anio, mes - 1, dia))
  const esValida =
    fecha.getUTCFullYear() === anio &&
    fecha.getUTCMonth() === mes - 1 &&
    fecha.getUTCDate() === dia

  return esValida ? { anio, mes, dia } : null
}

// Número de día absoluto: permite restar fechas sin depender de horas ni zonas.
function numeroDeDia({ anio, mes, dia }) {
  return Date.UTC(anio, mes - 1, dia) / MS_POR_DIA
}

// Devuelve la fecha de hoy ("AAAA-MM-DD") según la zona horaria indicada,
// sin importar la zona horaria del computador que abre la página.
export function obtenerHoy(ahora = new Date(), zonaHoraria = ZONA_HORARIA) {
  // El locale en-CA entrega el formato AAAA-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: zonaHoraria,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(ahora)
}

// Días calendario desde `hoy` hasta `fecha`: 0 = hoy, 1 = mañana, -1 = ayer.
// Devuelve null si alguna de las fechas está vacía o es inválida.
export function diasHasta(fecha, hoy) {
  const destino = parseFechaISO(fecha)
  const base = parseFechaISO(hoy)
  if (!destino || !base) return null

  return numeroDeDia(destino) - numeroDeDia(base)
}

// "AAAA-MM-DD" → "viernes, 9 de octubre de 2026". Devuelve null si es inválida.
export function formatearFecha(valor) {
  const partes = parseFechaISO(valor)
  if (!partes) return null

  // Se formatea el mediodía UTC con timeZone UTC: el día nunca se desplaza.
  const fecha = new Date(Date.UTC(partes.anio, partes.mes - 1, partes.dia, 12))
  return new Intl.DateTimeFormat('es-CL', {
    timeZone: 'UTC',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(fecha)
}

// Una actividad es «Próxima» si ocurre entre hoy (0) y hoy + 7 días, ambos incluidos.
export function esProxima(dias) {
  return Number.isInteger(dias) && dias >= 0 && dias <= DIAS_PROXIMA
}

function horaParaOrden(actividad) {
  const hora = actividad?.hora
  return typeof hora === 'string' && /^\d{2}:\d{2}$/.test(hora) ? hora : '99:99'
}

// Deja solo las actividades desde hoy en adelante y las ordena de la más cercana
// a la más lejana. Las actividades sin fecha válida se descartan. No muta la entrada.
export function actividadesVigentes(actividades, hoy) {
  if (!Array.isArray(actividades)) return []

  return actividades
    .map((actividad) => ({ actividad, dias: diasHasta(actividad?.fecha, hoy) }))
    .filter(({ dias }) => dias !== null && dias >= 0)
    // Mismo día: primero la de hora más temprana; las sin hora van al final del día.
    .sort((a, b) => a.dias - b.dias || horaParaOrden(a.actividad).localeCompare(horaParaOrden(b.actividad)))
    .map(({ actividad, dias }) => ({ ...actividad, diasRestantes: dias }))
}
