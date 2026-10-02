import { useState } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import SectionTitle from './components/SectionTitle';
import Footer from './components/Footer';

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
          <SectionTitle
            id="comunicados"
            titulo="Comunicados Oficiales"
            subtitulo="Información y avisos institucionales para la comunidad escolar"
          />
          <div className="p-4 bg-light rounded text-center text-muted mb-4 border">
            [Espacio reservado para componente HU-02 Muro de comunicados]
          </div>

          <SectionTitle
            id="calendario"
            titulo="Calendario de Actividades"
            subtitulo="Fechas importantes, reuniones y talleres"
          />
          <div className="p-4 bg-light rounded text-center text-muted mb-4 border">
            [Espacio reservado para componente HU-04 Calendario]
          </div>

          <SectionTitle
            id="documentos"
            titulo="Documentos y Protocolos"
            subtitulo="Descarga de reglamentos internos y formularios informativos"
          />
          <div className="p-4 bg-light rounded text-center text-muted mb-4 border">
            [Espacio reservado para componente HU-10 Protocolos]
          </div>

          <SectionTitle
            id="matricula"
            titulo="Proceso de Matrícula"
            subtitulo="Postulaciones y requisitos de ingreso"
          />
          <div className="p-4 bg-light rounded text-center text-muted mb-4 border">
            [Espacio reservado para componente HU-11 Formulario de pre-matrícula]
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
