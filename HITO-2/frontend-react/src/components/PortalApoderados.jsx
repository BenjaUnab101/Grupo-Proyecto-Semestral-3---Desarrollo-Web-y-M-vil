import { useCallback, useState } from 'react'
import { useSesionApoderado } from '../hooks/useSesionApoderado.js'
import { useRecurso } from '../hooks/useRecurso.js'
import { ETIQUETA_ROL, listarMisAlumnos, obtenerFicha } from '../services/auth.js'
import EstadoCarga from './EstadosApi.jsx'
import LoginForm from './LoginForm.jsx'
import SelectorHermanos from './SelectorHermanos.jsx'
import FichaAlumno from './FichaAlumno.jsx'
import AvisoPrivacidad from './AvisoPrivacidad.jsx'

// HU-16: portal de familias.
// - Sin sesión: formulario de acceso (POST /auth/login).
// - Apoderado: hijos desde la relación SQL (GET /portal/alumnos) y ficha del elegido
//   (GET /portal/alumnos/{id}). El backend responde 403 si el alumno no es suyo.
// - Personal o dirección: aviso con accesos a sus paneles de la página.
// - "Cerrar sesión" revoca el token en el servidor (POST /auth/logout).
export default function PortalApoderados({ onCerrar }) {
  const { perfil, autenticado, esApoderado, salir } = useSesionApoderado()

  if (!autenticado) return <LoginForm />

  const manejarLogout = async () => {
    await salir()
    onCerrar()
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-start mb-3">
        <p className="mb-0">
          Hola, <strong>{perfil.nombre}</strong>
          <span className="d-block small text-muted">{ETIQUETA_ROL[perfil.rol]} · {perfil.email}</span>
        </p>
        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={manejarLogout}>
          Cerrar sesión
        </button>
      </div>

      {esApoderado ? <HijosDelApoderado /> : <AccesosPersonal rol={perfil.rol} onIr={onCerrar} />}

      <hr />
      <AvisoPrivacidad />
    </div>
  )
}

function AccesosPersonal({ rol, onIr }) {
  const accesos = [
    { href: '#gestion-actividades', texto: 'Gestión y publicación de actividades escolares' },
    { href: '#flujo-inscripcion-eventos', texto: 'Inscripciones y comprobantes de pago simulados' },
    { href: '#comunicados', texto: 'Publicar comunicados' },
    ...(rol === 'administrador'
      ? [
          { href: '#gestion-organizadores', texto: 'Organizadores y categorías' },
          { href: '#matricula', texto: 'Solicitudes de pre-matrícula' },
          { href: '#panel-direccion', texto: 'Panel de participación y auditoría' },
        ]
      : [{ href: '#panel-direccion', texto: 'Panel de participación' }]),
  ]
  return (
    <>
      <p className="text-muted small">
        Iniciaste sesión con una cuenta del jardín. Las fichas de alumnos son solo para apoderados; estas son tus
        herramientas en la página:
      </p>
      <div className="list-group">
        {accesos.map((a) => (
          <a key={a.href} href={a.href} className="list-group-item list-group-item-action small" onClick={onIr}>
            {a.texto}
          </a>
        ))}
      </div>
    </>
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