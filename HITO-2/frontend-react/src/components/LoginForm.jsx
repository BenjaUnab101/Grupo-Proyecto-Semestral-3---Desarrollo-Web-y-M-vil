import { useState } from 'react'
import { useSesionApoderado } from '../hooks/useSesionApoderado.js'
import { useRecurso } from '../hooks/useRecurso.js'
import { ETIQUETA_ROL, listarCuentasPrueba } from '../services/auth.js'

// HU-16: formulario de acceso. Envía correo + contraseña a POST /auth/login; la contraseña se
// compara en el servidor contra un hash (nunca aquí).
export default function LoginForm() {
  const { ingresar, enviando, error } = useSesionApoderado()
  const [email, setEmail] = useState('')
  const [clave, setClave] = useState('')

  const manejarSubmit = async (evento) => {
    evento.preventDefault()
    const ok = await ingresar(email, clave)
    if (!ok) setClave('')
  }

  return (
    <>
      <form onSubmit={manejarSubmit} noValidate>
        <p className="text-muted small mb-3">Ingresa con la cuenta entregada por el jardín.</p>

        <div className="mb-3">
          <label htmlFor="login-email" className="form-label">Correo</label>
          <input
            id="login-email"
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
          <label htmlFor="login-clave" className="form-label">Contraseña</label>
          <input
            id="login-clave"
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

      <CuentasDePrueba onElegir={setEmail} />
    </>
  )
}

// Solo en development/test la API entrega las cuentas ficticias (@ejemplo.cl). En producción
// responde 404 y este bloque no aparece.
function CuentasDePrueba({ onElegir }) {
  const recurso = useRecurso(listarCuentasPrueba)
  if (!recurso.datos || recurso.datos.cuentas.length === 0) return null
  const { claveConfigurada, cuentas } = recurso.datos

  return (
    <div className="cuentas-prueba mt-4 p-3 rounded-3 bg-light border small">
      <p className="fw-semibold mb-2">Cuentas de prueba (datos ficticios)</p>
      {claveConfigurada ? (
        <p className="text-muted mb-2">
          Contraseña: la definida en <code>DEMO_PASSWORD</code> del archivo <code>.env</code> del backend
          (por defecto <code>PequenosReyes2026</code>). Toca una cuenta para completar el correo.
        </p>
      ) : (
        <p className="text-danger mb-2" role="alert">
          Falta <code>DEMO_PASSWORD</code> en el <code>.env</code> del backend: estas cuentas aún no tienen
          contraseña. Defínela y reinicia la API.
        </p>
      )}
      <ul className="list-unstyled mb-0 d-grid gap-1">
        {cuentas.map((c) => (
          <li key={c.email}>
            <button type="button" className="btn btn-sm btn-outline-secondary w-100 text-start" onClick={() => onElegir(c.email)}>
              <strong>{ETIQUETA_ROL[c.rol]}</strong> · {c.nombre}
              <span className="d-block text-muted">{c.email}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}