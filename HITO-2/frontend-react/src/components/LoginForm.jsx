import { useState } from 'react'
import { autenticar } from '../services/auth.js'

// Formulario de acceso simulado del portal apoderados (sin backend real).
export default function LoginForm({ onLoginExitoso }) {
  const [identificador, setIdentificador] = useState('')
  const [clave, setClave] = useState('')
  const [error, setError] = useState(null)

  const manejarSubmit = (evento) => {
    evento.preventDefault()

    const apoderado = autenticar(identificador, clave)
    if (!apoderado) {
      // Mensaje genérico: no se revela si el dato incorrecto fue el identificador o la clave.
      setError('Credenciales inválidas. Verifica tu RUT o correo y tu contraseña.')
      return
    }

    setError(null)
    onLoginExitoso(apoderado)
  }

  return (
    <form onSubmit={manejarSubmit}>
      <p className="text-muted small mb-3">
        Acceso simulado con credenciales demo (sin conexión a un sistema real).
      </p>

      <div className="mb-3">
        <label htmlFor="identificador" className="form-label">
          RUT o correo
        </label>
        <input
          id="identificador"
          type="text"
          className="form-control"
          value={identificador}
          onChange={(evento) => setIdentificador(evento.target.value)}
          autoComplete="username"
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

      <button type="submit" className="btn-institucional-primary w-100">
        Ingresar
      </button>
    </form>
  )
}
