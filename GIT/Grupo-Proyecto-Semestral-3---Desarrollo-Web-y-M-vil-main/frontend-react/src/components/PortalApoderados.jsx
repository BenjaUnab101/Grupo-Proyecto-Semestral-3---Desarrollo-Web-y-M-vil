import useSesionApoderado from '../hooks/useSesionApoderado.js'
import LoginForm from './LoginForm.jsx'

// Orquesta el flujo del portal apoderados. El estado de sesión vive en
// useSesionApoderado (solo memoria, sin backend real).
export default function PortalApoderados() {
  const { apoderado, iniciarSesion } = useSesionApoderado()

  if (!apoderado) {
    return <LoginForm onLoginExitoso={iniciarSesion} />
  }

  return (
    <p className="mb-0">
      Hola, <strong>{apoderado.nombre}</strong>
    </p>
  )
}
