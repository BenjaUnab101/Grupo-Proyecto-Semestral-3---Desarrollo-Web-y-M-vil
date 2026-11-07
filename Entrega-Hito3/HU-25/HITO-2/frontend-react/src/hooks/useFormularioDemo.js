import { useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { primerError, recortar, validarTodos } from '../utils/validaciones.js'

// Estado y eventos compartidos por los formularios del portal (HU-11 pre-matrícula y
// HU-12 contacto). Cada formulario entrega sus campos y sus reglas; el
// comportamiento es el mismo para todos:
//  - onChange: actualiza `valores`; si el campo ya mostraba error, lo revalida en
//    tiempo real para que el mensaje desaparezca apenas el dato es correcto.
//  - onBlur: valida el campo y, si es válido, lo normaliza (trim, RUT, teléfono…).
//  - onSubmit: preventDefault, valida todo y lleva el foco al primer error; si no
//    hay errores, limpia el formulario y muestra la confirmación.
//
// HU-25: si se entrega `enviar(valores)` (una función de services/), se envía a la API.
//  - Si responde bien: se limpia y `resultado` guarda la respuesta (ej. el código).
//  - Si falla: `errorEnvio` guarda el error, lo escrito NO se borra y, si la API
//    marcó campos (400), `erroresDeApi(error)` los pone junto a cada campo.
// Sin `enviar` (contacto, HU-12) sigue siendo una demostración: no hay red.
export default function useFormularioDemo({
  idFormulario,
  campos,
  valoresIniciales,
  validarCampo,
  normalizarCampo = (nombre, valor) => recortar(valor),
  enviar,
  erroresDeApi = () => ({}),
}) {
  const [valores, setValores] = useState(valoresIniciales)
  const [errores, setErrores] = useState({})
  const [confirmado, setConfirmado] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [errorEnvio, setErrorEnvio] = useState(null)
  const [resultado, setResultado] = useState(null)
  const refConfirmacion = useRef(null)

  const manejarCambio = (evento) => {
    const { name, type, checked } = evento.target
    const valor = type === 'checkbox' ? checked : evento.target.value // las casillas usan checked
    setValores((anteriores) => ({ ...anteriores, [name]: valor }))
    if (confirmado) setConfirmado(false)

    if (errores[name] || type === 'checkbox') {
      setErrores((anteriores) => ({ ...anteriores, [name]: validarCampo(name, valor) }))
    }
  }

  const manejarBlur = (evento) => {
    const { name, value, type } = evento.target
    if (type === 'checkbox') return
    const mensaje = validarCampo(name, value)
    setErrores((anteriores) => ({ ...anteriores, [name]: mensaje }))
    if (!mensaje) {
      setValores((anteriores) => ({ ...anteriores, [name]: normalizarCampo(name, value) }))
    }
  }

  // flushSync pinta los errores antes de mover el foco, para que el lector
  // de pantalla lea el mensaje asociado al campo enfocado.
  const mostrarErrores = (formulario, nuevosErrores) => {
    flushSync(() => setErrores(nuevosErrores))
    formulario.elements[primerError(campos, nuevosErrores)]?.focus()
  }

  const manejarEnvio = async (evento) => {
    evento.preventDefault()
    const formulario = evento.currentTarget
    const nuevosErrores = validarTodos(campos, valores, validarCampo)
    if (primerError(campos, nuevosErrores)) {
      setConfirmado(false)
      mostrarErrores(formulario, nuevosErrores)
      return
    }

    let respuesta = null
    if (enviar) {
      setEnviando(true)
      setErrorEnvio(null)
      try {
        respuesta = await enviar(valores)
      } catch (error) {
        setEnviando(false)
        setErrorEnvio(error)
        const erroresServidor = erroresDeApi(error)
        if (primerError(campos, erroresServidor)) mostrarErrores(formulario, erroresServidor)
        return
      }
      setEnviando(false)
    }

    // Primero se quita el foco del campo activo (aún con su valor válido): si no,
    // al mover el foco a la confirmación ese campo "pierde el foco" ya vacío y
    // aparece un error de obligatorio en un formulario recién enviado.
    if (formulario.contains(document.activeElement)) document.activeElement.blur()
    flushSync(() => {
      setValores(valoresIniciales)
      setErrores({})
      setResultado(respuesta)
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

  return { valores, errores, confirmado, enviando, errorEnvio, resultado, refConfirmacion, manejarEnvio, propsCampo }
}
