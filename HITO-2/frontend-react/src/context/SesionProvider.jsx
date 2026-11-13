import { useCallback, useState } from 'react'
import { SesionContexto } from './sesionContexto.js'
import { establecerToken } from '../services/http.js'
import { cerrarSesion as cerrarSesionApi, iniciarSesion as iniciarSesionApi } from '../services/auth.js'

// Sesión compartida por toda la página (HU-16).
// - Se inicia con correo + contraseña (POST /auth/login). El token queda solo en memoria
//   (services/http.js): al recargar la página se vuelve a visitante.
// - Cerrar sesión revoca el token en el servidor.
// - React solo decide qué mostrar; los permisos los revisa la API en cada petición (401/403).
// - También controla el modal "Portal familias", para que cualquier sección pueda pedir login.
export default function SesionProvider({ children }) {
  const [perfil, setPerfil] = useState(null)
  const [portalAbierto, setPortalAbierto] = useState(false)

  const olvidarSesion = () => {
    establecerToken(null)
    setPerfil(null)
  }

  // Lanza el ErrorApi si las credenciales no sirven (lo muestra el formulario de login).
  const iniciarSesion = async (email, password) => {
    const sesion = await iniciarSesionApi(email, password)
    establecerToken(sesion.token)
    setPerfil(sesion.perfil)
    return sesion.perfil
  }

  const cerrarSesion = async () => {
    try {
      await cerrarSesionApi()
    } catch {
      // Si el token ya venció o no hay conexión, igual se olvida en el navegador.
    }
    olvidarSesion()
  }

  // Si la API responde 401 (la sesión venció o fue revocada), se vuelve a visitante.
  const revisarError = (errorApi) => {
    if (errorApi?.estado === 401) olvidarSesion()
  }

  const abrirPortal = useCallback(() => setPortalAbierto(true), [])
  const cerrarPortal = useCallback(() => setPortalAbierto(false), [])

  const valor = {
    perfil,
    conToken: Boolean(perfil),
    esApoderado: Boolean(perfil?.apoderadoId),
    esEditor: Boolean(perfil?.esEditor),
    esDireccion: Boolean(perfil?.esDireccion),
    iniciarSesion,
    cerrarSesion,
    revisarError,
    portalAbierto,
    abrirPortal,
    cerrarPortal,
  }
  return <SesionContexto.Provider value={valor}>{children}</SesionContexto.Provider>
}