import { pedir } from './http.js'

export const ETIQUETA_ROL = {
  apoderado: 'Apoderado',
  organizador: 'Personal del jardín',
  administrador: 'Dirección',
}

export function aPerfil(dto) {
  if (!dto) return null
  return {
    usuarioId: dto.usuario_id,
    email: dto.email,
    rol: dto.rol,
    nombre: dto.nombre,
    apoderadoId: dto.apoderado_id,
    hijos: dto.hijos ?? [],
    esEditor: dto.rol === 'administrador' || dto.rol === 'organizador',
    esDireccion: dto.rol === 'administrador',
  }
}

export async function iniciarSesion(email, password) {
  const datos = await pedir('/auth/login', { metodo: 'POST', cuerpo: { email, password } })
  return { token: datos.token, expiraEn: datos.expira_en, perfil: aPerfil(datos.perfil) }
}

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
  return {
    id: dto.id,
    codigo: dto.codigo,
    nombre: dto.nombre,
    parentesco: dto.parentesco,
    sala: dto.sala,
    nivel: dto.nivel,
  }
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

export async function listarCuentasDemo() {
  const cuentas = await pedir('/sesion/cuentas-demo')
  return cuentas.map((c) => ({ usuarioId: c.usuario_id, email: c.email, rol: c.rol, nombre: c.nombre }))
}

export async function obtenerPerfil(usuarioId) {
  return aPerfil(await pedir('/sesion/yo', { usuarioId }))
}