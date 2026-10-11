import { useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import FormField from './FormField.jsx'
import niveles from '../data/niveles.json'
import {
  LARGO_MAXIMO_COMENTARIO,
  LARGO_MAXIMO_NOMBRE,
  VALORES_INICIALES,
  normalizarCampo,
  primerCampoConError,
  validarCampo,
  validarFormulario,
} from '../utils/preMatricula.js'
import '../styles/PreMatricula.css'

export const MENSAJE_DEMO = 'Demostración: solicitud validada, no enviada al jardín'

// HU-11: formulario controlado de pre-matrícula (DEMO).
// Privacidad: los datos solo viven en el estado de este componente mientras se escribe.
// No se envían por red, no se guardan en localStorage/sessionStorage/cookies ni se
// imprimen en consola; al confirmar se borran.
export default function FormPreMatricula() {
  const [valores, setValores] = useState(VALORES_INICIALES)
  const [errores, setErrores] = useState({})
  const [confirmado, setConfirmado] = useState(false)
  const refConfirmacion = useRef(null)

  // onChange: actualiza el valor. Si el campo ya mostraba un error, se revalida
  // en tiempo real para que el mensaje desaparezca apenas el dato es correcto.
  const manejarCambio = (evento) => {
    const { name, value } = evento.target
    setValores((anteriores) => ({ ...anteriores, [name]: value }))
    if (confirmado) setConfirmado(false)

    if (errores[name]) {
      const mensaje = validarCampo(name, value, niveles)
      setErrores((anteriores) => ({ ...anteriores, [name]: mensaje }))
    }
  }

  // onBlur: al salir del campo se valida y, si es válido, se normaliza (trim, RUT, teléfono).
  const manejarBlur = (evento) => {
    const { name, value } = evento.target
    const mensaje = validarCampo(name, value, niveles)
    setErrores((anteriores) => ({ ...anteriores, [name]: mensaje }))
    if (!mensaje) {
      setValores((anteriores) => ({ ...anteriores, [name]: normalizarCampo(name, value) }))
    }
  }

  // onSubmit: evita la recarga, valida todo y lleva el foco al primer error.
  const manejarEnvio = (evento) => {
    evento.preventDefault()
    const formulario = evento.currentTarget
    const nuevosErrores = validarFormulario(valores, niveles)
    const campoConError = primerCampoConError(nuevosErrores)

    if (campoConError) {
      // flushSync pinta los errores antes de mover el foco, para que el lector
      // de pantalla lea el mensaje asociado al campo enfocado.
      flushSync(() => {
        setErrores(nuevosErrores)
        setConfirmado(false)
      })
      formulario.elements[campoConError].focus()
      return
    }

    // Demo: no se envía nada. Se limpia el formulario y se informa la simulación.
    flushSync(() => {
      setValores(VALORES_INICIALES)
      setErrores({})
      setConfirmado(true)
    })
    refConfirmacion.current?.focus()
  }

  const props = (name) => ({
    name,
    value: valores[name],
    error: errores[name],
    onChange: manejarCambio,
    onBlur: manejarBlur,
  })

  return (
    <div className="prematricula">
      <h3 className="prematricula__titulo">Formulario de pre-matrícula (demo)</h3>
      <p className="prematricula__aviso">
        Esta es una demostración: la información <strong>no se envía al jardín ni se guarda</strong>.
        Para probarla, usa datos ficticios y no ingreses datos reales de niños o niñas.
      </p>

      {confirmado && (
        <p ref={refConfirmacion} tabIndex={-1} className="prematricula__confirmacion" role="status">
          {MENSAJE_DEMO}
        </p>
      )}

      {/* noValidate: la validación la hace React con mensajes propios, no el navegador. */}
      <form className="prematricula__form" onSubmit={manejarEnvio} noValidate>
        <fieldset className="prematricula__grupo">
          <legend>Datos del apoderado</legend>
          <FormField
            label="Nombre completo"
            {...props('nombreApoderado')}
            required
            autoComplete="name"
            maxLength={LARGO_MAXIMO_NOMBRE}
          />
          <FormField
            label="RUT"
            {...props('rut')}
            required
            ayuda="Con o sin puntos y guion. Ejemplo: 12.345.678-5"
            autoComplete="off"
          />
          <FormField
            label="Correo electrónico"
            type="email"
            {...props('correo')}
            required
            autoComplete="email"
            inputMode="email"
          />
          <FormField
            label="Teléfono"
            type="tel"
            {...props('telefono')}
            required
            ayuda="Celular o fijo chileno de 9 dígitos. Ejemplo: +56 9 1234 5678"
            autoComplete="tel"
            inputMode="tel"
          />
        </fieldset>

        <fieldset className="prematricula__grupo">
          <legend>Datos del párvulo</legend>
          <FormField
            label="Nombre del párvulo"
            {...props('nombreParvulo')}
            required
            autoComplete="off"
            maxLength={LARGO_MAXIMO_NOMBRE}
          />
          <FormField label="Nivel al que postula" type="select" {...props('nivel')} required opciones={niveles} />
          <FormField
            label="Comentarios"
            type="textarea"
            {...props('comentario')}
            maxLength={LARGO_MAXIMO_COMENTARIO}
          />
        </fieldset>

        <p className="prematricula__nota">
          Los campos marcados con * son obligatorios.
        </p>

        {/* onMouseDown evita que el campo activo pierda el foco al presionar el botón:
            si no, su mensaje de error aparece, empuja el botón hacia abajo y el clic
            termina fuera de él (había que hacer clic dos veces). El envío valida todo igual. */}
        <button
          type="submit"
          className="btn-institucional-primary prematricula__boton"
          onMouseDown={(evento) => evento.preventDefault()}
        >
          Confirmar pre-matrícula (demo)
        </button>
      </form>
    </div>
  )
}
