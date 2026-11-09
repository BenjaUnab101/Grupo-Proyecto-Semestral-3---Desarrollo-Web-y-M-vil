import { useCallback, useState } from 'react'
import EstadoCarga from './EstadosApi.jsx'
import { useRecurso } from '../hooks/useRecurso.js'
import { ESTADO_PARTICIPACION, obtenerHistorial, obtenerPanel } from '../services/panelApi.js'
import { formatearFecha, formatearFechaHora } from '../utils/fechas.js'
import { ListaEventos, Paginador } from './PanelAuditoria.jsx'

// HU-24 (Sprint 3 · Daniel): panel de asistentes e indicadores de participación.
//  - Indicadores: agregaciones SQL reales (GET /panel/participacion), con filtros de
//    actividad y período. Las actividades sin inscritos aparecen con 0.
//  - Historial: eventos de inscripción guardados en MongoDB (HU-22).
// Solo dirección y personal con sesión real (la API responde 401/403 al resto).
export default function PanelParticipacion() {
  const [filtros, setFiltros] = useState({ actividadId: '', desde: '', hasta: '' })
  const [aplicados, setAplicados] = useState(filtros)
  const [pagina, setPagina] = useState(1)
  const [errorFiltro, setErrorFiltro] = useState(null)

  const cargarPanel = useCallback(() => obtenerPanel(aplicados), [aplicados])
  const panel = useRecurso(cargarPanel)
  const todas = useRecurso(obtenerPanel) // lista de actividades para el selector (sin filtros)
  const cargarHistorial = useCallback(() => obtenerHistorial({ ...aplicados, pagina }), [aplicados, pagina])
  const historial = useRecurso(cargarHistorial)

  const aplicar = (evento) => {
    evento.preventDefault()
    if (filtros.desde && filtros.hasta && filtros.desde > filtros.hasta) {
      setErrorFiltro('La fecha «desde» no puede ser posterior a «hasta».')
      return
    }
    setErrorFiltro(null)
    setPagina(1)
    setAplicados(filtros)
  }

  const cambiar = (campo) => (e) => setFiltros((f) => ({ ...f, [campo]: e.target.value }))

  return (
    <section id="panel-participacion" className="panel-direccion">
      <h3 className="h5">Participación en actividades</h3>

      <form className="panel-direccion__filtros" onSubmit={aplicar} noValidate>
        <label>
          Actividad
          <select className="form-select form-select-sm" value={filtros.actividadId} onChange={cambiar('actividadId')}>
            <option value="">Todas</option>
            {todas.datos?.actividades.map((a) => <option key={a.id} value={a.id}>{a.titulo}</option>)}
          </select>
        </label>
        <label>
          Desde
          <input type="date" className="form-control form-control-sm" value={filtros.desde} onChange={cambiar('desde')} />
        </label>
        <label>
          Hasta
          <input type="date" className="form-control form-control-sm" value={filtros.hasta} onChange={cambiar('hasta')} />
        </label>
        <button type="submit" className="btn btn-primary btn-sm">Aplicar filtros</button>
      </form>
      {errorFiltro && <p className="alert alert-danger py-2" role="alert">{errorFiltro}</p>}

      <EstadoCarga recurso={panel} textoCargando="Calculando indicadores…" textoError="No pudimos cargar los indicadores.">
        {panel.datos && <Indicadores panel={panel.datos} />}
      </EstadoCarga>

      <h4 className="h6 mt-4">Historial de inscripciones (MongoDB)</h4>
      <EstadoCarga
        recurso={{ ...historial, datos: historial.datos?.items }}
        textoCargando="Cargando historial…"
        textoError="No pudimos cargar el historial."
        textoVacio="No hay movimientos de inscripción registrados para estos filtros."
      >
        <ListaEventos eventos={historial.datos?.items ?? []} />
        <Paginador pagina={pagina} paginas={historial.datos?.paginas ?? 1} onCambiar={setPagina} />
      </EstadoCarga>
    </section>
  )
}

function Indicadores({ panel }) {
  const { totales, actividades } = panel
  const tarjetas = [
    ['Actividades', totales.actividades],
    ['Inscritos', totales.inscritos],
    ['Cupo total', totales.cupoTotal],
    ['Ocupación', `${totales.ocupacionPct}%`],
    ['Cancelaciones', totales.cancelados],
    ['Sin inscritos', totales.sinInscritos],
  ]
  return (
    <>
      <ul className="panel-direccion__tarjetas">
        {tarjetas.map(([titulo, valor]) => (
          <li key={titulo}>
            <span className="panel-direccion__valor">{valor}</span>
            <span className="panel-direccion__etiqueta">{titulo}</span>
          </li>
        ))}
      </ul>

      {actividades.length === 0 ? (
        <p className="estado-api estado-api--vacio" role="status">No hay actividades en el período elegido.</p>
      ) : (
        <div className="table-responsive">
          <table className="table table-sm align-middle panel-direccion__tabla">
            <caption className="visually-hidden">Inscritos y ocupación por actividad</caption>
            <thead>
              <tr><th scope="col">Actividad</th><th scope="col">Fecha</th><th scope="col">Inscritos / cupo</th><th scope="col">Ocupación</th><th scope="col">Estado</th></tr>
            </thead>
            <tbody>
              {actividades.map((a) => (
                <tr key={a.id}>
                  <td>{a.titulo}{a.cancelados > 0 && <span className="d-block small text-muted">{a.cancelados} cancelación(es)</span>}</td>
                  <td>{formatearFecha(a.fecha)}</td>
                  <td>{a.inscritos} / {a.cupoMaximo}</td>
                  <td>
                    <div className="progress" role="progressbar" aria-label={`Ocupación ${a.titulo}`} aria-valuenow={a.ocupacionPct} aria-valuemin={0} aria-valuemax={100}>
                      <div className="progress-bar" style={{ width: `${a.ocupacionPct}%` }}>{a.ocupacionPct}%</div>
                    </div>
                  </td>
                  <td><span className={`panel-direccion__estado panel-direccion__estado--${a.estado}`}>{ESTADO_PARTICIPACION[a.estado]}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="small text-muted">Calculado en PostgreSQL al {formatearFechaHora(new Date().toISOString())}.</p>
    </>
  )
}
