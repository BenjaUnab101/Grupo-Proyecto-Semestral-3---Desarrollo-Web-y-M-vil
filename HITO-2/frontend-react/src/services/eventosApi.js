const API_URL = import.meta.env?.VITE_API_URL || 'http://localhost:8000/api/v1';

export async function obtenerOrganizadores(soloActivos = false) {
  const query = soloActivos ? '?solo_activos=true' : '';
  const res = await fetch(`${API_URL}/organizadores${query}`);
  if (!res.ok) {
    throw new Error(`Error al obtener organizadores (${res.status})`);
  }
  return res.json();
}

export async function crearOrganizador(payload, rol = 'direccion') {
  const res = await fetch(`${API_URL}/organizadores`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Rol': rol,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Error al crear organizador (${res.status})`);
  }
  return res.json();
}

export async function actualizarOrganizador(id, payload, rol = 'direccion') {
  const res = await fetch(`${API_URL}/organizadores/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'X-Rol': rol,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Error al actualizar organizador (${res.status})`);
  }
  return res.json();
}

export async function obtenerCategoriasActividad(soloActivas = false) {
  const query = soloActivas ? '?solo_activas=true' : '';
  const res = await fetch(`${API_URL}/categorias-actividad${query}`);
  if (!res.ok) {
    throw new Error(`Error al obtener categorías de actividad (${res.status})`);
  }
  return res.json();
}

export async function crearCategoriaActividad(payload, rol = 'direccion') {
  const res = await fetch(`${API_URL}/categorias-actividad`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Rol': rol,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Error al crear categoría (${res.status})`);
  }
  return res.json();
}

export async function actualizarCategoriaActividad(id, payload, rol = 'direccion') {
  const res = await fetch(`${API_URL}/categorias-actividad/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'X-Rol': rol,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Error al actualizar categoría (${res.status})`);
  }
  return res.json();
}

export async function obtenerActividades(soloPublicadas = true, categoriaId = null) {
  const params = new URLSearchParams();
  params.set('solo_publicadas', String(Boolean(soloPublicadas)));
  if (categoriaId) {
    params.set('categoria_id', String(categoriaId));
  }
  const res = await fetch(`${API_URL}/actividades?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Error al obtener actividades (${res.status})`);
  }
  return res.json();
}

export async function obtenerEventosHU19() {
  const res = await fetch(`${API_URL}/eventos`);
  if (!res.ok) {
    throw new Error(`Error al obtener eventos de inscripción (${res.status})`);
  }
  const eventos = await res.json();
  return eventos.map((evento) => ({
    ...evento,
    estado: evento.inscripciones_abiertas ? 'publicada' : 'cancelada',
    capacidad: evento.cupo_maximo,
    categoria_id: null,
    costo: evento.costo ?? 0,
    fuente: 'hu19',
  }));
}

export async function obtenerAlumnos() {
  const res = await fetch(`${API_URL}/alumnos`);
  if (!res.ok) {
    throw new Error(`Error al obtener alumnos (${res.status})`);
  }
  return res.json();
}

export async function inscribirEnEvento(actividadId, alumnoId, apoderadoId) {
  const res = await fetch(`${API_URL}/eventos/${actividadId}/inscripciones`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ alumno_id: Number(alumnoId), apoderado_id: Number(apoderadoId) }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Error al inscribir al alumno (${res.status})`);
  }
  return res.json();
}

export async function crearActividad(payload, rol = 'organizador') {
  const res = await fetch(`${API_URL}/actividades`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Rol': rol,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Error al crear actividad (${res.status})`);
  }
  return res.json();
}

export async function actualizarActividad(id, payload, rol = 'organizador') {
  const res = await fetch(`${API_URL}/actividades/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'X-Rol': rol,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Error al actualizar actividad (${res.status})`);
  }
  return res.json();
}

export async function publicarActividad(id, rol = 'organizador') {
  const res = await fetch(`${API_URL}/actividades/${id}/publicar`, {
    method: 'POST',
    headers: {
      'X-Rol': rol,
    },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Error al publicar actividad (${res.status})`);
  }
  return res.json();
}

export async function cancelarActividad(id, rol = 'organizador') {
  const res = await fetch(`${API_URL}/actividades/${id}/cancelar`, {
    method: 'POST',
    headers: {
      'X-Rol': rol,
    },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Error al cancelar actividad (${res.status})`);
  }
  return res.json();
}

// HU-20 y HU-23: Pagos simulados, inscripciones y comprobantes verificables
export async function registrarPagoInscripcion(payload) {
  const res = await fetch(`${API_URL}/pagos`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Error al registrar inscripción (${res.status})`);
  }
  return res.json();
}

export async function obtenerPagosInscripciones({ actividadId = null, apoderadoRut = '' } = {}) {
  const params = new URLSearchParams();
  if (actividadId) params.set('actividad_id', String(actividadId));
  if (apoderadoRut && apoderadoRut.trim()) params.set('apoderado_rut', apoderadoRut.trim());
  const query = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`${API_URL}/pagos${query}`);
  if (!res.ok) {
    throw new Error(`Error al listar pagos simulados (${res.status})`);
  }
  return res.json();
}

export async function consultarComprobantePago(codigo) {
  const limpio = String(codigo || '').trim();
  if (!limpio) {
    throw new Error('Ingresa un código de comprobante válido.');
  }
  const res = await fetch(`${API_URL}/pagos/comprobante/${encodeURIComponent(limpio)}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Comprobante no encontrado (${res.status})`);
  }
  return res.json();
}

export async function actualizarEstadoPago(pagoId, estadoPago) {
  const res = await fetch(`${API_URL}/pagos/${pagoId}/estado`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ estado_pago: estadoPago }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `No se pudo actualizar el estado (${res.status})`);
  }
  return res.json();
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
