import { useCallback, useState } from 'react'
import { SesionContexto } from './sesionContexto.js'
import { establecerToken } from '../services/http.js'
import { obtenerPerfil } from '../services/sesionApi.js'
import {
  cerrarSesion as cerrarSesionApi,
  iniciarSesion as iniciarSesionApi,
} from '../services/authApi.js'

// TEC-17 + HU-16: Proveedor unificado de sesión en memoria.
// - Soporta sesión real con token Bearer (POST /auth/login y POST /auth/logout).
// - Mantiene compatibilidad con elegirCuenta (GET /sesion/yo), control del modal del portal
//   y sincronización de catálogos entre paneles.
// - El token vive solo en memoria (services/http.js), nunca en localStorage ni cookies.
export default function SesionProvider({ children }) {
  const [perfil, setPerfil] = useState(null)
  const [error, setError] = useState(null)
  const [conToken, setConToken] = useState(false)
  const [portalAbierto, setPortalAbierto] = useState(false)
  const [actualizacionCatalogo, setActualizacionCatalogo] = useState(0)

  const abrirPortal = useCallback(() => setPortalAbierto(true), [])
  const cerrarPortal = useCallback(() => setPortalAbierto(false), [])
  const notificarCambioCatalogo = useCallback(() => setActualizacionCatalogo((v) => v + 1), [])

  const olvidarToken = useCallback(() => {
    establecerToken(null)
    setConToken(false)
  }, [])

  const cerrarSesion = useCallback(async () => {
    try {
      await cerrarSesionApi()
    } catch {
      // Si el token ya venció o no hay conexión, igual se olvida en el navegador.
    }
    olvidarToken()
    setPerfil(null)
  }, [olvidarToken])

  const elegirCuenta = useCallback(async (usuarioId) => {
    setError(null)
    if (conToken) await cerrarSesion()
    if (!usuarioId) return setPerfil(null)
    try {
      setPerfil(await obtenerPerfil(usuarioId))
    } catch (errorPerfil) {
      setPerfil(null)
      setError(errorPerfil)
    }
  }, [conToken, cerrarSesion])

  const iniciarSesion = useCallback(async (email, password) => {
    setError(null)
    const sesion = await iniciarSesionApi(email, password)
    establecerToken(sesion.token)
    setConToken(true)
    setPerfil(sesion.perfil)
    return sesion.perfil
  }, [])

  const revisarError = useCallback((errorApi) => {
    if (errorApi?.estado === 401) {
      olvidarToken()
      setPerfil(null)
    }
  }, [olvidarToken])

  const valor = {
    perfil,
    usuarioId: perfil?.usuarioId,
    esApoderado: Boolean(perfil?.apoderadoId),
    esEditor: Boolean(perfil?.esEditor),
    esDireccion: Boolean(perfil?.esDireccion),
    conToken,
    error,
    portalAbierto,
    abrirPortal,
    cerrarPortal,
    actualizacionCatalogo,
    notificarCambioCatalogo,
    elegirCuenta,
    iniciarSesion,
    cerrarSesion,
    revisarError,
  }

  return <SesionContexto.Provider value={valor}>{children}</SesionContexto.Provider>
}