// HITO 4 · Recordatorio en el teléfono (notificaciones locales de Android con Capacitor).
// Las reglas (cuándo avisar, texto) están en utils/recordatorios.js; aquí solo se habla con
// el plugin nativo. En el navegador no hay plugin: esAppAndroid() es false y la interfaz
// no muestra los botones de recordatorio.
import { describirMomento, idRecordatorio, momentoRecordatorio, textoRecordatorio } from '../utils/recordatorios.js'

// Capacitor inyecta window.Capacitor dentro de la app Android antes de cargar React.
export function esAppAndroid() {
  const capacitor = globalThis.Capacitor
  return Boolean(capacitor?.isNativePlatform?.() && capacitor.getPlatform?.() === 'android')
}

// El plugin se carga solo dentro de la app; así la versión web no depende de él al ejecutarse.
async function plugin() {
  const { LocalNotifications } = await import('@capacitor/local-notifications')
  return LocalNotifications
}

// Pide el permiso de notificaciones (Android 13+ muestra el diálogo del sistema una vez).
async function asegurarPermiso(notificaciones) {
  let { display } = await notificaciones.checkPermissions()
  if (display !== 'granted') ({ display } = await notificaciones.requestPermissions())
  if (display !== 'granted') {
    throw new Error('Activa las notificaciones de «Pequeños Reyes» en los ajustes del teléfono para recibir el recordatorio.')
  }
}

/**
 * Programa el aviso de una inscripción. Devuelve el texto de confirmación para la interfaz.
 * @param {{ inscripcionId: number, titulo: string, hijo: string, fecha: string, hora?: string, lugar?: string }} datos
 */
export async function programarRecordatorio({ inscripcionId, titulo, hijo, fecha, hora, lugar }) {
  const id = idRecordatorio(inscripcionId)
  const momento = momentoRecordatorio(fecha, hora)
  if (id === null) throw new Error('No se pudo identificar la inscripción para el recordatorio.')
  if (momento === null) throw new Error('La actividad ya comenzó o está por comenzar: no hay tiempo para un recordatorio.')

  const notificaciones = await plugin()
  await asegurarPermiso(notificaciones)
  const texto = textoRecordatorio({ titulo, hijo, hora, lugar })
  await notificaciones.schedule({
    notifications: [
      {
        id,
        title: texto.titulo,
        body: texto.cuerpo,
        schedule: { at: momento, allowWhileIdle: true },
        extra: { inscripcionId: id },
      },
    ],
  })
  return `Te avisaremos el ${describirMomento(momento)}.`
}

// Quita el aviso (al cancelar la inscripción o si el apoderado ya no lo quiere).
export async function cancelarRecordatorio(inscripcionId) {
  const id = idRecordatorio(inscripcionId)
  if (id === null || !esAppAndroid()) return
  const notificaciones = await plugin()
  await notificaciones.cancel({ notifications: [{ id }] })
}

// Ids de las inscripciones que ya tienen un aviso pendiente en este teléfono.
export async function idsConRecordatorio() {
  if (!esAppAndroid()) return new Set()
  const notificaciones = await plugin()
  const { notifications } = await notificaciones.getPending()
  return new Set(notifications.map((n) => Number(n.id)).filter((id) => id !== ID_AVISO_PRUEBA))
}

// Id fijo y muy alto para el aviso de prueba: nunca coincide con el id de una inscripción real.
const ID_AVISO_PRUEBA = 2147480000

// Para la demostración: una notificación en 5 segundos que comprueba permiso y canal.
export async function enviarAvisoDePrueba() {
  const notificaciones = await plugin()
  await asegurarPermiso(notificaciones)
  await notificaciones.schedule({
    notifications: [
      {
        id: ID_AVISO_PRUEBA,
        title: 'Pequeños Reyes',
        body: 'Así se verán los recordatorios de las actividades de tus hijos.',
        schedule: { at: new Date(Date.now() + 5000), allowWhileIdle: true },
      },
    ],
  })
}
