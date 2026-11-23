import { useEffect, useRef } from 'react';
import { useClima } from '../hooks/useClima';
import { useRuta } from '../hooks/useRuta.js';
import Navbar from '../components/Navbar';
import BarraSesion from '../components/BarraSesion.jsx';
import Footer from '../components/Footer';
import Modal from '../components/Modal.jsx';
import PortalApoderados from '../components/PortalApoderados.jsx';
import InfoJardin from '../components/InfoJardin.jsx';
import Galeria from '../components/Galeria.jsx';
import InicioPagina from './InicioPagina.jsx';
import CuposSeccion from './CuposSeccion.jsx';
import ComunicadosSeccion from './ComunicadosSeccion.jsx';
import CalendarioSeccion from './CalendarioSeccion.jsx';
import DocumentosSeccion from './DocumentosSeccion.jsx';
import MatriculaSeccion from './MatriculaSeccion.jsx';
import ContactoSeccion from './ContactoSeccion.jsx';
import PanelDireccionSeccion from './PanelDireccionSeccion.jsx';
import { useSesion } from '../context/sesionContexto.js';
import { tituloDocumento } from '../utils/rutas.js';

// HU-04: solo en desarrollo (npm run dev) se puede fijar la fecha base con
// ?hoy=AAAA-MM-DD en la URL para probar ayer, hoy, +7 y +8 días. En producción
// siempre se usa la fecha real de America/Santiago.
const hoyDePrueba = import.meta.env.DEV
  ? new URLSearchParams(window.location.search).get('hoy')
  : null;

// Estructura común a todos los apartados: menú, barra de sesión, contenido y pie.
// El contenido depende de la dirección (#/calendario, #/matricula...): ver utils/rutas.js.
// Cada apartado vive en pages/ y pide sus propios datos a la API mediante services/.
export default function PaginaPrincipal() {
  const ruta = useRuta();
  const { pronostico, cargando, error, reintentar } = useClima(); // una sola llamada para todo el portal
  const { portalAbierto, abrirPortal, cerrarPortal, esPersonal } = useSesion();
  const principalRef = useRef(null);
  const primeraVez = useRef(true);

  // Al cambiar de apartado: título de la pestaña, volver arriba y llevar el foco al contenido
  // (así un lector de pantalla anuncia la página nueva). En la carga inicial no se mueve el foco.
  useEffect(() => {
    document.title = tituloDocumento(ruta);
    if (primeraVez.current) {
      primeraVez.current = false;
      return;
    }
    window.scrollTo(0, 0);
    principalRef.current?.focus({ preventScroll: true });
  }, [ruta]);

  // Un componente por apartado. Las claves coinciden con los id de utils/rutas.js.
  const apartados = {
    inicio: <InicioPagina clima={{ pronostico, cargando, error, reintentar }} />,
    nosotros: <InfoJardin />,
    galeria: <Galeria />,
    cupos: <CuposSeccion />,
    comunicados: <EnContenedor><ComunicadosSeccion /></EnContenedor>,
    // HU-06: si la API del clima falla, el calendario se muestra igual, sin insignias.
    calendario: <EnContenedor><CalendarioSeccion hoy={hoyDePrueba} pronostico={error ? [] : pronostico} /></EnContenedor>,
    documentos: <EnContenedor><DocumentosSeccion /></EnContenedor>,
    matricula: <EnContenedor><MatriculaSeccion /></EnContenedor>,
    contacto: <EnContenedor><ContactoSeccion /></EnContenedor>,
    panel: <EnContenedor>{esPersonal ? <PanelDireccionSeccion /> : <SoloPersonal onIngresar={abrirPortal} />}</EnContenedor>,
  };

  return (
    <div className="min-vh-100 d-flex flex-column">
      <Navbar rutaActual={ruta} onAbrirPortal={abrirPortal} />
      <BarraSesion />

      {portalAbierto && (
        <Modal titulo="Portal familias" onCerrar={cerrarPortal}>
          <PortalApoderados onCerrar={cerrarPortal} />
        </Modal>
      )}

      {/* key: al cambiar de apartado se monta de nuevo (datos frescos y formularios limpios). */}
      <main key={ruta} ref={principalRef} tabIndex={-1} className="flex-grow-1 apartado">
        {apartados[ruta]}
      </main>

      <Footer />
    </div>
  );
}

function EnContenedor({ children }) {
  return <div className="container py-4">{children}</div>;
}

function SoloPersonal({ onIngresar }) {
  return (
    <div className="estado-api--vacio text-center my-5">
      <p className="mb-3">El panel es solo para el personal del jardín.</p>
      <button type="button" className="btn-institucional-primary" onClick={onIngresar}>
        Iniciar sesión
      </button>
    </div>
  );
}
