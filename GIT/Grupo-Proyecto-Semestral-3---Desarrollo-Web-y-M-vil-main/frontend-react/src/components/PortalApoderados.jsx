import alumnos from '../data/alumnos.json'
import useSesionApoderado from '../hooks/useSesionApoderado.js'
import LoginForm from './LoginForm.jsx'
import SelectorHermanos from './SelectorHermanos.jsx'
import FichaAlumno from './FichaAlumno.jsx'
import AvisoPrivacidad from './AvisoPrivacidad.jsx'

// Orquesta el flujo completo del portal apoderados: login simulado, selección de
// hermanos y ficha del alumno. Todo el estado vive en useSesionApoderado (solo memoria).
export default function PortalApoderados({ onCerrar }) {
  const { apoderado, alumnoSeleccionadoId, iniciarSesion, cerrarSesion, seleccionarAlumno } = useSesionApoderado()

  const manejarLogout = () => {
    cerrarSesion()
    onCerrar()
  }

  if (!apoderado) {
    return <LoginForm onLoginExitoso={iniciarSesion} />
  }

  const alumnosDelApoderado = alumnos.filter((alumno) => apoderado.alumnoIds.includes(alumno.id))
  const alumnoSeleccionado = alumnosDelApoderado.find((alumno) => alumno.id === alumnoSeleccionadoId) ?? null

  return (
    <div>
      <div className="d-flex justify-content-between align-items-start mb-3">
        <p className="mb-0">
          Hola, <strong>{apoderado.nombre}</strong>
        </p>
        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={manejarLogout}>
          Cerrar sesión
        </button>
      </div>

      {alumnosDelApoderado.length === 0 ? (
        <p className="text-muted">Esta cuenta demo no tiene alumnos asociados.</p>
      ) : (
        <>
          <SelectorHermanos
            alumnos={alumnosDelApoderado}
            alumnoSeleccionadoId={alumnoSeleccionadoId}
            onSeleccionar={seleccionarAlumno}
          />
          <FichaAlumno alumno={alumnoSeleccionado} />
        </>
      )}

      <hr />
      <AvisoPrivacidad />
    </div>
  )
}
