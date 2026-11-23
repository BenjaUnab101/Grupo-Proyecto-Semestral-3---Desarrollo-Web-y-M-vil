import { useState } from 'react';
import { useSesion } from '../context/sesionContexto.js';
import { hrefDeRuta, rutasDelMenu } from '../utils/rutas.js';

// Menú principal: un enlace por apartado (utils/rutas.js). El apartado actual queda marcado
// con aria-current="page"; "Panel" solo aparece con sesión del personal.
export default function Navbar({ rutaActual, onAbrirPortal }) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const { perfil, esPersonal } = useSesion() ?? {};

  const toggleMenu = () => setMenuAbierto((prev) => !prev);
  const cerrarMenu = () => setMenuAbierto(false);

  return (
    <header className="sticky-top bg-white border-bottom shadow-sm">
      <nav className="navbar navbar-expand-xl navbar-light container py-2" aria-label="Navegación principal">
        <a className="navbar-brand fw-bold d-flex align-items-center gap-2" href={hrefDeRuta('inicio')} onClick={() => setMenuAbierto(false)} style={{ color: 'var(--pr-blue)' }}>
          <span style={{ fontSize: '1.5rem' }}>👑</span>
          <span>Pequeños Reyes</span>
        </a>

        {/* Botón hamburguesa accesible (< 1200px) */}
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
          <ul className="navbar-nav ms-auto mb-2 mb-xl-0 align-items-xl-center gap-xl-1">
            {rutasDelMenu(esPersonal).map((item) => {
              const activa = item.id === rutaActual;
              return (
                <li key={item.id} className="nav-item">
                  <a
                    className={`nav-link fw-semibold px-2${activa ? ' active' : ''}`}
                    href={hrefDeRuta(item.id)}
                    aria-current={activa ? 'page' : undefined}
                    onClick={cerrarMenu}
                  >
                    {item.titulo}
                  </a>
                </li>
              );
            })}

            {/* Acción de Portal familias (CA3 / CP-HU-01-03) */}
            <li className="nav-item ms-xl-2 mt-2 mt-xl-0">
              <button
                type="button"
                className="btn-institucional-primary py-2 px-3 fs-6 w-100"
                onClick={() => {
                  cerrarMenu();
                  if (onAbrirPortal) onAbrirPortal();
                }}
              >
                {perfil ? `👤 ${perfil.nombre.split(' ')[0]}` : 'Portal familias'}
              </button>
            </li>
          </ul>
        </div>
      </nav>
    </header>
  );
}