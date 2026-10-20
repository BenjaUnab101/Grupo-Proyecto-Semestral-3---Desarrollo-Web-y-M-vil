import { useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { primerError, recortar, validarTodos } from '../utils/validaciones.js'

// Estado y eventos compartidos por los formularios demo (HU-11 pre-matrícula y
// HU-12 contacto). Cada formulario entrega sus campos y sus reglas; el
// comportamiento es el mismo para todos:
//  - onChange: actualiza `valores`; si el campo ya mostraba error, lo revalida en
//    tiempo real para que el mensaje desaparezca apenas el dato es correcto.
//  - onBlur: valida el campo y, si es válido, lo normaliza (trim, RUT, teléfono…).
//  - onSubmit: preventDefault, valida todo y lleva el foco al primer error; si no
//    hay errores, limpia el formulario y muestra la confirmación de demostración.
//
// Privacidad: los datos solo viven en este estado. No hay red ni almacenamiento.
export default function useFormularioDemo({
  idFormulario,
  campos,
  valoresIniciales,
  validarCampo,
  normalizarCampo = (nombre, valor) => recortar(valor),
}) {
  const [valores, setValores] = useState(valoresIniciales)
  const [errores, setErrores] = useState({})
  const [confirmado, setConfirmado] = useState(false)
  const refConfirmacion = useRef(null)

  const manejarCambio = (evento) => {
    const { name, value } = evento.target
    setValores((anteriores) => ({ ...anteriores, [name]: value }))
    if (confirmado) setConfirmado(false)

    if (errores[name]) {
      setErrores((anteriores) => ({ ...anteriores, [name]: validarCampo(name, value) }))
    }
  }

  const manejarBlur = (evento) => {
    const { name, value } = evento.target
    const mensaje = validarCampo(name, value)
    setErrores((anteriores) => ({ ...anteriores, [name]: mensaje }))
    if (!mensaje) {
      setValores((anteriores) => ({ ...anteriores, [name]: normalizarCampo(name, value) }))
    }
  }

  const manejarEnvio = (evento) => {
    evento.preventDefault()
    const formulario = evento.currentTarget
    const nuevosErrores = validarTodos(campos, valores, validarCampo)
    const campoConError = primerError(campos, nuevosErrores)

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
    // Primero se quita el foco del campo activo (aún con su valor válido): si no,
    // al mover el foco a la confirmación ese campo "pierde el foco" ya vacío y
    // aparece un error de obligatorio en un formulario recién enviado.
    if (formulario.contains(document.activeElement)) document.activeElement.blur()
    flushSync(() => {
      setValores(valoresIniciales)
      setErrores({})
      setConfirmado(true)
    })
    refConfirmacion.current?.focus()
  }

  // Props comunes para <FormField {...propsCampo('correo')} />. El id lleva el
  // prefijo del formulario para que no se repita si hay dos formularios en la página.
  const propsCampo = (name) => ({
    id: `${idFormulario}-${name}`,
    name,
    value: valores[name],
    error: errores[name],
    onChange: manejarCambio,
    onBlur: manejarBlur,
  })

  return { valores, errores, confirmado, refConfirmacion, manejarEnvio, propsCampo }
}
