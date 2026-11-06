const API_URL = import.meta.env?.VITE_API_URL || 'http://localhost:8000/api/v1';

export const CATEGORIAS_DOCUMENTO = ['Todos', 'Reglamentos', 'Protocolos', 'Formularios'];

export async function obtenerDocumentos({ soloVigentes = true, categoria = 'Todos' } = {}) {
  const params = new URLSearchParams();
  params.set('solo_vigentes', String(Boolean(soloVigentes)));
  if (categoria && categoria !== 'Todos') {
    params.set('categoria', categoria);
  }
  const res = await fetch(`${API_URL}/documentos?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Error al obtener documentos institucionales (${res.status})`);
  }
  return res.json();
}

export async function crearDocumento(payload, rol = 'direccion') {
  const res = await fetch(`${API_URL}/documentos`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Rol': rol,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Error al crear documento (${res.status})`);
  }
  return res.json();
}

export async function actualizarDocumento(id, payload, rol = 'direccion') {
  const res = await fetch(`${API_URL}/documentos/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'X-Rol': rol,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Error al actualizar documento (${res.status})`);
  }
  return res.json();
}

export function filtrarDocumentosPorCategoria(documentos, categoria = 'Todos', soloVigentes = true) {
  if (!Array.isArray(documentos)) return [];
  return documentos.filter((doc) => {
    if (!doc) return false;
    if (soloVigentes && doc.vigente === false) return false;
    if (categoria !== 'Todos' && doc.categoria !== categoria) return false;
    return true;
  });
}
