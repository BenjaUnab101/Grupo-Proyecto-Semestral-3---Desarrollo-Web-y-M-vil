import { useCallback, useState } from 'react'
import { useSesion } from '../context/sesionContexto.js'
import { useRecurso } from '../hooks/useRecurso.js'
import { listarMisAlumnos, obtenerFicha } from '../services/authApi.js'
import { ETIQUETA_ROL } from '../services/sesionApi.js'
import EstadoCarga from './EstadosApi.jsx'
import LoginForm from './LoginForm.jsx'
import SelectorHermanos from './SelectorHermanos.jsx'
import FichaAlumno from './FichaAlumno.jsx'
import AvisoPrivacidad from './AvisoPrivacidad.jsx'

// HU-16 (Sprint 3 · Daniel): portal de familias con login REAL.
// - Sin sesión real: formulario de acceso (POST /auth/login).
// - Con sesión de apoderado: hijos desde la relación SQL (GET /portal/alumnos) y ficha del
//   elegido (GET /portal/alumnos/{id}). El backend responde 403 si el alumno no es suyo.
// - "Cerrar sesión" revoca el token en el servidor (POST /auth/logout).
export default function PortalApoderados({ onCerrar }) {
  const { perfil, conToken, cerrarSesion } = useSesion()

  const manejarLogout = async () => {
    await cerrarSesion()
    onCerrar()
  }

  if (!conToken || !perfil) {
    return <LoginForm />
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-start mb-3">
        <p className="mb-0">
          Hola, <strong>{perfil.nombre}</strong>
          <span className="d-block small text-muted">{ETIQUETA_ROL[perfil.rol]}</span>
        </p>
        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={manejarLogout}>
          Cerrar sesión
        </button>
      </div>

      {perfil.rol === 'apoderado' ? (
        <HijosDelApoderado />
      ) : (
        <p className="text-muted">
          Iniciaste sesión con una cuenta del jardín. Las fichas de alumnos son solo para apoderados; tus paneles
          aparecen en la página principal.
        </p>
      )}

      <hr />
      <AvisoPrivacidad />
    </div>
  )
}

function HijosDelApoderado() {
  const alumnos = useRecurso(listarMisAlumnos)
  const [elegidoId, setElegidoId] = useState(null)
  const lista = alumnos.datos ?? []
  // Sin elección (o si el elegido ya no está), se muestra el primer hijo.
  const seleccionadoId = lista.some((a) => a.id === elegidoId) ? elegidoId : lista[0]?.id ?? null

  return (
    <EstadoCarga
      recurso={alumnos}
      textoCargando="Cargando a tus hijos…"
      textoError="No pudimos cargar a tus hijos."
      textoVacio="Tu cuenta no tiene alumnos asociados. Si es un error, contacta a la dirección."
    >
      <SelectorHermanos alumnos={lista} alumnoSeleccionadoId={seleccionadoId} onSeleccionar={setElegidoId} />
      {seleccionadoId && <FichaDelAlumno key={seleccionadoId} alumnoId={seleccionadoId} />}
    </EstadoCarga>
  )
}

function FichaDelAlumno({ alumnoId }) {
  const cargar = useCallback(() => obtenerFicha(alumnoId), [alumnoId])
  const ficha = useRecurso(cargar)
  return (
    <EstadoCarga recurso={ficha} textoCargando="Cargando ficha…" textoError="No pudimos cargar la ficha.">
      <FichaAlumno alumno={ficha.datos} />
    </EstadoCarga>
  )
}
