import Calendario from './Calendario.jsx'
import { actividadesVigentes, obtenerHoy, parseFechaISO } from '../utils/fechas.js'
import '../styles/Agenda.css'

// HU-04: componente padre del calendario. Decide qué día es "hoy" y calcula
// la lista visible. En HU-05 este componente también llamará a useClima.
//
// `hoy` es opcional y permite fijar la fecha base ("AAAA-MM-DD") en pruebas.
// Si no se entrega o no es válida, se usa la fecha actual de America/Santiago.
export default function Agenda({ actividades = [], hoy }) {
  const fechaBase = parseFechaISO(hoy) ? hoy : obtenerHoy()

  // Estado derivado: se filtra y ordena en cada render, sin useEffect ni estado extra.
  const proximas = actividadesVigentes(actividades, fechaBase)

  return (
    <div className="agenda">
      <Calendario actividades={proximas} />
    </div>
  )
}
