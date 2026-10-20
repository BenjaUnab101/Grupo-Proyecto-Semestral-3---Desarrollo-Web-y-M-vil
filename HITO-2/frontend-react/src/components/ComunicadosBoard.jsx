import { useMemo, useState } from 'react'
import ComunicadoCard from './ComunicadoCard.jsx'
import FiltroNivel from './FiltroNivel.jsx'
import {
  FILTRO_TODOS,
  OPCIONES_FILTRO_NIVEL,
  filtrarPorNivel,
  ordenarComunicados,
} from '../services/comunicados.js'
import '../styles/Comunicado.css'

const ID_LISTA = 'muro-lista'

function ComunicadosBoard({ comunicados = [] }) {
  // HU-03: el filtro activo vive aquí; "Todos" es el valor por defecto.
  const [filtroActivo, setFiltroActivo] = useState(FILTRO_TODOS)

  // Memoriza el resultado para evitar ordenar nuevamente mientras cambian otras partes de la vista.
  const ordenados = useMemo(() => ordenarComunicados(comunicados), [comunicados])

  // HU-03: la lista visible es estado derivado; se recalcula en cada render a partir
  // de `ordenados` y `filtroActivo`, sin guardarla en otro estado ni usar useEffect.
  const visibles = filtrarPorNivel(ordenados, filtroActivo)

  const noHayComunicados = ordenados.length === 0

  return (
    <section className="muro" aria-labelledby="muro-titulo">
      <h2 id="muro-titulo" className="muro__titulo">
        Comunicados oficiales
      </h2>

      {/* Informa cuando todavía no existen comunicados para mostrar. */}
      {noHayComunicados ? (
        <p className="muro__vacio" role="status">
          Por ahora no hay comunicados publicados. Cuando el jardín envíe uno,
          lo verá aquí.
        </p>
      ) : (
        <>
          <FiltroNivel
            opciones={OPCIONES_FILTRO_NIVEL}
            filtroActivo={filtroActivo}
            onCambiarFiltro={setFiltroActivo}
            controla={ID_LISTA}
          />

          <div id={ID_LISTA}>
            {/* HU-03 CA2: el nivel elegido no tiene comunicados. */}
            {visibles.length === 0 ? (
              <p className="muro__vacio" role="status">
                No hay comunicados para este nivel
              </p>
            ) : (
              <div className="muro__lista">
                {/* Renderiza una tarjeta por cada comunicado ordenado y filtrado. */}
                {visibles.map((comunicado) => (
                  <ComunicadoCard
                    key={comunicado.id}
                    titulo={comunicado.titulo}
                    cuerpo={comunicado.cuerpo}
                    fecha={comunicado.fecha}
                    emisor={comunicado.emisor}
                    alcance={comunicado.alcance}
                    categoria={comunicado.categoria}
                    esUrgente={comunicado.esUrgente === true}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  )
}

export default ComunicadosBoard
