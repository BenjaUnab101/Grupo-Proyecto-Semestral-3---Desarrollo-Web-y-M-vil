import { useCallback } from 'react'
import SectionTitle from '../components/SectionTitle.jsx'
import Agenda from '../components/Agenda.jsx'
import InscripcionesActividades from '../components/InscripcionesActividades.jsx'
import FlujoInscripcionEventos from '../components/FlujoInscripcionEventos.jsx'
import GestionActividades from '../components/GestionActividades.jsx'
import GestionOrganizadores from '../components/GestionOrganizadores.jsx'
import EstadoCarga from '../components/EstadosApi.jsx'
import { useRecurso } from '../hooks/useRecurso.js'
import { useSesion } from '../context/sesionContexto.js'
import { listarActividades, listarInscripciones } from '../services/actividadesApi.js'
import { obtenerActividades } from '../services/eventosApi.js'

// Calendario de actividades. Junta dos fuentes de la API:
//  - los eventos con inscripción y cupos (HU-19, /eventos), y
//  - las actividades escolares publicadas (HU-18, /actividades).
// Si la cuenta es de un apoderado, debajo puede inscribir a sus hijos en los eventos (HU-19).
// Al final quedan el flujo de inscripción con pago y la gestión de actividades y
// organizadores de HU-17/18/20/23.
async function cargarCalendario() {
  const [eventos, escolares] = await Promise.all([
    listarActividades(),
    obtenerActividades(true).catch(() => []), // si falla, el calendario muestra igual los eventos
  ])
  // Las actividades escolares llevan otro prefijo en el id para no repetir claves.
  const deHu18 = escolares.map((a) => ({ ...a, id: `escolar-${a.id}`, hora: a.hora ?? undefined }))
  return { eventos, todas: [...eventos, ...deHu18] }
}

export default function CalendarioSeccion({ hoy }) {
  const { perfil, usuarioId } = useSesion()
  const apoderadoId = perfil?.apoderadoId

  const calendario = useRecurso(cargarCalendario)
  const actividadesCalendario = calendario.datos?.todas // eventos (HU-19) + actividades escolares (HU-18)
  const cargarActividadesCalendario = calendario.recargar
  const cargarInscripciones = useCallback(() => listarInscripciones(apoderadoId, usuarioId), [apoderadoId, usuarioId])
  const inscripciones = useRecurso(apoderadoId ? cargarInscripciones : null) // solo con un apoderado elegido

  const recargarTodo = () => {
    calendario.recargar()
    inscripciones.recargar()
  }

  return (
    <section id="calendario">
      <SectionTitle titulo="Calendario de Actividades" subtitulo="Próximas fechas importantes, reuniones y talleres" />
      <EstadoCarga recurso={calendario} textoCargando="Cargando actividades…" textoError="No pudimos cargar el calendario.">
        <Agenda actividades={actividadesCalendario} hoy={hoy} />

        {apoderadoId && (
          <div className="mt-4 inscripciones-bloque">
            <h3 className="h5">Inscribir a mis hijos</h3>
            <EstadoCarga recurso={inscripciones} textoCargando="Cargando inscripciones…" textoError="No pudimos cargar tus inscripciones.">
              <InscripcionesActividades actividades={calendario.datos?.eventos} inscripciones={inscripciones.datos} onCambio={recargarTodo} />
            </EstadoCarga>
          </div>
        )}
      </EstadoCarga>

      <FlujoInscripcionEventos onCambioInscripcion={cargarActividadesCalendario} />
      <GestionActividades onCambioActividades={cargarActividadesCalendario} />
      <GestionOrganizadores />
    </section>
  )
}
