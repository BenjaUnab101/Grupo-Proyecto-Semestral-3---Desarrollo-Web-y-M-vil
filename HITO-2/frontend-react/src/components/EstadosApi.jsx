import { mensajeDeError } from '../services/http.js'

// TEC-17: muestra el estado de una carga de la API (ver hooks/useRecurso.js).
//   - error         -> mensaje y botón "Reintentar"
//   - aún sin datos -> "Cargando…"
//   - lista vacía   -> textoVacio (si se entrega)
//   - con datos     -> children
export default function EstadoCarga({ recurso, textoCargando = 'Cargando…', textoError, textoVacio, children }) {
  if (recurso.error) {
    return (
      <div className="estado-api estado-api--error alert alert-danger" role="alert">
        <p className="mb-1 fw-semibold">{textoError ?? 'No pudimos cargar esta información.'}</p>
        <p className="mb-2">{mensajeDeError(recurso.error)}</p>
        <button type="button" className="btn btn-outline-danger btn-sm" onClick={recurso.recargar}>Reintentar</button>
      </div>
    )
  }
  if (recurso.datos === undefined) {
    return (
      <p className="estado-api estado-api--cargando d-flex align-items-center gap-2 text-muted" role="status">
        <span className="spinner-border spinner-border-sm" aria-hidden="true" /> {textoCargando}
      </p>
    )
  }
  if (textoVacio && recurso.datos.length === 0) {
    return <p className="estado-api estado-api--vacio" role="status">{textoVacio}</p>
  }
  return children
}
