import { useState } from 'react'
import FormField from './FormField.jsx'
import niveles from '../data/niveles.json'
import { ESTADOS, consultarSeguimiento } from '../services/prematriculaApi.js'
import { mensajeDeError } from '../services/http.js'
import { guardarCodigo } from '../utils/codigoSeguimiento.js'
import { formatearFechaHora } from '../utils/fechas.js'
import '../styles/Formulario.css'

// HU-25: la familia consulta el estado de su solicitud con el código + el correo que usó.
// El estado se pide SIEMPRE a la API, así que se ve igual tras recargar o desde otro equipo.
export default function SeguimientoPrematricula({ codigoInicial = '' }) {
  const [codigo, setCodigo] = useState(codigoInicial)
  const [correo, setCorreo] = useState('')
  const [consultando, setConsultando] = useState(false)
  const [error, setError] = useState(null)
  const [solicitud, setSolicitud] = useState(null)

  const consultar = async (evento) => {
    evento.preventDefault()
    if (!codigo.trim() || !correo.trim()) {
      setError('Escribe el código de seguimiento y el correo que usaste.')
      return
    }
    setConsultando(true)
    setError(null)
    try {
      const datos = await consultarSeguimiento(codigo.trim().toUpperCase(), correo.trim())
      setSolicitud(datos)
      guardarCodigo(datos.codigo)
    } catch (errorApi) {
      setSolicitud(null)
      setError(mensajeDeError(errorApi))
    }
    setConsultando(false)
  }

  return (
    <div id="seguimiento-prematricula" className="form-demo">
      <h3 className="form-demo__titulo">Consultar mi solicitud</h3>
      <p className="form-demo__aviso">Escribe el código que recibiste al enviar la pre-matrícula y el correo que usaste.</p>
      {error && <p className="form-demo__error-envio" role="alert">{error}</p>}

      <form onSubmit={consultar} noValidate>
        <FormField id="seguimiento-codigo" label="Código de seguimiento" name="codigo" value={codigo}
          onChange={(e) => setCodigo(e.target.value)} required placeholder="PM-XXXXXX" autoComplete="off" />
        <FormField id="seguimiento-correo" label="Correo electrónico" type="email" name="correo" value={correo}
          onChange={(e) => setCorreo(e.target.value)} required autoComplete="email" />
        <button type="submit" className="btn-institucional-primary form-demo__boton" disabled={consultando}>
          {consultando ? 'Consultando…' : 'Consultar estado'}
        </button>
      </form>

      {solicitud && (
        <section className="seguimiento" aria-live="polite">
          <h4 className="seguimiento__titulo">
            Solicitud {solicitud.codigo}
            <span className={`seguimiento__estado seguimiento__estado--${solicitud.estado}`}>{ESTADOS[solicitud.estado]}</span>
          </h4>
          {solicitud.mensajeFamilia && (
            <p className="seguimiento__mensaje"><strong>Mensaje del jardín:</strong> {solicitud.mensajeFamilia}</p>
          )}
          <p className="seguimiento__dato">Nivel: {niveles.find((n) => n.id === solicitud.nivel)?.nombre}</p>
          <p className="seguimiento__dato">Enviada: {formatearFechaHora(solicitud.creadaEn)}</p>
          <p className="seguimiento__dato">Última actualización: {formatearFechaHora(solicitud.actualizadaEn)}</p>
        </section>
      )}
    </div>
  )
}
