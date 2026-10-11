import { useState } from 'react';
import { useClima } from './hooks/useClima'; 
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import SectionTitle from './components/SectionTitle';
import SeccionPendiente from './components/SeccionPendiente';
import Footer from './components/Footer';
import ComunicadosBoard from './components/ComunicadosBoard';
import Modal from './components/Modal.jsx';
import PortalApoderados from './components/PortalApoderados.jsx';
import Documentos from './components/Documentos.jsx';
import ProcesoMatricula from './components/ProcesoMatricula.jsx';
import comunicados from './data/comunicados.json';
import seccionesPendientes from './data/secciones.js';
import ClimaWidget from './components/ClimaWidget';
import InfoJardin from './components/InfoJardin';
import Galeria from './components/Galeria';
import CuposSalas from './components/CuposSalas';

export default function App() {
  const {
    pronostico,
    cargando,
    error,
    reintentar,
  } = useClima();
  
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

        <InfoJardin />

        {/* HU-08: Galería con Lightbox */}
        <Galeria />

        {/* HU-09: Estado de cupos por sala */}
        <CuposSalas />

        {/* Secciones restantes */}
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

          <section id="documentos">
            <SectionTitle
              titulo="Documentos y Protocolos"
              subtitulo="Reglamentos internos y formularios informativos (demo)"
            />
            <Documentos />
          </section>

          <section id="matricula">
            <SectionTitle
              titulo="Proceso de Matrícula"
              subtitulo="Etapas y requisitos de ingreso (demo)"
            />
            <ProcesoMatricula />
          </section>
        </section>

        <ClimaWidget
          pronostico={pronostico}
          cargando={cargando}
          error={error}
          reintentar={reintentar}
        />
      </main>

      <Footer />
    </div>
  );
}
