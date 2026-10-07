import { useState } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import SectionTitle from './components/SectionTitle';
import SeccionPendiente from './components/SeccionPendiente';
import Footer from './components/Footer';
import ComunicadosBoard from './components/ComunicadosBoard';
import comunicados from './data/comunicados.json';
import seccionesPendientes from './data/secciones.js';

export default function App() {
  const [modalPortalVisible, setModalPortalVisible] = useState(false);

  const manejarAbrirPortal = () => {
    setModalPortalVisible(true);
  };

  return (
    <div className="min-vh-100 d-flex flex-column">
      <Navbar onAbrirPortal={manejarAbrirPortal} />

      <main className="flex-grow-1">
        <Hero onAbrirPortal={manejarAbrirPortal} />

        {/* Modal feedback para verificar el evento del botón Portal familias */}
        {modalPortalVisible && (
          <div className="container my-3">
            <div className="alert alert-info alert-dismissible fade show d-flex justify-content-between align-items-center" role="alert">
              <div>
                <strong>Portal Familias:</strong> Evento <code>onAbrirPortal</code> recibido correctamente en App.
              </div>
              <button
                type="button"
                className="btn-close"
                aria-label="Cerrar"
                onClick={() => setModalPortalVisible(false)}
              ></button>
            </div>
          </div>
        )}

        {/* Secciones objetivo de anclaje para los enlaces del menú */}
        <section className="container py-4">
          <section id="comunicados">
            <SectionTitle
              titulo="Comunicados Oficiales"
              subtitulo="Información y avisos institucionales para la comunidad escolar"
            />
            <ComunicadosBoard comunicados={comunicados} />
          </section>

          {seccionesPendientes.map((seccion) => (
            <SeccionPendiente key={seccion.id} {...seccion} />
          ))}
        </section>
      </main>

      <Footer />
    </div>
  );
}
