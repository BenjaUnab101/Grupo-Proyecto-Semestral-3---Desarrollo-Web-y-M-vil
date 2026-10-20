import { useEffect, useId, useRef } from 'react'

// Modal accesible y reutilizable: cierra con Escape, click en el fondo o el botón de cerrar.
export default function Modal({ titulo, onCerrar, children }) {
  const idTitulo = useId()
  const contenidoRef = useRef(null)

  useEffect(() => {
    const manejarTecla = (evento) => {
      if (evento.key === 'Escape') onCerrar()
    }
    document.addEventListener('keydown', manejarTecla)
    contenidoRef.current?.focus()
    return () => document.removeEventListener('keydown', manejarTecla)
  }, [onCerrar])

  const manejarClickFondo = (evento) => {
    if (evento.target === evento.currentTarget) onCerrar()
  }

  return (
    <div
      className="modal d-block"
      style={{ background: 'rgba(0, 0, 0, 0.5)' }}
      onMouseDown={manejarClickFondo}
      role="presentation"
    >
      <div className="modal-dialog modal-dialog-centered">
        <div
          className="modal-content"
          role="dialog"
          aria-modal="true"
          aria-labelledby={idTitulo}
          tabIndex={-1}
          ref={contenidoRef}
        >
          <div className="modal-header">
            <h5 className="modal-title" id={idTitulo}>
              {titulo}
            </h5>
            <button type="button" className="btn-close" aria-label="Cerrar" onClick={onCerrar}></button>
          </div>
          <div className="modal-body">{children}</div>
        </div>
      </div>
    </div>
  )
}
