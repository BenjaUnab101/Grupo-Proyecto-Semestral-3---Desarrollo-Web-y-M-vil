import { useCallback, useState } from 'react'
import niveles from '../data/niveles.json'
import EstadoCarga from './EstadosApi.jsx'
import { useRecurso } from '../hooks/useRecurso.js'
import { useSesion } from '../context/sesionContexto.js'
import { ESTADOS, cambiarEstado, listarSolicitudes } from '../services/prematriculaApi.js'
import { mensajeDeError } from '../services/http.js'
import { formatearTelefono } from '../utils/validaciones.js'
import { formatearFechaHora } from '../utils/fechas.js'

// HU-25: dirección revisa las solicitudes de pre-matrícula y cambia su estado.
// La API solo lo permite a dirección (401/403 para el resto).
export default function PanelSolicitudes() {
  const { revisarError } = useSesion()
  const [filtro, setFiltro] = useState('')
  const [aviso, setAviso] = useState(null) // { exito: true|false, texto }

  const cargar = useCallback(() => listarSolicitudes(filtro), [filtro])
  const solicitudes = useRecurso(cargar)

  const guardar = async (solicitud, estado, mensaje) => {
    setAviso(null)
    try {
      await cambiarEstado(solicitud.id, estado, mensaje)
      setAviso({ exito: true, texto: `${solicitud.codigo}: estado actualizado a «${ESTADOS[estado]}».` })
    } catch (error) {
      revisarError(error)
      setAviso({ exito: false, texto: `${solicitud.codigo}: ${mensajeDeError(error)}` })
    }
    solicitudes.recargar()
  }

  return (
    <section id="panel-solicitudes" className="panel-solicitudes">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <h3 className="h5 mb-0">Solicitudes de pre-matrícula (dirección)</h3>
        <label className="d-flex align-items-center gap-2 small mb-0">
          Estado:
          <select className="form-select form-select-sm w-auto" value={filtro} onChange={(e) => setFiltro(e.target.value)}>
            <option value="">Todas</option>
            {Object.entries(ESTADOS).map(([valor, nombre]) => <option key={valor} value={valor}>{nombre}</option>)}
          </select>
        </label>
      </div>

      {aviso && (
        <p className={`alert py-2 ${aviso.exito ? 'alert-success' : 'alert-danger'}`} role={aviso.exito ? 'status' : 'alert'}>{aviso.texto}</p>
      )}

      <EstadoCarga
        recurso={solicitudes}
        textoCargando="Cargando solicitudes…"
        textoError="No pudimos cargar las solicitudes."
        textoVacio={filtro ? `No hay solicitudes en estado «${ESTADOS[filtro]}».` : 'Todavía no hay solicitudes.'}
      >
        <ul className="panel-solicitudes__lista">
          {solicitudes.datos?.map((s) => <TarjetaSolicitud key={`${s.id}-${s.estado}`} solicitud={s} onGuardar={guardar} />)}
        </ul>
      </EstadoCarga>
    </section>
  )
}

function TarjetaSolicitud({ solicitud, onGuardar }) {
  const [estado, setEstado] = useState(solicitud.estado)
  const [mensaje, setMensaje] = useState(solicitud.mensajeFamilia ?? '')
  const id = `solicitud-${solicitud.id}`

  return (
    <li className="solicitud">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
        <strong className="solicitud__codigo">{solicitud.codigo}</strong>
        <span className={`seguimiento__estado seguimiento__estado--${solicitud.estado}`}>{ESTADOS[solicitud.estado]}</span>
      </div>
      <p className="small mb-1"><strong>Apoderado:</strong> {solicitud.nombreApoderado} · RUT {solicitud.rut}</p>
      <p className="small mb-1"><strong>Contacto:</strong> {solicitud.correo} · {formatearTelefono(solicitud.telefono)}</p>
      <p className="small mb-1"><strong>Párvulo:</strong> {solicitud.nombreParvulo} · {niveles.find((n) => n.id === solicitud.nivel)?.nombre}</p>
      {solicitud.comentario && <p className="small mb-1"><strong>Comentario:</strong> {solicitud.comentario}</p>}
      <p className="small text-muted">Recibida: {formatearFechaHora(solicitud.creadaEn)}</p>

      <form className="solicitud__acciones" onSubmit={(e) => { e.preventDefault(); onGuardar(solicitud, estado, mensaje) }}>
        <label htmlFor={`${id}-estado`}>Estado</label>
        <select id={`${id}-estado`} className="form-select form-select-sm" value={estado} onChange={(e) => setEstado(e.target.value)}>
          {Object.entries(ESTADOS).map(([valor, nombre]) => <option key={valor} value={valor}>{nombre}</option>)}
        </select>
        <label htmlFor={`${id}-mensaje`}>Mensaje para la familia (opcional)</label>
        <textarea id={`${id}-mensaje`} className="form-control form-control-sm" rows={2} maxLength={300}
          value={mensaje} onChange={(e) => setMensaje(e.target.value)} />
        <button type="submit" className="btn btn-primary btn-sm">Guardar cambio</button>
      </form>
    </li>
  )
}