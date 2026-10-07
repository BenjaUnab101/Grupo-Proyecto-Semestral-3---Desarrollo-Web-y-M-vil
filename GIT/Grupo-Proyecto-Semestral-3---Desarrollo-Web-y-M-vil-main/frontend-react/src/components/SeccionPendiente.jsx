import SectionTitle from './SectionTitle'

// Marcador visual reutilizable para secciones cuya historia aun no se implementa.
export default function SeccionPendiente({ id, titulo, subtitulo, etiqueta }) {
  return (
    <>
      <SectionTitle id={id} titulo={titulo} subtitulo={subtitulo} />
      <div className="p-4 bg-light rounded text-center text-muted mb-4 border">
        [Espacio reservado para componente {etiqueta}]
      </div>
    </>
  )
}
