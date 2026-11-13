import { useEffect, useState } from 'react'
import useSesionApoderado from '../hooks/useSesionApoderado.js'
import { listarCuentasPrueba } from '../services/authApi.js'
import { ETIQUETA_ROL } from '../services/sesionApi.js'
import { mensajeDeError } from '../services/http.js'

// HU-16 (Sprint 3 · Daniel): formulario de acceso REAL. Envía email + contraseña a
// POST /auth/login; la contraseña se compara en el servidor contra un hash (nunca aquí).
// En development/test consulta GET /auth/cuentas-prueba para autocompletar el correo con un clic.
export default function LoginForm() {
  const { iniciarSesion } = useSesionApoderado()
  const [cuentas, setCuentas] = useState([])
  const [email, setEmail] = useState('')
  const [clave, setClave] = useState('')
  const [error, setError] = useState(null)
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    let vigente = true
    listarCuentasPrueba()
      .then((lista) => {
        if (vigente) setCuentas(lista)
      })
      .catch(() => {
        // En producción o si la ruta responde 404, no se muestran botones de prueba.
      })
    return () => {
      vigente = false
    }
  }, [])

  const elegirCorreo = (correo) => {
    setEmail(correo)
    setError(null)
  }

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
      setError(
        errorApi?.estado === 401 || errorApi?.estado === 400
          ? 'Credenciales inválidas. Verifica tu correo y tu contraseña.'
          : mensajeDeError(errorApi)
      )
      setClave('')
    }
    setEnviando(false)
  }

  return (
    <form onSubmit={manejarSubmit} noValidate>
      <p className="text-muted small mb-3">
        Ingresa con la cuenta entregada por el jardín. En esta demostración las cuentas son ficticias (@ejemplo.cl).
      </p>

      {cuentas.length > 0 && (
        <div className="alert alert-info py-2 px-3 small mb-3">
          <strong className="d-block mb-1">Cuentas de prueba (clic para completar el correo):</strong>
          <div className="d-flex flex-wrap gap-1">
            {cuentas.map((c) => (
              <button
                key={c.email}
                type="button"
                className="btn btn-sm btn-outline-primary py-0 px-2"
                onClick={() => elegirCorreo(c.email)}
              >
                {ETIQUETA_ROL[c.rol] ?? c.rol} · {c.nombre}
              </button>
            ))}
          </div>
        </div>
      )}

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