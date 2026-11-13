// HU-17/18/20/23 · Organizadores, categorías, actividades escolares y pagos simulados.
// Cierre H-01/H-03 (Sprint 3): ya no se envía X-Rol. Todas las llamadas pasan por pedir()
// (services/http.js), que envía el token Bearer de la sesión iniciada; el servidor decide los
// permisos según el rol de esa sesión.
import { pedir } from './http.js';

export async function obtenerOrganizadores(soloActivos = false) {
  return pedir('/organizadores', { parametros: { solo_activos: soloActivos ? 'true' : '' } });
}

export async function crearOrganizador(payload, usuarioId) {
  return pedir('/organizadores', { metodo: 'POST', cuerpo: payload, usuarioId });
}

export async function actualizarOrganizador(id, payload, usuarioId) {
  return pedir(`/organizadores/${id}`, { metodo: 'PATCH', cuerpo: payload, usuarioId });
}

export async function obtenerCategoriasActividad(soloActivas = false) {
  return pedir('/categorias-actividad', { parametros: { solo_activas: soloActivas ? 'true' : '' } });
}

export async function crearCategoriaActividad(payload, usuarioId) {
  return pedir('/categorias-actividad', { metodo: 'POST', cuerpo: payload, usuarioId });
}

export async function actualizarCategoriaActividad(id, payload, usuarioId) {
  return pedir(`/categorias-actividad/${id}`, { metodo: 'PATCH', cuerpo: payload, usuarioId });
}

export async function obtenerActividades(soloPublicadas = true, categoriaId = null) {
  return pedir('/actividades', {
    parametros: { solo_publicadas: String(Boolean(soloPublicadas)), categoria_id: categoriaId ? String(categoriaId) : '' },
  });
}

export async function obtenerEventosHU19() {
  const eventos = await pedir('/eventos');
  return eventos.map((evento) => ({
    ...evento,
    estado: evento.inscripciones_abiertas ? 'publicada' : 'cancelada',
    capacidad: evento.cupo_maximo,
    categoria_id: null,
    costo: evento.costo ?? 0,
    fuente: 'hu19',
  }));
}

// Personal del jardín: lista completa de alumnos (H-02: requiere sesión de dirección o personal).
export async function obtenerAlumnos(usuarioId) {
  return pedir('/alumnos', { usuarioId });
}

// HU-19: el apoderado se toma de la sesión en el servidor (H-02). Solo el personal indica
// `apoderadoId` para inscribir en nombre de una familia.
export async function inscribirEnEvento(actividadId, alumnoId, apoderadoId = null, usuarioId) {
  const cuerpo = { alumno_id: Number(alumnoId) };
  if (apoderadoId) cuerpo.apoderado_id = Number(apoderadoId);
  return pedir(`/eventos/${actividadId}/inscripciones`, { metodo: 'POST', cuerpo, usuarioId });
}

export async function crearActividad(payload, usuarioId) {
  return pedir('/actividades', { metodo: 'POST', cuerpo: payload, usuarioId });
}

export async function actualizarActividad(id, payload, usuarioId) {
  return pedir(`/actividades/${id}`, { metodo: 'PATCH', cuerpo: payload, usuarioId });
}

export async function publicarActividad(id, usuarioId) {
  return pedir(`/actividades/${id}/publicar`, { metodo: 'POST', usuarioId });
}

export async function cancelarActividad(id, usuarioId) {
  return pedir(`/actividades/${id}/cancelar`, { metodo: 'POST', usuarioId });
}

// HU-20 y HU-23: pagos simulados, inscripciones y comprobantes verificables (requieren sesión).
export async function registrarPagoInscripcion(payload, usuarioId) {
  return pedir('/pagos', { metodo: 'POST', cuerpo: payload, usuarioId });
}

// Comprobantes emitidos por la cuenta de la sesión activa ("Mis comprobantes").
export async function obtenerMisPagos(usuarioId) {
  return pedir('/pagos/mios', { usuarioId });
}

// Solo personal del jardín (contiene RUT y nombre del párvulo).
export async function obtenerPagosInscripciones({ actividadId = null, apoderadoRut = '' } = {}, usuarioId) {
  return pedir('/pagos', {
    parametros: { actividad_id: actividadId ? String(actividadId) : '', apoderado_rut: apoderadoRut?.trim() ?? '' },
    usuarioId,
  });
}

export async function consultarComprobantePago(codigo, usuarioId) {
  const limpio = String(codigo || '').trim();
  if (!limpio) {
    throw new Error('Ingresa un código de comprobante válido.');
  }
  return pedir(`/pagos/comprobante/${encodeURIComponent(limpio)}`, { usuarioId });
}

// Solo dirección.
export async function actualizarEstadoPago(pagoId, estadoPago, usuarioId) {
  return pedir(`/pagos/${pagoId}/estado`, { metodo: 'PATCH', cuerpo: { estado_pago: estadoPago }, usuarioId });
}

// HU-23 CA2: Función pura para filtrar actividades por categoría, cupos y estado
export function filtrarActividadesPortal(
  actividades,
  { categoriaId = 'todas', filtroCupos = 'todos', estado = 'todas' } = {}
) {
  if (!Array.isArray(actividades)) return [];
  return actividades.filter((act) => {
    if (!act) return false;
    if (categoriaId !== 'todas' && String(act.categoria_id) !== String(categoriaId)) {
      return false;
    }
    if (estado !== 'todas' && act.estado !== estado) {
      return false;
    }
    const disponibles = Number(act.cupos_disponibles ?? act.capacidad ?? 0);
    if (filtroCupos === 'disponibles' && disponibles <= 0) {
      return false;
    }
    if (filtroCupos === 'agotados' && disponibles > 0) {
      return false;
    }
    return true;
  });
}