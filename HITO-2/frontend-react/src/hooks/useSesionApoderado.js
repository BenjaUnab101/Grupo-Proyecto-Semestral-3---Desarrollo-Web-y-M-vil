import { useState } from 'react'

// Sesión del portal apoderados guardada solo en memoria de React (useState).
// Al no persistir en localStorage/sessionStorage/cookies, recargar la página
// equivale automáticamente a cerrar sesión: no requiere limpieza manual aparte.
export default function useSesionApoderado() {
  const [apoderado, setApoderado] = useState(null)
  const [alumnoSeleccionadoId, setAlumnoSeleccionadoId] = useState(null)

  const iniciarSesion = (apoderadoAutenticado) => {
    setApoderado(apoderadoAutenticado)
    const [primerAlumnoId] = apoderadoAutenticado.alumnoIds
    setAlumnoSeleccionadoId(primerAlumnoId ?? null)
  }

  const cerrarSesion = () => {
    setApoderado(null)
    setAlumnoSeleccionadoId(null)
  }

  const seleccionarAlumno = (alumnoId) => {
    if (!apoderado?.alumnoIds.includes(alumnoId)) return
    setAlumnoSeleccionadoId(alumnoId)
  }

  return { apoderado, alumnoSeleccionadoId, iniciarSesion, cerrarSesion, seleccionarAlumno }
}
