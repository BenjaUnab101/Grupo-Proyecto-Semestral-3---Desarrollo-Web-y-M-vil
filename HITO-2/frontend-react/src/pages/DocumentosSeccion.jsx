import SectionTitle from '../components/SectionTitle.jsx'
import Documentos from '../components/Documentos.jsx'

// Documentos y protocolos del jardín (antes estaba escrito directo en PaginaPrincipal).
export default function DocumentosSeccion() {
  return (
    <section id="documentos">
      <SectionTitle titulo="Documentos y Protocolos" subtitulo="Reglamentos internos y formularios informativos (demo)" />
      <Documentos />
    </section>
  )
}
