// HU-16 (Sprint 3 · Daniel): inicio de sesión real y portal de apoderados contra la API.
// Reemplaza la autenticación simulada del Taller 2 (services/auth.js + data/apoderados.json).
import { pedir } from './http.js'
import { aPerfil } from './sesionApi.js'

export async function iniciarSesion(email, password) {
  const datos = await pedir('/auth/login', { metodo: 'POST', cuerpo: { email, password } })
  return { token: datos.token, expiraEn: datos.expira_en, perfil: aPerfil(datos.perfil) }
}

// El token ya va en Authorization (http.js). Cierra la sesión EN EL SERVIDOR.
export async function cerrarSesion() {
  await pedir('/auth/logout', { metodo: 'POST' })
}

export function aAlumnoPortal(dto) {
  return { id: dto.id, codigo: dto.codigo, nombre: dto.nombre, parentesco: dto.parentesco, sala: dto.sala, nivel: dto.nivel }
}

export async function listarMisAlumnos() {
  return (await pedir('/portal/alumnos')).map(aAlumnoPortal)
}

export async function obtenerFicha(alumnoId) {
  const dto = await pedir(`/portal/alumnos/${alumnoId}`)
  return {
    ...aAlumnoPortal(dto),
    anioEscolar: dto.anio_escolar,
    estadoMatricula: dto.estado_matricula,
    inscripciones: dto.inscripciones.map((i) => ({ actividadId: i.actividad_id, titulo: i.titulo, fecha: i.fecha, estado: i.estado })),
  }
}
