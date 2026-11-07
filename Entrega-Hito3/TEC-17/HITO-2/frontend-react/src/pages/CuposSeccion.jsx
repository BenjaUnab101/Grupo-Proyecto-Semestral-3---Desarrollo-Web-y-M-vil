import CuposSalas from '../components/CuposSalas.jsx'
import SalaCard from '../components/SalaCard.jsx'
import EstadoCarga from '../components/EstadosApi.jsx'
import { useRecurso } from '../hooks/useRecurso.js'
import { listarCuposSalas } from '../services/salasApi.js'

// TEC-17 / HU-09: cupos por sala desde la API (antes: salas.json escrito a mano).
export default function CuposSeccion() {
  const cupos = useRecurso(listarCuposSalas)

  return (
    <CuposSalas>
      <EstadoCarga recurso={cupos} textoCargando="Cargando cupos…" textoError="No pudimos cargar los cupos." textoVacio="Aún no hay salas registradas.">
        <div className="row g-3">
          {cupos.datos?.map((sala) => (
            <div key={sala.id} className="col-12 col-md-6 col-lg-3">
              <SalaCard sala={sala} />
            </div>
          ))}
        </div>
      </EstadoCarga>
    </CuposSalas>
  )
}
