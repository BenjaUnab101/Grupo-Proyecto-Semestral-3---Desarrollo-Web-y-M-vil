import { useState } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import SectionTitle from './components/SectionTitle';
import SeccionPendiente from './components/SeccionPendiente';
import Footer from './components/Footer';
import ComunicadosBoard from './components/ComunicadosBoard';
import Modal from './components/Modal.jsx';
import PortalApoderados from './components/PortalApoderados.jsx';
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

        {modalPortalVisible && (
          <Modal titulo="Portal familias" onCerrar={() => setModalPortalVisible(false)}>
            <PortalApoderados onCerrar={() => setModalPortalVisible(false)} />
          </Modal>
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
