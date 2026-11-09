import { useState } from 'react'
import { SesionContexto } from './sesionContexto.js'
import { obtenerPerfil } from '../services/sesionApi.js'
import { establecerToken } from '../services/http.js'
import { cerrarSesion as cerrarSesionApi, iniciarSesion as iniciarSesionApi } from '../services/authApi.js'

// TEC-17: cuenta DEMO elegida en la barra "Ver el portal como".
// - Sin cuenta = visitante. Al elegir una, se pide su perfil a GET /sesion/yo.
// - Vive solo en memoria: al recargar la página se vuelve a visitante.
// - La cuenta no da permisos por sí sola: el backend revisa cada acción (401/403).
//
// HU-16 (Sprint 3 · Daniel): además, sesión REAL con email + contraseña (POST /auth/login).
// El token queda solo en memoria (services/http.js) y viaja en Authorization. Cerrar sesión
// lo revoca en el servidor. Elegir una cuenta demo cierra primero la sesión real.
export default function SesionProvider({ children }) {
  const [perfil, setPerfil] = useState(null)
  const [error, setError] = useState(null)
  const [conToken, setConToken] = useState(false) // true = sesión real (no demo)

  const olvidarToken = () => {
    establecerToken(null)
    setConToken(false)
  }

  const elegirCuenta = async (usuarioId) => {
    setError(null)
    if (conToken) await cerrarSesion()
    if (!usuarioId) return setPerfil(null)
    try {
      setPerfil(await obtenerPerfil(usuarioId))
    } catch (errorPerfil) {
      setPerfil(null)
      setError(errorPerfil)
    }
  }

  // Lanza el ErrorApi si las credenciales no sirven (lo muestra el formulario de login).
  const iniciarSesion = async (email, password) => {
    setError(null)
    const sesion = await iniciarSesionApi(email, password)
    establecerToken(sesion.token)
    setConToken(true)
    setPerfil(sesion.perfil)
    return sesion.perfil
  }

  const cerrarSesion = async () => {
    try {
      await cerrarSesionApi()
    } catch {
      // Si el token ya venció o no hay conexión, igual se olvida en el navegador.
    }
    olvidarToken()
    setPerfil(null)
  }

  // Si la API responde 401 (la cuenta o la sesión ya no es válida), se vuelve a visitante.
  const revisarError = (errorApi) => {
    if (errorApi?.estado === 401) {
      olvidarToken()
      setPerfil(null)
    }
  }

  const valor = {
    perfil,
    usuarioId: perfil?.usuarioId,
    esApoderado: Boolean(perfil?.apoderadoId),
    esEditor: Boolean(perfil?.esEditor),
    esDireccion: Boolean(perfil?.esDireccion),
    conToken,
    error,
    elegirCuenta,
    iniciarSesion,
    cerrarSesion,
    revisarError,
  }
  return <SesionContexto.Provider value={valor}>{children}</SesionContexto.Provider>
}
