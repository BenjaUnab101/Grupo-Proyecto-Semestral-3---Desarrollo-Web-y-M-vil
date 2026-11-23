// HITO 4 · Recordatorio en el teléfono: reglas puras (sin Capacitor) para poder probarlas con node --test.
import { parseFechaISO } from './fechas.js'

// Hora del aviso "el día anterior" y hora que se asume si la actividad no tiene hora.
export const HORA_AVISO_DIA_ANTERIOR = 18
export const HORA_ACTIVIDAD_POR_DEFECTO = '09:00'
const UNA_HORA_MS = 60 * 60 * 1000

// "18:30" -> { horas: 18, minutos: 30 }. Una hora vacía o mal escrita usa la hora por defecto.
function leerHora(hora) {
  const valor = typeof hora === 'string' && /^\d{2}:\d{2}/.test(hora) ? hora : HORA_ACTIVIDAD_POR_DEFECTO
  const [horas, minutos] = valor.slice(0, 5).split(':').map(Number)
  return horas <= 23 && minutos <= 59 ? { horas, minutos } : leerHora(HORA_ACTIVIDAD_POR_DEFECTO)
}

/**
 * Cuándo avisar en el teléfono. Usa la hora local del dispositivo (en Chile, la del celular).
 * 1) El día anterior a las 18:00, para alcanzar a preparar lo necesario.
 * 2) Si eso ya pasó, una hora antes del inicio.
 * 3) Si también pasó (o la fecha es inválida), null: no hay nada que programar.
 * @param {string} fecha "AAAA-MM-DD"
 * @param {string} [hora] "HH:MM"
 * @param {Date} [ahora]
 * @returns {Date|null}
 */
export function momentoRecordatorio(fecha, hora, ahora = new Date()) {
  const partes = parseFechaISO(fecha)
  if (!partes) return null
  const { horas, minutos } = leerHora(hora)

  const inicio = new Date(partes.anio, partes.mes - 1, partes.dia, horas, minutos)
  const diaAnterior = new Date(partes.anio, partes.mes - 1, partes.dia - 1, HORA_AVISO_DIA_ANTERIOR, 0)
  const unaHoraAntes = new Date(inicio.getTime() - UNA_HORA_MS)

  if (diaAnterior > ahora) return diaAnterior
  if (unaHoraAntes > ahora) return unaHoraAntes
  return null
}

// Android identifica cada notificación con un entero de 32 bits: se usa el id de la inscripción.
export function idRecordatorio(inscripcionId) {
  const id = Number(inscripcionId)
  return Number.isInteger(id) && id > 0 && id <= 2147483647 ? id : null
}

// Texto de la notificación.
export function textoRecordatorio({ titulo, hijo, hora, lugar }) {
  const detalles = [hora && `${hora} h`, lugar].filter(Boolean).join(' · ')
  return {
    titulo: `Recordatorio: ${titulo}`,
    cuerpo: `${hijo} está inscrito/a${detalles ? ` (${detalles})` : ''}. ¡No lo olvides!`,
  }
}

// "jueves 26 nov., 18:00" para el mensaje de confirmación.
export function describirMomento(momento) {
  return new Intl.DateTimeFormat('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(momento)
}
