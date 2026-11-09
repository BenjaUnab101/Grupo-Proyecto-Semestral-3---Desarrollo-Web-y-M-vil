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
import { enviarConsulta, erroresDelContacto } from '../services/contactoApi.js'
import { mensajeDeError } from '../services/http.js'

// HU-12 + HU-26 (Sprint 3 · Daniel): formulario de contacto con la dirección.
// Reutiliza FormField, FormularioDemo, useFormularioDemo y utils/validaciones.js (Taller 2).
// Desde HU-26 la consulta se ENVÍA a la API (POST /contacto) y queda en PostgreSQL con un
// código de seguimiento. Si hay sesión iniciada, queda ligada a la cuenta ("Mis consultas").
export default function FormContacto({ onCreada = () => {} }) {
  const { valores, confirmado, enviando, errorEnvio, resultado, refConfirmacion, manejarEnvio, propsCampo } = useFormularioDemo({
    idFormulario: 'contacto',
    campos: CAMPOS_CONTACTO,
    valoresIniciales: VALORES_INICIALES_CONTACTO,
    validarCampo: validarCampoContacto,
    normalizarCampo: normalizarCampoContacto,
    enviar: async (datos) => {
      const creada = await enviarConsulta(datos)
      onCreada(creada.codigo)
      return creada
    },
    erroresDeApi: erroresDelContacto, // un 400 de la API se muestra junto a cada campo
  })

  const caracteres = contarCaracteres(valores.mensaje)

  return (
    <FormularioDemo
      id="formulario-contacto"
      titulo="Escribe a la dirección"
      aviso={
        <>
          Tu consulta <strong>llega a la dirección del jardín</strong> y recibirás un código para revisar si fue
          atendida. Este portal es una demostración: usa datos ficticios, como el correo demo@ejemplo.cl.
        </>
      }
      mensajeConfirmacion={
        resultado && (
          <>
            Consulta recibida. Tu código de seguimiento es{' '}
            <span className="form-demo__codigo">{resultado.codigo}</span>
            <br />
            <span className="fw-normal">Guárdalo: con este código y tu correo puedes revisar su estado.</span>
          </>
        )
      }
      textoBoton="Enviar consulta"
      textoEnviando="Enviando consulta…"
      confirmado={confirmado}
      enviando={enviando}
      errorEnvio={errorEnvio && `La consulta no se envió. ${mensajeDeError(errorEnvio)}`}
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
        ayuda="Lo necesitarás junto al código para revisar el estado."
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
