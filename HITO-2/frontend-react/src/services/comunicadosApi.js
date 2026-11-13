// TEC-17 / HU-21: comunicados desde la API (PostgreSQL).
import { pedir } from './http.js'
import { obtenerHoy } from '../utils/fechas.js'

// Respuesta de la API -> lo que usan ComunicadosBoard y ComunicadoCard (HU-02/HU-03).
export function aComunicado(dto) {
  return {
    id: dto.id,
    titulo: dto.titulo,
    cuerpo: dto.cuerpo,
    fecha: obtenerHoy(new Date(dto.fecha_publicacion)), // el día de publicación en Chile, "AAAA-MM-DD"
    emisor: 'Dirección Pequeños Reyes',
    alcance: dto.alcance,
    nivel: dto.nivel,
    categoria: dto.categoria,
    esUrgente: dto.es_urgente,
  }
}

// Comunicados vigentes (lo que ve cualquier visitante).
export async function listarComunicados() {
  return (await pedir('/comunicados')).map(aComunicado)
}

// Solo los del apoderado: General + el nivel de sus hijos.
export async function listarComunicadosDeApoderado(apoderadoId) {
  const datos = await pedir(`/apoderados/${apoderadoId}/comunicados`)
  return datos.comunicados.map(aComunicado)
}

// Formulario -> cuerpo de POST /comunicados.
export function aComunicadoIn(formulario) {
  return {
    titulo: formulario.titulo,
    cuerpo: formulario.cuerpo,
    nivel: formulario.nivel,
    categoria: formulario.categoria || 'Aviso',
    alcance: formulario.alcance || null,
    es_urgente: formulario.esUrgente,
    vigente_hasta: formulario.vigenteHasta || null,
  }
}

export async function publicarComunicado(formulario) {
  return aComunicado(await pedir('/comunicados', { metodo: 'POST', cuerpo: aComunicadoIn(formulario) }))
}

export async function eliminarComunicado(id) {
  await pedir(`/comunicados/${id}`, { metodo: 'DELETE' })
}