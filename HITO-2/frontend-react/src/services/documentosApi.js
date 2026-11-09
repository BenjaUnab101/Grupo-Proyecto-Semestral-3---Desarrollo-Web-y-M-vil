// HU-27 · Documentos y protocolos del jardín.
// Cierre H-01/H-03 (Sprint 3): ya no se envía X-Rol; pedir() envía el token de la sesión y el
// servidor exige el rol de dirección para crear o editar.
import { pedir } from './http.js';

export const CATEGORIAS_DOCUMENTO = ['Todos', 'Reglamentos', 'Protocolos', 'Formularios'];

export async function obtenerDocumentos({ soloVigentes = true, categoria = 'Todos' } = {}) {
  return pedir('/documentos', {
    parametros: {
      solo_vigentes: String(Boolean(soloVigentes)),
      categoria: categoria && categoria !== 'Todos' ? categoria : '',
    },
  });
}

export async function crearDocumento(payload, usuarioId) {
  return pedir('/documentos', { metodo: 'POST', cuerpo: payload, usuarioId });
}

export async function actualizarDocumento(id, payload, usuarioId) {
  return pedir(`/documentos/${id}`, { metodo: 'PATCH', cuerpo: payload, usuarioId });
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
