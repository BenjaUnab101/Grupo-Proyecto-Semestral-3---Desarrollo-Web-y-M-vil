import { useState } from 'react'

// Sesión del portal apoderados guardada solo en memoria de React (useState).
// Al no persistir en localStorage/sessionStorage/cookies, recargar la página
// equivale automáticamente a cerrar sesión: no requiere limpieza manual aparte.
export default function useSesionApoderado() {
  const [apoderado, setApoderado] = useState(null)

  const iniciarSesion = (apoderadoAutenticado) => {
    setApoderado(apoderadoAutenticado)
  }

  return { apoderado, iniciarSesion }
}
