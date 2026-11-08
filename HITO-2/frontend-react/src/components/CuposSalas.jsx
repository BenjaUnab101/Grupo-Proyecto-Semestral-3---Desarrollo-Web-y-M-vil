import SectionTitle from './SectionTitle';

// HU-09: sección de cupos por sala. Desde TEC-17 las tarjetas llegan como children
// (pages/CuposSeccion.jsx las arma con los datos de la API).
export default function CuposSalas({ children }) {
  return (
    <section id="cupos-salas" className="container py-4">
      <SectionTitle
        id="titulo-cupos"
        titulo="Estado de Cupos por Sala"
        subtitulo="Disponibilidad estimada para el proceso de postulación"
      />

      {/* Nota obligatoria de datos simulados (CA4 / CP-HU-09-03) */}
      <div className="alert alert-warning py-2 px-3 small d-flex align-items-center gap-2 mb-4" role="note">
        <span>⚠️</span>
        <span>
          <strong>Aviso institucional:</strong> Los cupos mostrados corresponden a datos simulados con fines demostrativos del portal. La disponibilidad real definitiva debe confirmarse directamente en secretaría.
        </span>
      </div>

      {children}
    </section>
  );
}
