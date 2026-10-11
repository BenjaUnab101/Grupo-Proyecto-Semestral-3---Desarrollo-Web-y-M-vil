import { useState } from 'react';
import { useClima } from './hooks/useClima'; 
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import SectionTitle from './components/SectionTitle';
import SeccionPendiente from './components/SeccionPendiente';
import Footer from './components/Footer';
import ComunicadosBoard from './components/ComunicadosBoard';
import Agenda from './components/Agenda.jsx';
import Modal from './components/Modal.jsx';
import PortalApoderados from './components/PortalApoderados.jsx';
import Documentos from './components/Documentos.jsx';
import ProcesoMatricula from './components/ProcesoMatricula.jsx';
import comunicados from './data/comunicados.json';
import actividades from './data/actividades.json';
import seccionesPendientes from './data/secciones.js';
import ClimaWidget from './components/ClimaWidget';

// HU-04: solo en desarrollo (npm run dev) se puede fijar la fecha base con
// ?hoy=AAAA-MM-DD en la URL para probar ayer, hoy, +7 y +8 días. En producción
// siempre se usa la fecha real de America/Santiago.
const hoyDePrueba = import.meta.env.DEV
  ? new URLSearchParams(window.location.search).get('hoy')
  : null;

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

        {/* Secciones objetivo de anclaje para los enlaces del menú */}
        <section className="container py-4">
          <section id="comunicados">
            <SectionTitle
              titulo="Comunicados Oficiales"
              subtitulo="Información y avisos institucionales para la comunidad escolar"
            />
            <ComunicadosBoard comunicados={comunicados} />
          </section>

          <section id="calendario">
            <SectionTitle
              titulo="Calendario de Actividades"
              subtitulo="Próximas fechas importantes, reuniones y talleres"
            />
            <Agenda actividades={actividades} hoy={hoyDePrueba} />
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
