import { esProxima, formatearFecha, parseFechaISO } from '../utils/fechas.js'

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

// "viernes, 9 de octubre…" → "Viernes, 9 de octubre…"
function capitalizar(texto) {
  return texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : texto
}

// Texto relativo que acompaña a la fecha: "Hoy", "Mañana" o "En N días".
function textoRelativo(dias) {
  if (dias === 0) return 'Hoy'
  if (dias === 1) return 'Mañana'
  return `En ${dias} días`
}

// HU-04: una actividad del calendario. Recibe todo por props y no tiene estado.
export default function ActividadItem({ titulo, fecha, hora, lugar, preparar, diasRestantes }) {
  const partes = parseFechaISO(fecha)
  const fechaLarga = capitalizar(formatearFecha(fecha))
  const proxima = esProxima(diasRestantes)

  return (
    <li className={`actividad${proxima ? ' actividad--proxima' : ''}`}>
      {/* Bloque visual del día; el lector de pantalla lee la fecha completa en <time>. */}
      {partes && (
        <div className="actividad__dia" aria-hidden="true">
          <span className="actividad__dia-numero">{partes.dia}</span>
          <span className="actividad__dia-mes">{MESES_CORTOS[partes.mes - 1]}</span>
        </div>
      )}

      <div className="actividad__contenido">
        <div className="actividad__cabecera">
          <h3 className="actividad__titulo">{titulo}</h3>
          {proxima && <span className="actividad__insignia">Próxima</span>}
        </div>

        <p className="actividad__cuando">
          {fechaLarga ? <time dateTime={fecha}>{fechaLarga}</time> : 'Fecha no disponible'}
          {hora && <> · {hora} h</>}
          {Number.isInteger(diasRestantes) && (
            <span className="actividad__relativo"> · {textoRelativo(diasRestantes)}</span>
          )}
        </p>

        {lugar && <p className="actividad__detalle">{lugar}</p>}
        {preparar && (
          <p className="actividad__detalle">
            <strong>Preparar:</strong> {preparar}
          </p>
        )}
      </div>
    </li>
  )
}
