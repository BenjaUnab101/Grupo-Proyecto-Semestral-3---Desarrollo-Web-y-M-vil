import { useCallback, useState } from 'react'
import EstadoCarga from './EstadosApi.jsx'
import { useRecurso } from '../hooks/useRecurso.js'
import { TIPOS_EVENTO, obtenerBitacora } from '../services/panelApi.js'
import { formatearFechaHora } from '../utils/fechas.js'

const RESULTADOS = { exito: 'Éxito', fallido: 'Fallido', denegado: 'Denegado' }

// HU-22 (Sprint 3 · Daniel): bitácora de accesos y participación guardada en MongoDB.
// Solo dirección con sesión real. Los eventos tienen datos mínimos: ids internos y estados
// (sin correos, contraseñas, RUT ni nombres de niños).
export default function PanelAuditoria() {
  const [filtros, setFiltros] = useState({ tipo: '', resultado: '', desde: '', hasta: '' })
  const [pagina, setPagina] = useState(1)

  const cargar = useCallback(() => obtenerBitacora({ ...filtros, pagina }), [filtros, pagina])
  const bitacora = useRecurso(cargar)

  const cambiar = (campo) => (e) => {
    setPagina(1)
    setFiltros((f) => ({ ...f, [campo]: e.target.value }))
  }

  return (
    <section id="panel-auditoria" className="panel-direccion">
      <h3 className="h5">Bitácora de accesos y participación</h3>
      <div className="panel-direccion__filtros">
        <label>
          Tipo
          <select className="form-select form-select-sm" value={filtros.tipo} onChange={cambiar('tipo')}>
            <option value="">Todos</option>
            {Object.entries(TIPOS_EVENTO).map(([valor, nombre]) => <option key={valor} value={valor}>{nombre}</option>)}
          </select>
        </label>
        <label>
          Resultado
          <select className="form-select form-select-sm" value={filtros.resultado} onChange={cambiar('resultado')}>
            <option value="">Todos</option>
            {Object.entries(RESULTADOS).map(([valor, nombre]) => <option key={valor} value={valor}>{nombre}</option>)}
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
      </div>

      <EstadoCarga
        recurso={{ ...bitacora, datos: bitacora.datos?.items }}
        textoCargando="Cargando bitácora…"
        textoError="No pudimos cargar la bitácora."
        textoVacio="No hay eventos para estos filtros."
      >
        <p className="small text-muted mb-2">{bitacora.datos?.total} evento(s) en total.</p>
        <ListaEventos eventos={bitacora.datos?.items ?? []} />
        <Paginador pagina={pagina} paginas={bitacora.datos?.paginas ?? 1} onCambiar={setPagina} />
      </EstadoCarga>
    </section>
  )
}

export function ListaEventos({ eventos }) {
  return (
    <ul className="panel-direccion__eventos">
      {eventos.map((e) => (
        <li key={e.id}>
          <span className={`panel-direccion__resultado panel-direccion__resultado--${e.resultado}`}>{RESULTADOS[e.resultado]}</span>
          <strong>{TIPOS_EVENTO[e.tipo] ?? e.tipo}</strong>
          <span className="small text-muted">
            {formatearFechaHora(e.fecha)}
            {e.actorId ? ` · cuenta #${e.actorId}` : ' · sin cuenta'}
            {e.recurso?.tipo ? ` · ${e.recurso.tipo} #${e.recurso.id}` : ''}
            {e.datos?.estado_nuevo ? ` · ${e.datos.estado_anterior ?? '—'} → ${e.datos.estado_nuevo}` : ''}
          </span>
        </li>
      ))}
    </ul>
  )
}

export function Paginador({ pagina, paginas, onCambiar }) {
  if (paginas <= 1) return null
  return (
    <nav className="d-flex align-items-center gap-2 mt-2" aria-label="Páginas">
      <button type="button" className="btn btn-outline-secondary btn-sm" disabled={pagina <= 1} onClick={() => onCambiar(pagina - 1)}>Anterior</button>
      <span className="small">Página {pagina} de {paginas}</span>
      <button type="button" className="btn btn-outline-secondary btn-sm" disabled={pagina >= paginas} onClick={() => onCambiar(pagina + 1)}>Siguiente</button>
    </nav>
  )
}
