import { useEffect, useRef } from 'react';

export default function LightboxModal({ imagen, onCerrar, disparadorRef }) {
  const modalRef = useRef(null);
  const botonCerrarRef = useRef(null);

  // Foco inicial y manejo de Escape + Focus trap
  useEffect(() => {
    // Foco inicial accesible
    if (botonCerrarRef.current) {
      botonCerrarRef.current.focus();
    }

    const manejarKeyDown = (e) => {
      if (e.key === 'Escape') {
        onCerrar();
        return;
      }

      // Trampa de foco (Tab loop)
      if (e.key === 'Tab' && modalRef.current) {
        const elementosFocusables = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const primero = elementosFocusables[0];
        const ultimo = elementosFocusables[elementosFocusables.length - 1];

        if (e.shiftKey && document.activeElement === primero) {
          e.preventDefault();
          ultimo.focus();
        } else if (!e.shiftKey && document.activeElement === ultimo) {
          e.preventDefault();
          primero.focus();
        }
      }
    };

    window.addEventListener('keydown', manejarKeyDown);
    return () => {
      window.removeEventListener('keydown', manejarKeyDown);
      // Retorno de foco al disparador al desmontarse (CA2 / CA4)
      if (disparadorRef && disparadorRef.current) {
        disparadorRef.current.focus();
      }
    };
  }, [onCerrar, disparadorRef]);

  if (!imagen) return null;

  return (
    <div
      className="modal-backdrop-custom d-flex align-items-center justify-content-center p-3"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        zIndex: 1050,
      }}
      onClick={onCerrar}
      role="presentation"
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="lightbox-titulo"
        className="bg-white rounded-4 shadow-lg p-4 text-center"
        style={{ maxWidth: '600px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()} // evitar cerrar al hacer clic dentro
      >
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h3 id="lightbox-titulo" className="h5 fw-bold mb-0" style={{ color: 'var(--pr-blue)' }}>
            {imagen.titulo}
          </h3>
          <button
            ref={botonCerrarRef}
            type="button"
            className="btn-close"
            aria-label="Cerrar imagen ampliada"
            onClick={onCerrar}
          />
        </div>

        <div className="bg-light rounded-3 p-4 mb-3 d-flex align-items-center justify-content-center" style={{ minHeight: '220px' }}>
          <img
            src={imagen.imagenUrl}
            alt={imagen.alt}
            className="img-fluid rounded"
            style={{ maxHeight: '350px', objectFit: 'contain' }}
            onError={(e) => {
              // Fallback accesible si la ruta de la imagen local aún no existe en public
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextSibling.style.display = 'block';
            }}
          />
          <div style={{ display: 'none' }}>
            <span style={{ fontSize: '4rem' }}>🎨</span>
            <p className="small text-muted mt-2">{imagen.alt}</p>
          </div>
        </div>

        <p className="text-secondary small mb-0">{imagen.descripcion}</p>
      </div>
    </div>
  );
}
