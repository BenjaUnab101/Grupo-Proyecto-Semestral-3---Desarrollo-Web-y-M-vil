import { useCallback, useState } from 'react'
import SectionTitle from '../components/SectionTitle.jsx'
import ComunicadosBoard from '../components/ComunicadosBoard.jsx'
import FormPublicarComunicado from '../components/FormPublicarComunicado.jsx'
import EstadoCarga from '../components/EstadosApi.jsx'
import { useRecurso } from '../hooks/useRecurso.js'
import { useSesion } from '../context/sesionContexto.js'
import { eliminarComunicado, listarComunicados, listarComunicadosDeApoderado } from '../services/comunicadosApi.js'
import { mensajeDeError } from '../services/http.js'

// TEC-17 / HU-21: comunicados desde la API.
//  - Visitante o personal: todos los vigentes.
//  - Apoderado: solo los suyos (General + el nivel de sus hijos).
//  - Dirección o personal: además, formulario para publicar y botón para eliminar.
export default function ComunicadosSeccion() {
  const { perfil, usuarioId, esEditor, revisarError } = useSesion()
  const apoderadoId = perfil?.apoderadoId
  const [aviso, setAviso] = useState(null)

  const cargar = useCallback(
    () => (apoderadoId ? listarComunicadosDeApoderado(apoderadoId, usuarioId) : listarComunicados()),
    [apoderadoId, usuarioId],
  )
  const comunicados = useRecurso(cargar)

  const eliminar = async (comunicado) => {
    if (!window.confirm(`¿Eliminar el comunicado «${comunicado.titulo}»?`)) return
    try {
      await eliminarComunicado(comunicado.id, usuarioId)
      setAviso({ exito: true, texto: `Se eliminó «${comunicado.titulo}».` })
    } catch (error) {
      revisarError(error)
      setAviso({ exito: false, texto: mensajeDeError(error) })
    }
    comunicados.recargar()
  }

  return (
    <section id="comunicados">
      <SectionTitle
        titulo="Comunicados Oficiales"
        subtitulo={apoderadoId ? 'Avisos generales y de los niveles de tus hijos' : 'Información y avisos institucionales para la comunidad escolar'}
      />

      {esEditor && <FormPublicarComunicado onPublicado={comunicados.recargar} />}

      {aviso && (
        <div className={`alert py-2 ${aviso.exito ? 'alert-success' : 'alert-danger'}`} role={aviso.exito ? 'status' : 'alert'}>
          {aviso.texto}
        </div>
      )}

      <EstadoCarga recurso={comunicados} textoCargando="Cargando comunicados…" textoError="No pudimos cargar los comunicados.">
        <ComunicadosBoard comunicados={comunicados.datos} onEliminar={esEditor ? eliminar : undefined} />
      </EstadoCarga>
    </section>
  )
}
