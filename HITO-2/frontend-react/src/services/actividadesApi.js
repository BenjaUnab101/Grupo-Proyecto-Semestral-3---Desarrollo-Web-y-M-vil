// TEC-17 / HU-19: eventos (actividades con inscripción), cupos e inscripciones desde la API.
// Las rutas son /eventos: /actividades es de las actividades escolares de HU-18 (eventosApi.js).
import { pedir } from './http.js'

// Respuesta de la API -> lo que usa el calendario de HU-04 (Agenda / ActividadItem).
export function aActividad(dto) {
  return {
    id: dto.id,
    titulo: dto.titulo,
    fecha: dto.fecha, // "AAAA-MM-DD"
    hora: dto.hora?.slice(0, 5), // "18:30:00" -> "18:30"
    lugar: dto.lugar,
    preparar: dto.descripcion,
    cupoMaximo: dto.cupo_maximo,
    cuposDisponibles: dto.cupos_disponibles,
    inscripcionesAbiertas: dto.inscripciones_abiertas,
  }
}

export async function listarActividades() {
  return (await pedir('/eventos', { parametros: { proximas: true } })).map(aActividad)
}

// Inscripciones (vigentes y canceladas) de los hijos del apoderado.
export async function listarInscripciones(apoderadoId) {
  const lista = await pedir(`/apoderados/${apoderadoId}/inscripciones`)
  return lista.map((i) => ({ id: i.id, actividadId: i.actividad_id, alumnoId: i.alumno_id, estado: i.estado }))
}

// 409 si no quedan cupos o ya está inscrito; 403 si el alumno no es del apoderado.
export async function inscribir(actividadId, alumnoId, apoderadoId) {
  return pedir(`/eventos/${actividadId}/inscripciones`, {
    metodo: 'POST',
    cuerpo: { alumno_id: alumnoId, apoderado_id: apoderadoId },
  })
}

export async function cancelarInscripcion(inscripcionId, apoderadoId) {
  return pedir(`/inscripciones/${inscripcionId}/cancelar`, { metodo: 'POST', cuerpo: { apoderado_id: apoderadoId } })
}