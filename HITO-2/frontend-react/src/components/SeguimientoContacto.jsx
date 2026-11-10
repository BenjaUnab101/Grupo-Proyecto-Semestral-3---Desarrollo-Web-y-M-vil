import { useState } from 'react'
import FormField from './FormField.jsx'
import { ESTADOS_CONTACTO, consultarSeguimientoContacto } from '../services/contactoApi.js'
import { mensajeDeError } from '../services/http.js'
import { formatearFechaHora } from '../utils/fechas.js'
import '../styles/Formulario.css'

// HU-26 (Sprint 3 · Daniel): revisar el estado de una consulta con el código + el correo.
// Mismo diseño que el seguimiento de pre-matrícula (HU-25). El estado se pide siempre a la API.
export default function SeguimientoContacto({ codigoInicial = '' }) {
  const [codigo, setCodigo] = useState(codigoInicial)
  const [correo, setCorreo] = useState('')
  const [consultando, setConsultando] = useState(false)
  const [error, setError] = useState(null)
  const [consulta, setConsulta] = useState(null)

  const revisar = async (evento) => {
    evento.preventDefault()
    if (!codigo.trim() || !correo.trim()) {
      setError('Escribe el código de seguimiento y el correo que usaste.')
      return
    }
    setConsultando(true)
    setError(null)
    try {
      setConsulta(await consultarSeguimientoContacto(codigo.trim().toUpperCase(), correo.trim()))
    } catch (errorApi) {
      setConsulta(null)
      setError(mensajeDeError(errorApi))
    }
    setConsultando(false)
  }

  return (
    <div id="seguimiento-contacto" className="form-demo">
      <h3 className="form-demo__titulo">Revisar mi consulta</h3>
      <p className="form-demo__aviso">Escribe el código que recibiste al enviar la consulta y el correo que usaste.</p>
      {error && <p className="form-demo__error-envio" role="alert">{error}</p>}

      <form onSubmit={revisar} noValidate>
        <FormField id="contacto-seg-codigo" label="Código de seguimiento" name="codigo" value={codigo}
          onChange={(e) => setCodigo(e.target.value)} required placeholder="CT-XXXXXX" autoComplete="off" />
        <FormField id="contacto-seg-correo" label="Correo electrónico" type="email" name="correo" value={correo}
          onChange={(e) => setCorreo(e.target.value)} required autoComplete="email" />
        <button type="submit" className="btn-institucional-primary form-demo__boton" disabled={consultando}>
          {consultando ? 'Consultando…' : 'Revisar estado'}
        </button>
      </form>

      {consulta && <ResumenConsulta consulta={consulta} />}
    </div>
  )
}

export function ResumenConsulta({ consulta }) {
  return (
    <section className="seguimiento" aria-live="polite">
      <h4 className="seguimiento__titulo">
        Consulta {consulta.codigo}
        <span className={`seguimiento__estado contacto__estado--${consulta.estado}`}>{ESTADOS_CONTACTO[consulta.estado]}</span>
      </h4>
      <p className="seguimiento__dato">Asunto: {consulta.asunto}</p>
      {consulta.respuesta && (
        <p className="seguimiento__mensaje"><strong>Respuesta de dirección:</strong> {consulta.respuesta}</p>
      )}
      <p className="seguimiento__dato">Enviada: {formatearFechaHora(consulta.creadaEn)}</p>
      <p className="seguimiento__dato">Última actualización: {formatearFechaHora(consulta.actualizadaEn)}</p>
    </section>
  )
}
