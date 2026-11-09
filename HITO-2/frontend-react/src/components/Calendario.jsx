import ActividadItem from './ActividadItem.jsx'
import { climaParaFecha } from '../utils/clima.js'

// HU-04: muestra la lista ya filtrada y ordenada que recibe de Agenda.
// HU-06: `pronostico` (opcional) viene de useClima; cada actividad recibe el día que le corresponde.
export default function Calendario({ actividades = [], pronostico = [] }) {
  if (actividades.length === 0) {
    return (
      <p className="agenda__vacio" role="status">
        No hay actividades programadas
      </p>
    )
  }

  return (
    <ol className="agenda__lista" aria-label="Próximas actividades">
      {actividades.map((actividad) => (
        <ActividadItem
          key={actividad.id}
          titulo={actividad.titulo}
          fecha={actividad.fecha}
          hora={actividad.hora}
          lugar={actividad.lugar}
          preparar={actividad.preparar}
          diasRestantes={actividad.diasRestantes}
          climaDelDia={climaParaFecha(pronostico, actividad.fecha)}
        />
      ))}
    </ol>
  )
}
