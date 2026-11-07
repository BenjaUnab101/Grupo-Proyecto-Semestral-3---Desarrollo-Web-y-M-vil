import { useState } from 'react'
import { SesionContexto } from './sesionContexto.js'
import { obtenerPerfil } from '../services/sesionApi.js'

// TEC-17: cuenta DEMO elegida en la barra "Ver el portal como".
// - Sin cuenta = visitante. Al elegir una, se pide su perfil a GET /sesion/yo.
// - Vive solo en memoria: al recargar la página se vuelve a visitante.
// - La cuenta no da permisos por sí sola: el backend revisa cada acción (401/403).
export default function SesionProvider({ children }) {
  const [perfil, setPerfil] = useState(null)
  const [error, setError] = useState(null)

  const elegirCuenta = async (usuarioId) => {
    setError(null)
    if (!usuarioId) return setPerfil(null)
    try {
      setPerfil(await obtenerPerfil(usuarioId))
    } catch (errorPerfil) {
      setPerfil(null)
      setError(errorPerfil)
    }
  }

  // Si la API responde 401 (la cuenta ya no es válida), se vuelve a visitante.
  const revisarError = (errorApi) => {
    if (errorApi?.estado === 401) setPerfil(null)
  }

  const valor = {
    perfil,
    usuarioId: perfil?.usuarioId,
    esApoderado: Boolean(perfil?.apoderadoId),
    esEditor: Boolean(perfil?.esEditor),
    error,
    elegirCuenta,
    revisarError,
  }
  return <SesionContexto.Provider value={valor}>{children}</SesionContexto.Provider>
}
