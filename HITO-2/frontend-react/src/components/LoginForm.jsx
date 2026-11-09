import { useState } from 'react'
import { useSesion } from '../context/sesionContexto.js'
import { mensajeDeError } from '../services/http.js'

// HU-16 (Sprint 3 · Daniel): formulario de acceso REAL. Envía email + contraseña a
// POST /auth/login; la contraseña se compara en el servidor contra un hash (nunca aquí).
// Reemplaza el acceso simulado del Taller 2 (SCRUM-62), conservando su diseño.
export default function LoginForm() {
  const { iniciarSesion } = useSesion()
  const [email, setEmail] = useState('')
  const [clave, setClave] = useState('')
  const [error, setError] = useState(null)
  const [enviando, setEnviando] = useState(false)

  const manejarSubmit = async (evento) => {
    evento.preventDefault()
    if (!email.trim() || !clave) {
      setError('Ingresa tu correo y tu contraseña.')
      return
    }
    setEnviando(true)
    setError(null)
    try {
      await iniciarSesion(email.trim(), clave)
    } catch (errorApi) {
      // Mensaje genérico: no se revela si el dato incorrecto fue el correo o la contraseña.
      setError(errorApi?.estado === 401 || errorApi?.estado === 400
        ? 'Credenciales inválidas. Verifica tu correo y tu contraseña.'
        : mensajeDeError(errorApi))
      setClave('')
    }
    setEnviando(false)
  }

  return (
    <form onSubmit={manejarSubmit} noValidate>
      <p className="text-muted small mb-3">
        Ingresa con la cuenta entregada por el jardín. En esta demostración las cuentas son ficticias (@ejemplo.cl).
      </p>

      <div className="mb-3">
        <label htmlFor="identificador" className="form-label">
          Correo
        </label>
        <input
          id="identificador"
          type="email"
          className="form-control"
          value={email}
          onChange={(evento) => setEmail(evento.target.value)}
          autoComplete="username"
          inputMode="email"
          required
        />
      </div>

      <div className="mb-3">
        <label htmlFor="clave" className="form-label">
          Contraseña
        </label>
        <input
          id="clave"
          type="password"
          className="form-control"
          value={clave}
          onChange={(evento) => setClave(evento.target.value)}
          autoComplete="current-password"
          required
        />
      </div>

      {error && (
        <div className="alert alert-danger py-2" role="alert">
          {error}
        </div>
      )}

      <button type="submit" className="btn-institucional-primary w-100" disabled={enviando} aria-busy={enviando}>
        {enviando ? 'Ingresando…' : 'Ingresar'}
      </button>
    </form>
  )
}
