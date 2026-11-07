import { useSesion } from '../context/sesionContexto.js'
import { useRecurso } from '../hooks/useRecurso.js'
import { ETIQUETA_ROL, listarCuentasDemo } from '../services/sesionApi.js'
import { mensajeDeError } from '../services/http.js'

// TEC-17: elegir con qué cuenta FICTICIA se navega la demo. Las cuentas vienen de la API.
export default function BarraSesionDemo() {
  const { perfil, error, elegirCuenta } = useSesion()
  const cuentas = useRecurso(listarCuentasDemo)

  return (
    <div className="barra-sesion" role="region" aria-label="Cuenta de demostración">
      <div className="container d-flex flex-wrap align-items-center gap-2 py-2">
        <label htmlFor="cuenta-demo" className="fw-semibold mb-0">Ver el portal como:</label>

        {cuentas.error ? (
          <span className="text-danger" role="alert">
            {mensajeDeError(cuentas.error)}{' '}
            <button type="button" className="btn btn-link btn-sm p-0 align-baseline" onClick={cuentas.recargar}>Reintentar</button>
          </span>
        ) : (
          <select
            id="cuenta-demo"
            className="form-select form-select-sm barra-sesion__selector"
            value={perfil?.usuarioId ?? ''}
            onChange={(e) => elegirCuenta(Number(e.target.value))}
            disabled={cuentas.cargando}
          >
            <option value="">Visitante (sin cuenta)</option>
            {cuentas.datos?.map((c) => (
              <option key={c.usuarioId} value={c.usuarioId}>{ETIQUETA_ROL[c.rol]} · {c.nombre}</option>
            ))}
          </select>
        )}

        {error && <span className="text-danger" role="alert">{mensajeDeError(error)}</span>}
        <span className="small text-muted">Cuentas ficticias de demostración, sin datos reales.</span>
      </div>
    </div>
  )
}
