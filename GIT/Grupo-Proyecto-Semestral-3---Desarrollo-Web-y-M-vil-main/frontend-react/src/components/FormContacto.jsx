import FormField from './FormField.jsx'
import FormularioDemo from './FormularioDemo.jsx'
import useFormularioDemo from '../hooks/useFormularioDemo.js'
import { contarCaracteres } from '../utils/validaciones.js'
import {
  CAMPOS_CONTACTO,
  LARGO_MAXIMO_ASUNTO,
  LARGO_MAXIMO_MENSAJE,
  LARGO_MAXIMO_NOMBRE,
  LARGO_MINIMO_MENSAJE,
  VALORES_INICIALES_CONTACTO,
  normalizarCampoContacto,
  validarCampoContacto,
} from '../utils/contacto.js'

export const MENSAJE_DEMO_CONTACTO = 'Demostración: consulta validada, no enviada a la dirección'

// HU-12: formulario de contacto con la dirección (DEMO).
// Reutiliza FormField, FormularioDemo, useFormularioDemo y utils/validaciones.js
// (los mismos de HU-11): aquí solo se definen los campos y sus textos.
// No se hace ninguna solicitud HTTP ni se guarda nada; al confirmar se borra.
export default function FormContacto() {
  const { valores, confirmado, refConfirmacion, manejarEnvio, propsCampo } = useFormularioDemo({
    idFormulario: 'contacto',
    campos: CAMPOS_CONTACTO,
    valoresIniciales: VALORES_INICIALES_CONTACTO,
    validarCampo: validarCampoContacto,
    normalizarCampo: normalizarCampoContacto,
  })

  const caracteres = contarCaracteres(valores.mensaje)

  return (
    <FormularioDemo
      id="formulario-contacto"
      titulo="Escribe a la dirección (demo)"
      aviso={
        <>
          Esta es una demostración del futuro canal de contacto: la consulta{' '}
          <strong>no se envía a la dirección ni se guarda</strong>. Para probarla puedes usar datos
          ficticios, como el correo demo@ejemplo.cl.
        </>
      }
      mensajeConfirmacion={MENSAJE_DEMO_CONTACTO}
      textoBoton="Enviar consulta (demo)"
      confirmado={confirmado}
      refConfirmacion={refConfirmacion}
      onSubmit={manejarEnvio}
    >
      <FormField
        label="Nombre"
        {...propsCampo('nombre')}
        required
        autoComplete="off"
        maxLength={LARGO_MAXIMO_NOMBRE}
      />
      <FormField
        label="Correo electrónico"
        type="email"
        {...propsCampo('correo')}
        required
        ayuda="Solo se revisa el formato; puedes usar uno ficticio para probar."
        autoComplete="off"
        inputMode="email"
      />
      <FormField
        label="Teléfono"
        type="tel"
        {...propsCampo('telefono')}
        required
        ayuda="Celular o fijo chileno de 9 dígitos. Ejemplo: +56 9 1234 5678"
        autoComplete="off"
        inputMode="tel"
      />
      <FormField
        label="Asunto"
        {...propsCampo('asunto')}
        required
        autoComplete="off"
        maxLength={LARGO_MAXIMO_ASUNTO}
      />
      <FormField
        label="Consulta"
        type="textarea"
        {...propsCampo('mensaje')}
        required
        ayuda={`Mínimo ${LARGO_MINIMO_MENSAJE} caracteres. Llevas ${caracteres} de ${LARGO_MAXIMO_MENSAJE}.`}
        maxLength={LARGO_MAXIMO_MENSAJE}
      />
    </FormularioDemo>
  )
}
