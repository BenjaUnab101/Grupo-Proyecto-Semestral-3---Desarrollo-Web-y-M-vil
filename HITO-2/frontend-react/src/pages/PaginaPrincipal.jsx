import { useState } from 'react';
import { useClima } from '../hooks/useClima';
import Navbar from '../components/Navbar';
import BarraSesionDemo from '../components/BarraSesionDemo.jsx';
import Hero from '../components/Hero';
import SectionTitle from '../components/SectionTitle';
import SeccionPendiente from '../components/SeccionPendiente';
import Footer from '../components/Footer';
import Modal from '../components/Modal.jsx';
import PortalApoderados from '../components/PortalApoderados.jsx';
import Documentos from '../components/Documentos.jsx';
import ContactoSeccion from './ContactoSeccion.jsx';
import PanelDireccionSeccion from './PanelDireccionSeccion.jsx';
import seccionesPendientes from '../data/secciones.js';
import ClimaWidget from '../components/ClimaWidget';
import InfoJardin from '../components/InfoJardin.jsx';
import Galeria from '../components/Galeria.jsx';
import CuposSeccion from './CuposSeccion.jsx';
import ComunicadosSeccion from './ComunicadosSeccion.jsx';
import CalendarioSeccion from './CalendarioSeccion.jsx';
import MatriculaSeccion from './MatriculaSeccion.jsx';

// HU-04: solo en desarrollo (npm run dev) se puede fijar la fecha base con
// ?hoy=AAAA-MM-DD en la URL para probar ayer, hoy, +7 y +8 días. En producción
// siempre se usa la fecha real de America/Santiago.
const hoyDePrueba = import.meta.env.DEV
  ? new URLSearchParams(window.location.search).get('hoy')
  : null;

// TEC-17: la página arma las secciones. Las que muestran datos operacionales
// (cupos, comunicados, calendario e inscripciones) viven en pages/ y los piden a la
// API mediante services/. Los componentes de components/ solo dibujan lo que reciben.
export default function PaginaPrincipal() {
  const { pronostico, cargando, error, reintentar } = useClima();
  const [modalPortalVisible, setModalPortalVisible] = useState(false);

  const manejarAbrirPortal = () => {
    setModalPortalVisible(true);
  };

  return (
    <div className="min-vh-100 d-flex flex-column">
      <Navbar onAbrirPortal={manejarAbrirPortal} />
      <BarraSesionDemo />

      <main className="flex-grow-1">
        <Hero onAbrirPortal={manejarAbrirPortal} />

        {modalPortalVisible && (
          <Modal titulo="Portal familias" onCerrar={() => setModalPortalVisible(false)}>
            <PortalApoderados onCerrar={() => setModalPortalVisible(false)} />
          </Modal>
        )}

        {/* HU-07: Información institucional, niveles y contacto */}
        <InfoJardin />

        {/* HU-08: Galería con Lightbox */}
        <Galeria />

        {/* HU-09 + TEC-17: Estado de cupos por sala (desde la API) */}
        <CuposSeccion />

        <section className="container py-4">
          {/* HU-21 + TEC-17: comunicados desde la API */}
          <ComunicadosSeccion />

          {/* HU-04 + HU-19 + TEC-17: calendario e inscripciones desde la API */}
          <CalendarioSeccion hoy={hoyDePrueba} />

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

          {/* HU-11 + HU-25: pre-matrícula guardada en la API y seguimiento */}
          <MatriculaSeccion />

          {/* HU-12 + HU-26 (Sprint 3 · Daniel): contacto guardado en la API con seguimiento */}
          <ContactoSeccion />

          {/* HU-24 + HU-22 (Sprint 3 · Daniel): panel interno, solo con sesión real del personal */}
          <PanelDireccionSeccion />
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
