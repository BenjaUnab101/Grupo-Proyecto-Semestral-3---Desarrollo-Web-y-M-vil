// Selector de hermanos: solo se muestra cuando hay más de un alumno asociado.
export default function SelectorHermanos({ alumnos, alumnoSeleccionadoId, onSeleccionar }) {
  if (alumnos.length <= 1) return null

  return (
    <div className="btn-group mb-3 flex-wrap" role="group" aria-label="Selector de hijos">
      {alumnos.map((alumno) => (
        <button
          key={alumno.id}
          type="button"
          className={`btn ${alumno.id === alumnoSeleccionadoId ? 'btn-institucional-primary' : 'btn-outline-secondary'}`}
          aria-pressed={alumno.id === alumnoSeleccionadoId}
          onClick={() => onSeleccionar(alumno.id)}
        >
          {alumno.nombre}
        </button>
      ))}
    </div>
  )
}
