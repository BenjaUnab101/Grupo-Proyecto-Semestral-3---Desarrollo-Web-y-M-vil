import { useCallback, useState } from 'react'
import EstadoCarga from './EstadosApi.jsx'
import { useRecurso } from '../hooks/useRecurso.js'
import { useSesion } from '../context/sesionContexto.js'
import { ESTADOS_CONTACTO, cambiarEstadoConsulta, listarConsultas } from '../services/contactoApi.js'
import { mensajeDeError } from '../services/http.js'
import { formatearTelefono } from '../utils/validaciones.js'
import { formatearFechaHora } from '../utils/fechas.js'

// HU-26 (Sprint 3 · Daniel): dirección revisa las consultas y cambia su estado de atención.
// La API solo lo permite a dirección con sesión real (401/403 para el resto).
// Mismo diseño que el panel de pre-matrículas de HU-25.
export default function PanelContacto() {
  const { revisarError } = useSesion()
  const [filtro, setFiltro] = useState('')
  const [aviso, setAviso] = useState(null) // { exito, texto }

  const cargar = useCallback(() => listarConsultas(filtro), [filtro])
  const consultas = useRecurso(cargar)

  const guardar = async (consulta, estado, respuesta) => {
    setAviso(null)
    try {
      await cambiarEstadoConsulta(consulta.id, estado, respuesta)
      setAviso({ exito: true, texto: `${consulta.codigo}: estado actualizado a «${ESTADOS_CONTACTO[estado]}».` })
    } catch (error) {
      revisarError(error)
      setAviso({ exito: false, texto: `${consulta.codigo}: ${mensajeDeError(error)}` })
    }
    consultas.recargar()
  }

  return (
    <section id="panel-contacto" className="panel-solicitudes">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <h3 className="h5 mb-0">Consultas de familias (dirección)</h3>
        <label className="d-flex align-items-center gap-2 small mb-0">
          Estado:
          <select className="form-select form-select-sm w-auto" value={filtro} onChange={(e) => setFiltro(e.target.value)}>
            <option value="">Todas</option>
            {Object.entries(ESTADOS_CONTACTO).map(([valor, nombre]) => <option key={valor} value={valor}>{nombre}</option>)}
          </select>
        </label>
      </div>

      {aviso && (
        <p className={`alert py-2 ${aviso.exito ? 'alert-success' : 'alert-danger'}`} role={aviso.exito ? 'status' : 'alert'}>{aviso.texto}</p>
      )}

      <EstadoCarga
        recurso={consultas}
        textoCargando="Cargando consultas…"
        textoError="No pudimos cargar las consultas."
        textoVacio={filtro ? `No hay consultas en estado «${ESTADOS_CONTACTO[filtro]}».` : 'Todavía no hay consultas.'}
      >
        <ul className="panel-solicitudes__lista">
          {consultas.datos?.map((c) => <TarjetaConsulta key={`${c.id}-${c.estado}`} consulta={c} onGuardar={guardar} />)}
        </ul>
      </EstadoCarga>
    </section>
  )
}

function TarjetaConsulta({ consulta, onGuardar }) {
  const [estado, setEstado] = useState(consulta.estado)
  const [respuesta, setRespuesta] = useState(consulta.respuesta ?? '')
  const id = `consulta-${consulta.id}`
  const cerrada = consulta.estado === 'cerrado'

  return (
    <li className="solicitud">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
        <strong className="solicitud__codigo">{consulta.codigo}</strong>
        <span className={`seguimiento__estado contacto__estado--${consulta.estado}`}>{ESTADOS_CONTACTO[consulta.estado]}</span>
      </div>
      <p className="small mb-1"><strong>Asunto:</strong> {consulta.asunto}</p>
      <p className="small mb-1"><strong>De:</strong> {consulta.nombre} · {consulta.correo} · {formatearTelefono(consulta.telefono)}</p>
      <p className="small mb-1 contacto__mensaje">{consulta.mensaje}</p>
      <p className="small text-muted">Recibida: {formatearFechaHora(consulta.creadaEn)}</p>

      {cerrada ? (
        <p className="small mb-0"><strong>Respuesta:</strong> {consulta.respuesta ?? '—'}</p>
      ) : (
        <form className="solicitud__acciones" onSubmit={(e) => { e.preventDefault(); onGuardar(consulta, estado, respuesta) }}>
          <label htmlFor={`${id}-estado`}>Estado</label>
          <select id={`${id}-estado`} className="form-select form-select-sm" value={estado} onChange={(e) => setEstado(e.target.value)}>
            {Object.entries(ESTADOS_CONTACTO).map(([valor, nombre]) => <option key={valor} value={valor}>{nombre}</option>)}
          </select>
          <label htmlFor={`${id}-respuesta`}>Respuesta para la familia (opcional)</label>
          <textarea id={`${id}-respuesta`} className="form-control form-control-sm" rows={2} maxLength={500}
            value={respuesta} onChange={(e) => setRespuesta(e.target.value)} />
          <button type="submit" className="btn btn-primary btn-sm">Guardar cambio</button>
        </form>
      )}
    </li>
  )
}
