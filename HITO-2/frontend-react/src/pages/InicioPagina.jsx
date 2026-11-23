import Hero from '../components/Hero.jsx'
import ClimaWidget from '../components/ClimaWidget.jsx'
import SectionTitle from '../components/SectionTitle.jsx'
import { hrefDeRuta, rutasDelMenu } from '../utils/rutas.js'
import { useSesion } from '../context/sesionContexto.js'

// Portada: presentación, accesos directos a cada apartado y el clima de la semana (HU-05).
// Ya no carga comunicados, calendario ni formularios: cada uno vive en su propio apartado.
export default function InicioPagina({ clima }) {
  const { abrirPortal, esPersonal } = useSesion()

  return (
    <>
      <Hero onAbrirPortal={abrirPortal} />

      <section className="container py-4" aria-labelledby="titulo-accesos">
        <SectionTitle id="titulo-accesos" titulo="¿Qué necesitas hoy?" subtitulo="Elige un apartado del portal" />
        <ul className="accesos">
          {rutasDelMenu(esPersonal).map((ruta) => (
            <li key={ruta.id}>
              <a className="acceso" href={hrefDeRuta(ruta.id)}>
                <span className="acceso__icono" aria-hidden="true">{ruta.icono}</span>
                <span className="acceso__titulo">{ruta.titulo}</span>
                <span className="acceso__descripcion">{ruta.descripcion}</span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <ClimaWidget pronostico={clima.pronostico} cargando={clima.cargando} error={clima.error} reintentar={clima.reintentar} />
    </>
  )
}
