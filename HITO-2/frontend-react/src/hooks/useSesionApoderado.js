import { useState } from 'react'
import { useSesion } from '../context/sesionContexto.js'
import { mensajeDeError } from '../services/http.js'

// "Sesión apoderado" del diagrama de arquitectura: une el Portal de apoderados con el
// servicio de autenticación (services/auth.js, a través de SesionProvider).
//   const { perfil, autenticado, ingresar, salir, enviando, error } = useSesionApoderado()
export function useSesionApoderado() {
  const sesion = useSesion()
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)

  // Devuelve true si inició sesión. Los errores quedan en `error` para el formulario.
  const ingresar = async (email, clave) => {
    const correo = email.trim().toLowerCase()
    if (!correo || !clave) {
      setError('Ingresa tu correo y tu contraseña.')
      return false
    }
    setEnviando(true)
    setError(null)
    try {
      await sesion.iniciarSesion(correo, clave)
      return true
    } catch (errorApi) {
      // Mensaje genérico: no se revela si el dato incorrecto fue el correo o la contraseña.
      setError(errorApi?.estado === 401 || errorApi?.estado === 400
        ? 'Credenciales inválidas. Verifica tu correo y tu contraseña.'
        : mensajeDeError(errorApi))
      return false
    } finally {
      setEnviando(false)
    }
  }

  const salir = async () => {
    await sesion.cerrarSesion()
  }

  return {
    perfil: sesion.perfil,
    autenticado: sesion.conToken,
    esApoderado: sesion.esApoderado,
    ingresar,
    salir,
    enviando,
    error,
  }
}