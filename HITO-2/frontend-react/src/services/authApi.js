// HU-16 (Sprint 3 · Daniel): inicio de sesión real y portal de apoderados contra la API.
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

export async function listarCuentasPrueba() {
  const respuesta = await pedir('/auth/cuentas-prueba')
  const lista = Array.isArray(respuesta) ? respuesta : respuesta?.cuentas ?? []
  return lista.map((c) => ({
    usuarioId: c.usuario_id ?? c.id,
    email: c.email,
    rol: c.rol,
    nombre: c.nombre,
  }))
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
    asistencia: dto.asistencia,
    atrasos: dto.atrasos,
    inscripciones: (dto.inscripciones ?? []).map((i) => ({
      actividadId: i.actividad_id,
      titulo: i.titulo,
      fecha: i.fecha,
      estado: i.estado,
    })),
  }
}