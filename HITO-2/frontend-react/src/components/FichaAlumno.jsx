import { formatearAsistencia, formatearAtrasos, hayAlertaAtrasos } from '../utils/ficha.js'
import { formatearFecha } from '../utils/fechas.js'

const ESTADO_INSCRIPCION = { inscrita: 'Inscrito', cancelada: 'Cancelada' }

// Ficha resumida del alumno seleccionado.
// HU-16 (Sprint 3 · Daniel): los datos vienen de la API (sala de la matrícula e inscripciones
// en PostgreSQL). Asistencia y atrasos todavía no existen en la base: se muestran como
// "Dato no disponible" con los mismos formateadores del Taller 2.
export default function FichaAlumno({ alumno }) {
  if (!alumno) {
    return <p className="text-muted">Dato no disponible</p>
  }

  const curso = alumno.sala ?? alumno.curso

  return (
    <div>
      <h5 className="mb-1">{alumno.nombre}</h5>
      <p className="text-muted mb-3">{curso ?? 'Sin matrícula vigente'}</p>

      <dl className="row mb-0">
        {alumno.nivel && (
          <>
            <dt className="col-sm-5">Nivel</dt>
            <dd className="col-sm-7">{alumno.nivel}</dd>
          </>
        )}
        {alumno.estadoMatricula && (
          <>
            <dt className="col-sm-5">Matrícula {alumno.anioEscolar}</dt>
            <dd className="col-sm-7 text-capitalize">{alumno.estadoMatricula}</dd>
          </>
        )}

        <dt className="col-sm-5">Asistencia</dt>
        <dd className="col-sm-7">{formatearAsistencia(alumno.asistencia)}</dd>

        <dt className="col-sm-5">Atrasos</dt>
        <dd className="col-sm-7">{formatearAtrasos(alumno.atrasos)}</dd>
      </dl>

      {hayAlertaAtrasos(alumno.atrasos) && (
        <div className="alert alert-warning py-2 mt-2" role="alert">
          Este alumno supera los 2 atrasos registrados.
        </div>
      )}

      {alumno.inscripciones && (
        <>
          <h6 className="mt-3">Actividades</h6>
          {alumno.inscripciones.length === 0 ? (
            <p className="text-muted small mb-0">Sin inscripciones a actividades.</p>
          ) : (
            <ul className="small mb-0">
              {alumno.inscripciones.map((i) => (
                <li key={i.actividadId}>
                  {i.titulo} · {formatearFecha(i.fecha)} · {ESTADO_INSCRIPCION[i.estado] ?? i.estado}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
