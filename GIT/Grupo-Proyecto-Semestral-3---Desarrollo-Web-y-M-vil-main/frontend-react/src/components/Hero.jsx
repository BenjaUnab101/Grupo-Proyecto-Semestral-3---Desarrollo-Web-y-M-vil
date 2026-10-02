export default function Hero({ onAbrirPortal }) {
  return (
    <section className="py-5 text-center text-lg-start" style={{ backgroundColor: 'var(--pr-blue-light)' }}>
      <div className="container py-4">
        <div className="row align-items-center g-4">
          <div className="col-12 col-lg-7">
            <span className="pill-badge mb-3">Admisión 2027 Abierta</span>
            <h1 className="display-4 fw-bold mb-3" style={{ color: 'var(--pr-blue-dark)' }}>
              Educación parvularia y fonoaudiológica integral
            </h1>
            <p className="lead text-muted mb-4">
              Acompañamos a cada párvulo con atención especializada en un entorno seguro, afectivo y estimulante.
            </p>
            <div className="d-flex flex-wrap gap-3 justify-content-center justify-content-lg-start">
              <a href="#matricula" className="btn-institucional-primary">
                Ver proceso de matrícula
              </a>
              <button
                type="button"
                className="btn btn-outline-secondary fw-semibold px-4 py-2"
                onClick={onAbrirPortal}
              >
                Acceso apoderados
              </button>
            </div>
          </div>
          <div className="col-12 col-lg-5 text-center">
            <div
              className="p-4 bg-white rounded-4 shadow-sm border border-light"
              style={{ minHeight: '260px', display: 'grid', placeItems: 'center' }}
            >
              <div className="text-center">
                <span style={{ fontSize: '4rem' }}>🏫</span>
                <p className="fw-bold mt-2 mb-0" style={{ color: 'var(--pr-blue)' }}>Escuela de Lenguaje Pequeños Reyes</p>
                <small className="text-muted">Quilpué, Región de Valparaíso</small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
