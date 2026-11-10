// HU-24 / HU-22 (Sprint 3 · Daniel): panel de participación (SQL) e historial/bitácora (MongoDB).
import { pedir } from './http.js'

export const ESTADO_PARTICIPACION = { sin_inscritos: 'Sin inscritos', con_cupos: 'Con cupos', completa: 'Completa' }

export const TIPOS_EVENTO = {
  acceso_login: 'Inicio de sesión',
  acceso_logout: 'Cierre de sesión',
  acceso_denegado: 'Acceso denegado',
  inscripcion_creada: 'Inscripción',
  inscripcion_cancelada: 'Inscripción cancelada',
  contacto_creado: 'Consulta enviada',
  contacto_estado_cambiado: 'Consulta: cambio de estado',
}

export function aPanel(dto) {
  return {
    totales: {
      actividades: dto.totales.actividades,
      sinInscritos: dto.totales.sin_inscritos,
      completas: dto.totales.completas,
      cupoTotal: dto.totales.cupo_total,
      inscritos: dto.totales.inscritos,
      cancelados: dto.totales.cancelados,
      ocupacionPct: dto.totales.ocupacion_pct,
    },
    actividades: dto.actividades.map((a) => ({
      id: a.id,
      codigo: a.codigo,
      titulo: a.titulo,
      fecha: a.fecha,
      cupoMaximo: a.cupo_maximo,
      inscritos: a.inscritos,
      cancelados: a.cancelados,
      cuposDisponibles: a.cupos_disponibles,
      ocupacionPct: a.ocupacion_pct,
      estado: a.estado_participacion,
    })),
  }
}

export function aPaginaEventos(dto) {
  return {
    total: dto.total,
    pagina: dto.pagina,
    tamano: dto.tamano,
    paginas: Math.max(1, Math.ceil(dto.total / dto.tamano)),
    items: dto.items.map((e) => ({ ...e, actorId: e.actor_id })),
  }
}

export async function obtenerPanel({ actividadId, desde, hasta } = {}) {
  return aPanel(await pedir('/panel/participacion', { parametros: { actividad_id: actividadId, desde, hasta } }))
}

export async function obtenerHistorial({ actividadId, desde, hasta, pagina = 1 } = {}) {
  const parametros = { actividad_id: actividadId, desde, hasta, pagina, tamano: 10 }
  return aPaginaEventos(await pedir('/panel/participacion/historial', { parametros }))
}

export async function obtenerBitacora({ tipo, resultado, desde, hasta, pagina = 1 } = {}) {
  const parametros = { tipo, resultado, desde, hasta, pagina, tamano: 15 }
  return aPaginaEventos(await pedir('/auditoria/eventos', { parametros }))
}
