// HU-25: solicitudes de pre-matrícula contra la API (PostgreSQL).
import { erroresPorCampo, pedir } from './http.js'

export const ESTADOS = {
  recibida: 'Recibida',
  en_revision: 'En revisión',
  lista_espera: 'Lista de espera',
  aceptada: 'Aceptada',
  rechazada: 'Rechazada',
}

// Formulario de React (camelCase) -> cuerpo de POST /prematriculas (snake_case).
export function aSolicitudIn(valores) {
  return {
    nombre_apoderado: valores.nombreApoderado,
    rut: valores.rut,
    correo: valores.correo,
    telefono: valores.telefono,
    nombre_parvulo: valores.nombreParvulo,
    nivel: valores.nivel,
    comentario: valores.comentario || null,
    consentimiento: valores.consentimiento,
  }
}

// Errores 400 de la API con los nombres de campo del formulario (nombre_parvulo -> nombreParvulo).
export function erroresDelFormulario(error) {
  const errores = erroresPorCampo(error)
  return Object.fromEntries(
    Object.entries(errores).map(([campo, mensaje]) => [campo.replace(/_(\w)/g, (_, letra) => letra.toUpperCase()), mensaje]),
  )
}

// Respuesta de la API -> objeto para la interfaz.
export function aSolicitud(dto) {
  return {
    id: dto.id,
    codigo: dto.codigo,
    estado: dto.estado,
    nivel: dto.nivel,
    mensajeFamilia: dto.mensaje_familia,
    creadaEn: dto.creada_en,
    actualizadaEn: dto.actualizada_en,
    // Solo para dirección:
    nombreApoderado: dto.nombre_apoderado,
    rut: dto.rut,
    correo: dto.correo,
    telefono: dto.telefono,
    nombreParvulo: dto.nombre_parvulo,
    comentario: dto.comentario,
  }
}

export async function enviarSolicitud(valores) {
  return aSolicitud(await pedir('/prematriculas', { metodo: 'POST', cuerpo: aSolicitudIn(valores) }))
}

// POST: el correo va en el cuerpo, no en la URL.
export async function consultarSeguimiento(codigo, correo) {
  return aSolicitud(await pedir('/prematriculas/seguimiento', { metodo: 'POST', cuerpo: { codigo, correo } }))
}

export async function listarSolicitudes(estado, usuarioId) {
  return (await pedir('/prematriculas', { parametros: { estado }, usuarioId })).map(aSolicitud)
}

export async function cambiarEstado(id, estado, mensajeFamilia, usuarioId) {
  const cuerpo = { estado, mensaje_familia: mensajeFamilia || null }
  return aSolicitud(await pedir(`/prematriculas/${id}/estado`, { metodo: 'PATCH', cuerpo, usuarioId }))
}
