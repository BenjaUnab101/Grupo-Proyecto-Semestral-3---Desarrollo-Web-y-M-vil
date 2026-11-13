import { useState } from 'react'
import { cancelarInscripcion, inscribir } from '../services/actividadesApi.js'
import { mensajeDeError } from '../services/http.js'
import { useSesion } from '../context/sesionContexto.js'
import { formatearFecha } from '../utils/fechas.js'

// TEC-17 / HU-19: el apoderado inscribe o cancela a cada hijo en las actividades.
// Los cupos los controla la API: si otra familia tomó el último cupo responde 409, se
// muestra el motivo y se recargan los números (onCambio).
export default function InscripcionesActividades({ actividades, inscripciones, onCambio }) {
  const { perfil, revisarError } = useSesion()
  const [ocupado, setOcupado] = useState(false)
  const [aviso, setAviso] = useState(null) // { exito: true|false, texto }

  // Inscripción vigente de un hijo en una actividad (o undefined).
  const inscripcionDe = (actividad, hijo) =>
    inscripciones.find((i) => i.actividadId === actividad.id && i.alumnoId === hijo.id && i.estado === 'inscrita')

  const cambiar = async (actividad, hijo) => {
    const inscripcion = inscripcionDe(actividad, hijo)
    setOcupado(true)
    setAviso(null)
    try {
      if (inscripcion) {
        await cancelarInscripcion(inscripcion.id, perfil.apoderadoId)
        setAviso({ exito: true, texto: `Se canceló la inscripción de ${hijo.nombre} en «${actividad.titulo}».` })
      } else {
        await inscribir(actividad.id, hijo.id, perfil.apoderadoId)
        setAviso({ exito: true, texto: `${hijo.nombre} quedó inscrito/a en «${actividad.titulo}».` })
      }
    } catch (error) {
      revisarError(error)
      setAviso({ exito: false, texto: mensajeDeError(error) })
    }
    setOcupado(false)
    onCambio() // vuelve a pedir cupos e inscripciones (también tras un 409)
  }

  const abiertas = actividades.filter((a) => a.inscripcionesAbiertas)
  if (abiertas.length === 0) return <p className="estado-api estado-api--vacio" role="status">No hay actividades con inscripciones abiertas.</p>

  return (
    <>
      {aviso && (
        <p className={`alert py-2 ${aviso.exito ? 'alert-success' : 'alert-danger'}`} role={aviso.exito ? 'status' : 'alert'}>
          {aviso.texto}
        </p>
      )}
      <ul className="inscripciones">
        {abiertas.map((actividad) => (
          <li key={actividad.id} className="inscripciones__item">
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
              <h4 className="h6 mb-0">{actividad.titulo}</h4>
              <span className={`badge rounded-pill ${actividad.cuposDisponibles > 0 ? 'bg-success' : 'bg-danger'}`}>
                {actividad.cuposDisponibles > 0 ? `${actividad.cuposDisponibles} de ${actividad.cupoMaximo} cupos` : 'Sin cupos'}
              </span>
            </div>
            <p className="small text-muted mb-2">
              {formatearFecha(actividad.fecha)}{actividad.hora && ` · ${actividad.hora} h`}
            </p>

            {perfil.hijos.map((hijo) => {
              const inscrito = Boolean(inscripcionDe(actividad, hijo))
              const sinCupo = !inscrito && actividad.cuposDisponibles <= 0
              return (
                <div key={hijo.id} className="inscripciones__hijo">
                  <span>{hijo.nombre}{inscrito && <strong> · Inscrito/a</strong>}</span>
                  <button type="button" disabled={ocupado || sinCupo} onClick={() => cambiar(actividad, hijo)}
                    className={`btn btn-sm ${inscrito ? 'btn-outline-secondary' : 'btn-primary'}`}>
                    {inscrito ? 'Cancelar inscripción' : sinCupo ? 'Sin cupos' : 'Inscribir'}
                  </button>
                </div>
              )
            })}
          </li>
        ))}
      </ul>
    </>
  )
}