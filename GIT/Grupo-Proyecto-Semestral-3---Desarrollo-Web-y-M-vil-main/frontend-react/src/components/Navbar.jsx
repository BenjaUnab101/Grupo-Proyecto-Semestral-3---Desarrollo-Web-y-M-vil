import { useState } from 'react';

const ENLACES_NAV = [
  { id: 'comunicados', label: 'Comunicados' },
  { id: 'calendario', label: 'Calendario' },
  { id: 'documentos', label: 'Documentos' },
  { id: 'matricula', label: 'Matrícula' },
];

export default function Navbar({ onAbrirPortal }) {
  const [menuAbierto, setMenuAbierto] = useState(false);

  const toggleMenu = () => setMenuAbierto((prev) => !prev);
  const cerrarMenu = () => setMenuAbierto(false);

  return (
    <header className="sticky-top bg-white border-bottom shadow-sm">
      <nav className="navbar navbar-expand-lg navbar-light container py-2" aria-label="Navegación principal">
        <a className="navbar-brand fw-bold d-flex align-items-center gap-2" href="#" style={{ color: 'var(--pr-blue)' }}>
          <span style={{ fontSize: '1.5rem' }}>👑</span>
          <span>Pequeños Reyes</span>
        </a>

        {/* Botón hamburguesa accesible (< 992px) */}
        <button
          className="navbar-toggler"
          type="button"
          aria-controls="navbarMenuContent"
          aria-expanded={menuAbierto}
          aria-label={menuAbierto ? 'Cerrar navegación' : 'Abrir navegación'}
          onClick={toggleMenu}
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        {/* Contenido colapsable controlado por React */}
        <div
          id="navbarMenuContent"
          className={`collapse navbar-collapse ${menuAbierto ? 'show' : ''}`}
        >
          <ul className="navbar-nav ms-auto mb-2 mb-lg-0 align-items-lg-center gap-lg-2">
            {ENLACES_NAV.map((item) => (
              <li key={item.id} className="nav-item">
                <a
                  className="nav-link fw-semibold px-2"
                  href={`#${item.id}`}
                  onClick={cerrarMenu}
                >
                  {item.label}
                </a>
              </li>
            ))}

            {/* Acción de Portal familias (CA3 / CP-HU-01-03) */}
            <li className="nav-item ms-lg-2 mt-2 mt-lg-0">
              <button
                type="button"
                className="btn-institucional-primary py-2 px-3 fs-6 w-100"
                onClick={() => {
                  cerrarMenu();
                  if (onAbrirPortal) onAbrirPortal();
                }}
              >
                Portal familias
              </button>
            </li>
          </ul>
        </div>
      </nav>
    </header>
  );
}
