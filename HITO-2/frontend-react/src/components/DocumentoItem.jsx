export default function DocumentoItem({ documento, modoDireccion = false, onEditar, onAlternarVigencia }) {
  const vigente = documento.vigente !== false;

  return (
    <div className="col-12 col-md-6 col-lg-4">
      <div className="p-3 border rounded-4 shadow-sm bg-white h-100 d-flex flex-column">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <span className="pill-badge">{documento.categoria}</span>
          <span className={`badge ${vigente ? 'bg-success' : 'bg-secondary'}`}>
            {vigente ? 'Vigente' : 'Archivado'}
          </span>
        </div>

        <h4 className="h6 fw-bold mb-1" style={{ color: 'var(--pr-blue-dark)' }}>
          {documento.titulo}
        </h4>
        <p className="text-muted small flex-grow-1 mb-2">{documento.descripcion}</p>

        {documento.fecha_actualizacion && (
          <small className="text-muted d-block mb-2">
            Actualizado: {documento.fecha_actualizacion}
          </small>
        )}

        <div className="d-flex flex-wrap gap-2 mt-auto">
          {documento.url_archivo ? (
            <a
              href={documento.url_archivo}
              className="btn btn-outline-primary btn-sm flex-grow-1"
              target="_blank"
              rel="noopener noreferrer"
            >
              Consultar documento
            </a>
          ) : (
            <button type="button" className="btn btn-outline-secondary btn-sm flex-grow-1" disabled>
              Consulta referencial (sin PDF adjunto)
            </button>
          )}

          {modoDireccion && (
            <>
              <button
                type="button"
                className="btn btn-outline-primary btn-sm"
                onClick={() => onEditar && onEditar(documento)}
              >
                Editar
              </button>
              <button
                type="button"
                className="btn btn-outline-warning btn-sm"
                onClick={() => onAlternarVigencia && onAlternarVigencia(documento)}
              >
                {vigente ? 'Archivar' : 'Reactivar'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
