import { useCallback, useState } from 'react'
import { useSesion } from '../context/sesionContexto.js'
import { mensajeDeError } from '../services/http.js'
import { listarMisAlumnos, obtenerFicha } from '../services/auth.js'

// Hook del Portal de Apoderados: conecta PortalApoderados y LoginForm con SesionProvider y services/auth.js.
export default function useSesionApoderado() {
  const sesion = useSesion()
  const [errorLogin, setErrorLogin] = useState(null)
  const [enviando, setEnviando] = useState(false)

  const ingresar = useCallback(async (email, clave) => {
    if (!email?.trim() || !clave) {
      setErrorLogin('Ingresa tu correo y tu contraseña.')
      return false
    }
    setEnviando(true)
    setErrorLogin(null)
    try {
      await sesion.iniciarSesion(email.trim(), clave)
      return true
    } catch (errorApi) {
      setErrorLogin(
        errorApi?.estado === 401 || errorApi?.estado === 400
          ? 'Credenciales inválidas. Verifica tu correo y tu contraseña.'
          : mensajeDeError(errorApi)
      )
      return false
    } finally {
      setEnviando(false)
    }
  }, [sesion])

  const salir = useCallback(async () => {
    setErrorLogin(null)
    await sesion.cerrarSesion()
  }, [sesion])

  return {
    ...sesion,
    errorLogin,
    setErrorLogin,
    enviando,
    ingresar,
    salir,
    listarMisAlumnos,
    obtenerFicha,
  }
}