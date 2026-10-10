import ActividadItem from './ActividadItem.jsx'

// HU-04: muestra la lista ya filtrada y ordenada que recibe de Agenda.
export default function Calendario({ actividades = [] }) {
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
        />
      ))}
    </ol>
  )
}
