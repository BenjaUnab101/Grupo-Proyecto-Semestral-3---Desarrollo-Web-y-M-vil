import { useMemo } from 'react'
import ComunicadoCard from './ComunicadoCard.jsx'
import { ordenarComunicados } from '../services/comunicados.js'
import '../styles/Comunicado.css'

function ComunicadosBoard({ comunicados = [] }) {
  // Memoriza el resultado para evitar ordenar nuevamente mientras cambian otras partes de la vista.
  const ordenados = useMemo(() => ordenarComunicados(comunicados), [comunicados])

  return (
    <section className="muro" aria-labelledby="muro-titulo">
      <h2 id="muro-titulo" className="muro__titulo">
        Comunicados oficiales
      </h2>

      {/* Informa cuando todavía no existen comunicados para mostrar. */}
      {ordenados.length === 0 ? (
        <p className="muro__vacio" role="status">
          Por ahora no hay comunicados publicados. Cuando el jardín envíe uno,
          lo verá aquí.
        </p>
      ) : (
        <div className="muro__lista">
          {/* Renderiza una tarjeta por cada comunicado ordenado. */}
          {ordenados.map((comunicado) => (
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
    </section>
  )
}

export default ComunicadosBoard
