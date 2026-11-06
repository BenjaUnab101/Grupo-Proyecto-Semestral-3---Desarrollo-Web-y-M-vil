import { useCallback, useEffect, useState } from 'react';
import { useClima } from './hooks/useClima'; 
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import SectionTitle from './components/SectionTitle';
import SeccionPendiente from './components/SeccionPendiente';
import Footer from './components/Footer';
import ComunicadosBoard from './components/ComunicadosBoard';
import Agenda from './components/Agenda.jsx';
import FlujoInscripcionEventos from './components/FlujoInscripcionEventos.jsx';
import GestionOrganizadores from './components/GestionOrganizadores.jsx';
import GestionActividades from './components/GestionActividades.jsx';
import Modal from './components/Modal.jsx';
import PortalApoderados from './components/PortalApoderados.jsx';
import Documentos from './components/Documentos.jsx';
import ProcesoMatricula from './components/ProcesoMatricula.jsx';
import FormPreMatricula from './components/FormPreMatricula.jsx';
import FormContacto from './components/FormContacto.jsx';
import { obtenerComunicados } from './services/comunicados.js';
import { obtenerActividades } from './services/eventosApi.js';
import actividadesDemo from './data/actividades.json';
import seccionesPendientes from './data/secciones.js';
import ClimaWidget from './components/ClimaWidget';
import InfoJardin from './components/InfoJardin.jsx';
import Galeria from './components/Galeria.jsx';
import CuposSalas from './components/CuposSalas.jsx';

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
  const [comunicados, setComunicados] = useState([]);
  const [cargandoComunicados, setCargandoComunicados] = useState(true);
  const [errorComunicados, setErrorComunicados] = useState('');
  const [actividadesCalendario, setActividadesCalendario] = useState(actividadesDemo);

  const cargarActividadesCalendario = useCallback(async () => {
    try {
      const publicadas = await obtenerActividades(true);
      if (Array.isArray(publicadas) && publicadas.length > 0) {
        setActividadesCalendario(publicadas);
      } else {
        setActividadesCalendario(actividadesDemo);
      }
    } catch {
      setActividadesCalendario(actividadesDemo);
    }
  }, []);

  useEffect(() => {
    async function cargarComunicados() {
      try {
        setCargandoComunicados(true);
        setErrorComunicados('');

        const datos = await obtenerComunicados();
        setComunicados(datos);
      } catch (error) {
        console.error('Error al cargar comunicados:', error);
        setErrorComunicados('No fue posible cargar los comunicados.');
      } finally {
        setCargandoComunicados(false);
      }
    }

    cargarComunicados();
    cargarActividadesCalendario();
  }, [cargarActividadesCalendario]);

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
        <Galeria />
        <CuposSalas />

        <section className="container py-4">
          <section id="comunicados">
            <SectionTitle
              titulo="Comunicados Oficiales"
              subtitulo="Información y avisos institucionales para la comunidad escolar"
            />
            {cargandoComunicados ? (
              <p>Cargando comunicados...</p>
            ) : errorComunicados ? (
              <p role="alert">{errorComunicados}</p>
            ) : (
              <ComunicadosBoard comunicados={comunicados} />
            )}
          </section>

          <section id="calendario">
            <SectionTitle
              titulo="Calendario de Actividades"
              subtitulo="Próximas fechas importantes, reuniones y talleres"
            />
            <Agenda actividades={actividadesCalendario} hoy={hoyDePrueba} />
            <FlujoInscripcionEventos onCambioInscripcion={cargarActividadesCalendario} />
            <GestionActividades onCambioActividades={cargarActividadesCalendario} />
            <GestionOrganizadores />
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
            <FormPreMatricula />
          </section>

          <section id="contacto">
            <SectionTitle
              titulo="Contacto con la Dirección"
              subtitulo="Canal propuesto para consultas de las familias (demo)"
            />
            <FormContacto />
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
