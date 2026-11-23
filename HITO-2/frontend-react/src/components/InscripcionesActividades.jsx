import { useEffect, useState } from 'react'
import { cancelarInscripcion, inscribir } from '../services/actividadesApi.js'
import {
  cancelarRecordatorio,
  enviarAvisoDePrueba,
  esAppAndroid,
  idsConRecordatorio,
  programarRecordatorio,
} from '../services/recordatorios.js'
import { mensajeDeError } from '../services/http.js'
import { useSesion } from '../context/sesionContexto.js'
import { formatearFecha } from '../utils/fechas.js'

// TEC-17 / HU-19: el apoderado inscribe o cancela a cada hijo en las actividades.
// Los cupos los controla la API: si otra familia tomó el último cupo responde 409, se
// muestra el motivo y se recargan los números (onCambio).
// HITO 4: dentro de la app Android, cada inscripción vigente puede tener un recordatorio en el
// teléfono (notificación local). En el navegador esos botones no aparecen.
export default function InscripcionesActividades({ actividades, inscripciones, onCambio }) {
  const { perfil, revisarError } = useSesion()
  const [ocupado, setOcupado] = useState(false)
  const [aviso, setAviso] = useState(null) // { exito: true|false, texto }
  const enApp = esAppAndroid()
  const [conRecordatorio, setConRecordatorio] = useState(() => new Set()) // ids de inscripción con aviso

  // Al abrir la sección, se consulta qué recordatorios ya están programados en este teléfono.
  useEffect(() => {
    if (!enApp) return
    let vigente = true
    idsConRecordatorio().then(
      (ids) => {
        if (vigente) setConRecordatorio(ids)
      },
      () => {}, // si el plugin falla, simplemente se muestran todos como "sin recordatorio"
    )
    return () => {
      vigente = false
    }
  }, [enApp])

  const alternarRecordatorio = async (actividad, hijo, inscripcion) => {
    setOcupado(true)
    setAviso(null)
    try {
      if (conRecordatorio.has(inscripcion.id)) {
        await cancelarRecordatorio(inscripcion.id)
        setAviso({ exito: true, texto: `Se quitó el recordatorio de «${actividad.titulo}».` })
      } else {
        const confirmacion = await programarRecordatorio({
          inscripcionId: inscripcion.id,
          titulo: actividad.titulo,
          hijo: hijo.nombre,
          fecha: actividad.fecha,
          hora: actividad.hora,
          lugar: actividad.lugar,
        })
        setAviso({ exito: true, texto: `Recordatorio listo para «${actividad.titulo}». ${confirmacion}` })
      }
      setConRecordatorio(await idsConRecordatorio())
    } catch (error) {
      setAviso({ exito: false, texto: error.message || 'No se pudo programar el recordatorio.' })
    }
    setOcupado(false)
  }

  const probarAviso = async () => {
    try {
      await enviarAvisoDePrueba()
      setAviso({ exito: true, texto: 'En 5 segundos llegará una notificación de prueba.' })
    } catch (error) {
      setAviso({ exito: false, texto: error.message || 'No se pudo enviar la notificación de prueba.' })
    }
  }

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
        // Sin inscripción no tiene sentido el aviso: se quita también del teléfono.
        if (conRecordatorio.has(inscripcion.id)) {
          await cancelarRecordatorio(inscripcion.id).catch(() => {})
          setConRecordatorio((ids) => new Set([...ids].filter((id) => id !== inscripcion.id)))
        }
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
      {enApp && (
        <div className="recordatorio-intro">
          <p className="small mb-0">🔔 Activa un recordatorio y el teléfono te avisará el día anterior a las 18:00.</p>
          <button type="button" className="btn btn-sm btn-link p-0" onClick={probarAviso}>
            Probar notificación
          </button>
        </div>
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
              const inscripcion = inscripcionDe(actividad, hijo)
              const inscrito = Boolean(inscripcion)
              const sinCupo = !inscrito && actividad.cuposDisponibles <= 0
              const tieneRecordatorio = inscrito && conRecordatorio.has(inscripcion.id)
              return (
                <div key={hijo.id} className="inscripciones__hijo">
                  <span>
                    {hijo.nombre}
                    {inscrito && <strong> · Inscrito/a</strong>}
                    {tieneRecordatorio && <span className="recordatorio-activo"> · 🔔 Recordatorio activo</span>}
                  </span>
                  <span className="inscripciones__acciones">
                    {enApp && inscrito && (
                      <button type="button" disabled={ocupado} onClick={() => alternarRecordatorio(actividad, hijo, inscripcion)}
                        className="btn btn-sm btn-outline-primary"
                        aria-label={`${tieneRecordatorio ? 'Quitar' : 'Activar'} recordatorio de ${actividad.titulo} para ${hijo.nombre}`}>
                        {tieneRecordatorio ? '🔕 Quitar aviso' : '🔔 Recordarme'}
                      </button>
                    )}
                    <button type="button" disabled={ocupado || sinCupo} onClick={() => cambiar(actividad, hijo)}
                      className={`btn btn-sm ${inscrito ? 'btn-outline-secondary' : 'btn-primary'}`}>
                      {inscrito ? 'Cancelar inscripción' : sinCupo ? 'Sin cupos' : 'Inscribir'}
                    </button>
                  </span>
                </div>
              )
            })}
          </li>
        ))}
      </ul>
    </>
  )
}