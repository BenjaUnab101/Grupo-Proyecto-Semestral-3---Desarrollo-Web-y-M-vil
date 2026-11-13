import Calendario from './Calendario.jsx'
import { actividadesVigentes, obtenerHoy, parseFechaISO } from '../utils/fechas.js'
import '../styles/Agenda.css'

// HU-04: componente padre del calendario. Decide qué día es "hoy" y calcula
// la lista visible. HU-06: recibe el pronóstico (useClima se llama una sola vez en
// PaginaPrincipal) y lo pasa a Calendario.
//
// `hoy` es opcional y permite fijar la fecha base ("AAAA-MM-DD") en pruebas.
// Si no se entrega o no es válida, se usa la fecha actual de America/Santiago.
export default function Agenda({ actividades = [], hoy, pronostico = [] }) {
  const fechaBase = parseFechaISO(hoy) ? hoy : obtenerHoy()

  // Estado derivado: se filtra y ordena en cada render, sin useEffect ni estado extra.
  const proximas = actividadesVigentes(actividades, fechaBase)

  return (
    <div className="agenda">
      <Calendario actividades={proximas} pronostico={pronostico} />
    </div>
  )
}
