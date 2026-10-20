// Tarjeta de un documento demo. No ofrece descarga real para no prometer un archivo que no existe.
export default function DocumentoItem({ documento }) {
  return (
    <div className="col-12 col-md-6 col-lg-4">
      <div className="p-3 border rounded h-100 d-flex flex-column">
        <span className="pill-badge mb-2 align-self-start">{documento.categoria}</span>
        <h6 className="fw-bold mb-1">{documento.titulo}</h6>
        <p className="text-muted small flex-grow-1">{documento.descripcion}</p>
        <button type="button" className="btn btn-outline-secondary btn-sm disabled" disabled>
          Descarga no disponible (demo)
        </button>
      </div>
    </div>
  )
}
