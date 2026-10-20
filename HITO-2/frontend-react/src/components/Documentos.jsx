import documentos from '../data/documentos.json'
import DocumentoItem from './DocumentoItem.jsx'

export default function Documentos() {
  return (
    <div className="row g-3">
      {documentos.map((documento) => (
        <DocumentoItem key={documento.id} documento={documento} />
      ))}
    </div>
  )
}
