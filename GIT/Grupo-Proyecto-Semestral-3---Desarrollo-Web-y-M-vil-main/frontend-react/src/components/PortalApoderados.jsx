import alumnos from '../data/alumnos.json'
import useSesionApoderado from '../hooks/useSesionApoderado.js'
import LoginForm from './LoginForm.jsx'
import SelectorHermanos from './SelectorHermanos.jsx'

// Orquesta el flujo del portal apoderados. El estado de sesión vive en
// useSesionApoderado (solo memoria, sin backend real).
export default function PortalApoderados() {
  const { apoderado, alumnoSeleccionadoId, iniciarSesion, seleccionarAlumno } = useSesionApoderado()

  if (!apoderado) {
    return <LoginForm onLoginExitoso={iniciarSesion} />
  }

  const alumnosDelApoderado = alumnos.filter((alumno) => apoderado.alumnoIds.includes(alumno.id))
  const alumnoSeleccionado = alumnosDelApoderado.find((alumno) => alumno.id === alumnoSeleccionadoId) ?? null

  return (
    <div>
      <p className="mb-3">
        Hola, <strong>{apoderado.nombre}</strong>
      </p>

      {alumnosDelApoderado.length === 0 ? (
        <p className="text-muted">Esta cuenta demo no tiene alumnos asociados.</p>
      ) : (
        <>
          <SelectorHermanos
            alumnos={alumnosDelApoderado}
            alumnoSeleccionadoId={alumnoSeleccionadoId}
            onSeleccionar={seleccionarAlumno}
          />
          <p className="mb-0">
            Alumno seleccionado: <strong>{alumnoSeleccionado?.nombre ?? 'Ninguno'}</strong>
          </p>
        </>
      )}
    </div>
  )
}
