import { formatearAsistencia, formatearAtrasos, hayAlertaAtrasos } from '../utils/ficha.js'

// Ficha resumida del alumno seleccionado (datos demo).
export default function FichaAlumno({ alumno }) {
  if (!alumno) {
    return <p className="text-muted">Dato no disponible</p>
  }

  return (
    <div>
      <h5 className="mb-1">{alumno.nombre}</h5>
      <p className="text-muted mb-3">{alumno.curso}</p>

      <dl className="row mb-0">
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
    </div>
  )
}
