// HU-26 (Sprint 3 · Daniel): consultas de contacto con la dirección (PostgreSQL).
import { erroresPorCampo, pedir } from './http.js'

export const ESTADOS_CONTACTO = { nuevo: 'Nuevo', en_gestion: 'En gestión', cerrado: 'Cerrado' }

// Formulario del Taller 2 (HU-12) -> cuerpo de POST /contacto. Los nombres coinciden.
export function aConsultaIn(valores) {
  const { nombre, correo, telefono, asunto, mensaje } = valores
  return { nombre, correo, telefono, asunto, mensaje }
}

export function aConsulta(dto) {
  return {
    id: dto.id,
    codigo: dto.codigo,
    asunto: dto.asunto,
    estado: dto.estado,
    respuesta: dto.respuesta_direccion,
    creadaEn: dto.creada_en,
    actualizadaEn: dto.actualizada_en,
    // Solo para dirección:
    nombre: dto.nombre,
    correo: dto.correo,
    telefono: dto.telefono,
    mensaje: dto.mensaje,
  }
}

// Un 400 de la API -> { campo: mensaje } con los nombres del formulario.
export const erroresDelContacto = erroresPorCampo

export async function enviarConsulta(valores) {
  return aConsulta(await pedir('/contacto', { metodo: 'POST', cuerpo: aConsultaIn(valores) }))
}

// POST: el correo va en el cuerpo, no en la URL.
export async function consultarSeguimientoContacto(codigo, correo) {
  return aConsulta(await pedir('/contacto/seguimiento', { metodo: 'POST', cuerpo: { codigo, correo } }))
}

export async function listarMisConsultas() {
  return (await pedir('/contacto/mias')).map(aConsulta)
}

export async function listarConsultas(estado) {
  return (await pedir('/contacto', { parametros: { estado } })).map(aConsulta)
}

export async function cambiarEstadoConsulta(id, estado, respuesta) {
  const cuerpo = { estado, respuesta_direccion: respuesta ?? null }
  return aConsulta(await pedir(`/contacto/${id}/estado`, { metodo: 'PATCH', cuerpo }))
}
