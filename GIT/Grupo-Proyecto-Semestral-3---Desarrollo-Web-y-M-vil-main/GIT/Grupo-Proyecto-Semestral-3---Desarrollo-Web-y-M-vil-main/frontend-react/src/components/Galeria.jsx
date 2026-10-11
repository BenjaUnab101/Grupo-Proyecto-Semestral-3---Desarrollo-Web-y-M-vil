import { useState, useRef } from 'react';
import SectionTitle from './SectionTitle';
import LightboxModal from './LightboxModal';
import galeriaData from '../data/galeria.json';

export default function Galeria() {
  const [imagenSeleccionada, setImagenSeleccionada] = useState(null);
  const disparadorActualRef = useRef(null);
  const disparadoresRefs = useRef({});

  const abrirImagen = (img, id) => {
    disparadorActualRef.current = disparadoresRefs.current[id];
    setImagenSeleccionada(img);
  };

  const cerrarImagen = () => {
    setImagenSeleccionada(null);
  };

  return (
    <section id="galeria" className="container py-4">
      <SectionTitle
        id="titulo-galeria"
        titulo="Galería de Actividades"
        subtitulo="Registros de talleres, proyectos y vida escolar"
      />

      {/* Nota obligatoria de autorización de imagen (CA3 / CP-HU-08-03) */}
      <div className="alert alert-secondary py-2 px-3 small d-flex align-items-center gap-2 mb-4" role="note">
        <span>🛡️</span>
        <span>
          <strong>Protección de imagen y privacidad:</strong> Todas las ilustraciones y fotografías del portal cuentan con la autorización de los apoderados o corresponden a material educativo ilustrativo.
        </span>
      </div>

      <div className="row g-4">
        {galeriaData.map((item) => (
          <div key={item.id} className="col-12 col-sm-6 col-lg-3">
            <button
              ref={(el) => (disparadoresRefs.current[item.id] = el)}
              type="button"
              className="card h-100 w-100 border-0 shadow-sm rounded-4 p-0 text-start bg-white overflow-hidden btn-galeria"
              style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
              onClick={() => abrirImagen(item, item.id)}
              aria-label={`Ver imagen ampliada: ${item.titulo}`}
            >
              <div
                className="bg-light d-flex align-items-center justify-content-center p-4 border-bottom"
                style={{ height: '160px', width: '100%' }}
              >
                <span style={{ fontSize: '3rem' }}>📸</span>
              </div>
              <div className="card-body p-3">
                <h4 className="h6 fw-bold mb-1" style={{ color: 'var(--pr-blue)' }}>
                  {item.titulo}
                </h4>
                <p className="small text-muted mb-0 text-truncate">{item.descripcion}</p>
                <span className="badge bg-light text-primary mt-2">Click o Enter para ampliar</span>
              </div>
            </button>
          </div>
        ))}
      </div>

      {/* Lightbox con render condicional */}
      {imagenSeleccionada && (
        <LightboxModal
          imagen={imagenSeleccionada}
          onCerrar={cerrarImagen}
          disparadorRef={disparadorActualRef}
        />
      )}
    </section>
  );
}
