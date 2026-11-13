// HU-17/18/20/23 · Organizadores, categorías, actividades escolares y pagos simulados.
// Todas las llamadas pasan por pedir() (services/http.js), que envía el token Bearer de la
// sesión iniciada; el servidor decide los permisos según el rol de esa sesión.
import { pedir } from './http.js';

export async function obtenerOrganizadores(soloActivos = false) {
  return pedir('/organizadores', { parametros: { solo_activos: soloActivos ? 'true' : '' } });
}

export async function crearOrganizador(payload) {
  return pedir('/organizadores', { metodo: 'POST', cuerpo: payload });
}

export async function actualizarOrganizador(id, payload) {
  return pedir(`/organizadores/${id}`, { metodo: 'PATCH', cuerpo: payload });
}

export async function obtenerCategoriasActividad(soloActivas = false) {
  return pedir('/categorias-actividad', { parametros: { solo_activas: soloActivas ? 'true' : '' } });
}

export async function crearCategoriaActividad(payload) {
  return pedir('/categorias-actividad', { metodo: 'POST', cuerpo: payload });
}

export async function actualizarCategoriaActividad(id, payload) {
  return pedir(`/categorias-actividad/${id}`, { metodo: 'PATCH', cuerpo: payload });
}

export async function obtenerActividades(soloPublicadas = true, categoriaId = null) {
  return pedir('/actividades', {
    parametros: { solo_publicadas: String(Boolean(soloPublicadas)), categoria_id: categoriaId ? String(categoriaId) : '' },
  });
}

// Personal del jardín: lista completa de alumnos (H-02: requiere sesión de dirección o personal).
export async function obtenerAlumnos() {
  return pedir('/alumnos');
}

// HU-19: el apoderado se toma de la sesión en el servidor (H-02). Solo el personal indica
// `apoderadoId` para inscribir en nombre de una familia.
export async function inscribirEnEvento(actividadId, alumnoId, apoderadoId = null) {
  const cuerpo = { alumno_id: Number(alumnoId) };
  if (apoderadoId) cuerpo.apoderado_id = Number(apoderadoId);
  return pedir(`/eventos/${actividadId}/inscripciones`, { metodo: 'POST', cuerpo });
}

export async function crearActividad(payload) {
  return pedir('/actividades', { metodo: 'POST', cuerpo: payload });
}

export async function actualizarActividad(id, payload) {
  return pedir(`/actividades/${id}`, { metodo: 'PATCH', cuerpo: payload });
}

export async function publicarActividad(id) {
  return pedir(`/actividades/${id}/publicar`, { metodo: 'POST' });
}

export async function cancelarActividad(id) {
  return pedir(`/actividades/${id}/cancelar`, { metodo: 'POST' });
}

// HU-20 y HU-23: pagos simulados, inscripciones y comprobantes verificables (requieren sesión).
export async function registrarPagoInscripcion(payload) {
  return pedir('/pagos', { metodo: 'POST', cuerpo: payload });
}

// Comprobantes emitidos por la cuenta de la sesión (apoderado o personal).
export async function obtenerMisPagos() {
  return pedir('/pagos/mios');
}

// Solo personal del jardín (contiene RUT y nombre del párvulo).
export async function obtenerPagosInscripciones({ actividadId = null, apoderadoRut = '' } = {}) {
  return pedir('/pagos', {
    parametros: { actividad_id: actividadId ? String(actividadId) : '', apoderado_rut: apoderadoRut?.trim() ?? '' },
  });
}

export async function consultarComprobantePago(codigo) {
  const limpio = String(codigo || '').trim();
  if (!limpio) {
    throw new Error('Ingresa un código de comprobante válido.');
  }
  return pedir(`/pagos/comprobante/${encodeURIComponent(limpio)}`);
}

// Solo dirección.
export async function actualizarEstadoPago(pagoId, estadoPago) {
  return pedir(`/pagos/${pagoId}/estado`, { metodo: 'PATCH', cuerpo: { estado_pago: estadoPago } });
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