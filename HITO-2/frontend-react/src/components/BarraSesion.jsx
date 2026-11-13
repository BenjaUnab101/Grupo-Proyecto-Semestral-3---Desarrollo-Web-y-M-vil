import { useSesion } from '../context/sesionContexto.js'
import { ETIQUETA_ROL } from '../services/auth.js'

// Franja bajo el menú que muestra con qué cuenta se navega. Sin sesión no se muestra.
export default function BarraSesion() {
  const { perfil, cerrarSesion, abrirPortal } = useSesion()
  if (!perfil) return null

  return (
    <div className="barra-sesion" role="region" aria-label="Sesión iniciada">
      <div className="container d-flex flex-wrap align-items-center gap-2 py-2">
        <span>
          Sesión iniciada: <strong>{perfil.nombre}</strong> · {ETIQUETA_ROL[perfil.rol]}
        </span>
        <button type="button" className="btn btn-link btn-sm p-0" onClick={abrirPortal}>
          {perfil.rol === 'apoderado' ? 'Ver mi portal' : 'Mis herramientas'}
        </button>
        <button type="button" className="btn btn-outline-secondary btn-sm ms-auto" onClick={cerrarSesion}>
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}