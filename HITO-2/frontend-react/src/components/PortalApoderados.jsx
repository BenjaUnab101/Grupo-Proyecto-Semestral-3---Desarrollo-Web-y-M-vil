import { useCallback, useState } from 'react'
import useSesionApoderado from '../hooks/useSesionApoderado.js'
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
// - Personal / Dirección: ve accesos directos a sus herramientas de gestión en la página.
export default function PortalApoderados({ onCerrar }) {
  const { perfil, conToken, cerrarSesion } = useSesionApoderado()

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
        <div>
          <p className="text-muted small mb-2">
            Iniciaste sesión con una cuenta del jardín. Las fichas de alumnos son exclusivas para apoderados; usa estos accesos para ir a tus herramientas:
          </p>
          <div className="d-flex flex-wrap gap-2">
            <a href="#comunicados" className="btn btn-outline-primary btn-sm" onClick={onCerrar}>
              Publicar comunicados
            </a>
            <a href="#gestion-actividades" className="btn btn-outline-primary btn-sm" onClick={onCerrar}>
              Gestionar actividades
            </a>
            {perfil.rol === 'administrador' && (
              <>
                <a href="#gestion-organizadores" className="btn btn-outline-primary btn-sm" onClick={onCerrar}>
                  Organizadores y categorías
                </a>
                <a href="#documentos" className="btn btn-outline-primary btn-sm" onClick={onCerrar}>
                  Documentos y protocolos
                </a>
                <a href="#panel-direccion" className="btn btn-outline-primary btn-sm" onClick={onCerrar}>
                  Panel de dirección y auditoría
                </a>
              </>
            )}
          </div>
        </div>
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