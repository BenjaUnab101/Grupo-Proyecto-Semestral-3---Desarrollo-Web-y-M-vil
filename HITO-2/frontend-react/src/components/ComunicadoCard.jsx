import { formatearFecha } from '../services/comunicados.js'

function ComunicadoCard({
  titulo,
  cuerpo,
  fecha,
  emisor,
  alcance,
  categoria,
  esUrgente = false,
}) {
  // Prepara los datos calculados que se necesitan para mostrar la tarjeta.
  const fechaFormateada = formatearFecha(fecha)
  const claseComunicado = esUrgente
    ? 'comunicado comunicado--urgente'
    : 'comunicado'

  return (
    <article className={claseComunicado}>
      <header className="comunicado__cabecera">
        {/* Las etiquetas solo aparecen cuando el comunicado tiene esos atributos. */}
        {esUrgente && <span className="comunicado__etiqueta">Urgente</span>}
        {categoria && <span className="comunicado__categoria">{categoria}</span>}
      </header>

      <h3 className="comunicado__titulo">{titulo}</h3>
      <p className="comunicado__cuerpo">{cuerpo}</p>

      <footer className="comunicado__pie">
        {/* Si la fecha no se puede interpretar, se informa al usuario. */}
        {fechaFormateada ? (
          <time dateTime={fecha}>{fechaFormateada}</time>
        ) : (
          <span>Fecha no disponible</span>
        )}
        {emisor && <span>{emisor}</span>}
        {alcance && <span>{alcance}</span>}
      </footer>
    </article>
  )
}

export default ComunicadoCard
