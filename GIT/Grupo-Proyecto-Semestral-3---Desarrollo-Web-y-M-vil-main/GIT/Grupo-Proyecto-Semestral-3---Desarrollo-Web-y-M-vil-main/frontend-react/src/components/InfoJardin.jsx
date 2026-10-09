import NivelCard from './NivelCard';
import SectionTitle from './SectionTitle';
import jardinData from '../data/jardin.json';
import nivelesData from '../data/niveles.json';

export default function InfoJardin() {
  return (
    <section id="informacion" className="container py-4">
      <SectionTitle
        id="info-institucional"
        titulo="Nuestra Institución"
        subtitulo="Conoce nuestra propuesta pedagógica, fonoaudiológica y niveles de atención"
      />

      {/* Bloque Historia y Misión */}
      <div className="row g-4 align-items-center mb-5">
        <div className="col-12 col-md-6">
          <h3 className="fw-bold mb-3" style={{ color: 'var(--pr-blue-dark)' }}>
            {jardinData.nombre}
          </h3>
          <p className="text-secondary">{jardinData.historia}</p>
          <p className="text-secondary mb-0">{jardinData.mision}</p>
        </div>
        <div className="col-12 col-md-6">
          <div className="p-4 rounded-4 text-center border" style={{ backgroundColor: 'var(--pr-blue-light)' }}>
            <span style={{ fontSize: '3rem' }}>🌱</span>
            <p className="fw-bold mt-2 mb-1" style={{ color: 'var(--pr-blue)' }}>Educación Temprana</p>
            <p className="small text-muted mb-0">Atención personalizada con terapeutas y educadoras especialistas.</p>
          </div>
        </div>
      </div>

      {/* Bloque Niveles Educativos (CA1) */}
      <div className="mb-5">
        <h3 className="fw-bold text-center mb-4" style={{ color: 'var(--pr-blue)' }}>
          Niveles Educativos
        </h3>
        <div className="row g-4">
          {nivelesData.map((nivel) => (
            <div key={nivel.id} className="col-12 col-md-4">
              <NivelCard
                nombre={nivel.nombre}
                edad={nivel.edad}
                descripcion={nivel.descripcion}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Bloque de Contacto (CA2) */}
      <div className="p-4 rounded-4 border bg-white shadow-sm text-center">
        <h4 className="fw-bold mb-3" style={{ color: 'var(--pr-blue)' }}>
          Canales Oficiales de Contacto
        </h4>
        <div className="d-flex flex-wrap justify-content-center gap-4">
          <div>
            <span className="fw-bold d-block text-dark">Teléfono de atención:</span>
            <a
              href={`tel:${jardinData.contacto.telefono}`}
              className="text-decoration-none fw-semibold"
              style={{ color: 'var(--pr-blue)' }}
            >
              📞 {jardinData.contacto.telefonoTexto}
            </a>
          </div>
          <div>
            <span className="fw-bold d-block text-dark">Correo institucional:</span>
            <a
              href={`mailto:${jardinData.contacto.correo}`}
              className="text-decoration-none fw-semibold"
              style={{ color: 'var(--pr-blue)' }}
            >
              ✉️ {jardinData.contacto.correoTexto}
            </a>
          </div>
          <div>
            <span className="fw-bold d-block text-dark">Ubicación:</span>
            <span className="text-muted">📍 {jardinData.contacto.direccion}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
