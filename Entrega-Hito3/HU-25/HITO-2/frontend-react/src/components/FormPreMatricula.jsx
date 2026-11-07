import FormField from './FormField.jsx'
import FormularioDemo from './FormularioDemo.jsx'
import useFormularioDemo from '../hooks/useFormularioDemo.js'
import niveles from '../data/niveles.json'
import {
  CAMPOS,
  LARGO_MAXIMO_COMENTARIO,
  LARGO_MAXIMO_NOMBRE,
  VALORES_INICIALES,
  normalizarCampo,
  validarCampo,
} from '../utils/preMatricula.js'
import { enviarSolicitud, erroresDelFormulario } from '../services/prematriculaApi.js'
import { mensajeDeError } from '../services/http.js'

const validarConNiveles = (nombre, valor) => validarCampo(nombre, valor, niveles)

// HU-11 + HU-25: formulario de pre-matrícula conectado a la API (POST /prematriculas).
// Estado y eventos: hooks/useFormularioDemo.js. Este componente no guarda nada en el
// navegador; al confirmar se borra lo escrito y se muestra el código de seguimiento.
export default function FormPreMatricula({ onCreada }) {
  const { confirmado, enviando, errorEnvio, resultado, refConfirmacion, manejarEnvio, propsCampo } = useFormularioDemo({
    idFormulario: 'pre-matricula',
    campos: CAMPOS,
    valoresIniciales: VALORES_INICIALES,
    validarCampo: validarConNiveles,
    normalizarCampo,
    enviar: async (valores) => {
      const creada = await enviarSolicitud(valores)
      onCreada(creada.codigo)
      return creada
    },
    erroresDeApi: erroresDelFormulario, // un 400 de la API se muestra junto a cada campo
  })

  return (
    <FormularioDemo
      id="pre-matricula"
      titulo="Formulario de pre-matrícula"
      aviso={
        <>
          Tu solicitud queda <strong>registrada en el jardín</strong> y recibirás un código para consultar su estado.
          Este portal es una demostración: usa datos ficticios y no ingreses datos reales de niños o niñas.
        </>
      }
      mensajeConfirmacion={
        resultado && (
          <>
            Solicitud recibida. Tu código de seguimiento es{' '}
            <span className="form-demo__codigo">{resultado.codigo}</span>
            <br />
            <span className="fw-normal">
              Guárdalo: con este código y tu correo puedes consultar el estado en «Consultar mi solicitud».
            </span>
          </>
        )
      }
      textoBoton="Enviar pre-matrícula"
      textoEnviando="Enviando solicitud…"
      confirmado={confirmado}
      enviando={enviando}
      errorEnvio={errorEnvio && `La solicitud no se envió. ${mensajeDeError(errorEnvio)}`}
      refConfirmacion={refConfirmacion}
      onSubmit={manejarEnvio}
    >
      <fieldset className="form-demo__grupo">
        <legend>Datos del apoderado</legend>
        <FormField
          label="Nombre completo"
          {...propsCampo('nombreApoderado')}
          required
          autoComplete="name"
          maxLength={LARGO_MAXIMO_NOMBRE}
        />
        <FormField
          label="RUT"
          {...propsCampo('rut')}
          required
          ayuda="Con o sin puntos y guion. Ejemplo: 12.345.678-5"
          autoComplete="off"
        />
        <FormField
          label="Correo electrónico"
          type="email"
          {...propsCampo('correo')}
          required
          ayuda="Lo necesitarás junto al código para consultar el estado."
          autoComplete="email"
          inputMode="email"
        />
        <FormField
          label="Teléfono"
          type="tel"
          {...propsCampo('telefono')}
          required
          ayuda="Celular o fijo chileno de 9 dígitos. Ejemplo: +56 9 1234 5678"
          autoComplete="tel"
          inputMode="tel"
        />
      </fieldset>

      <fieldset className="form-demo__grupo">
        <legend>Datos del párvulo</legend>
        <FormField
          label="Nombre del párvulo"
          {...propsCampo('nombreParvulo')}
          required
          autoComplete="off"
          maxLength={LARGO_MAXIMO_NOMBRE}
        />
        <FormField label="Nivel al que postula" type="select" {...propsCampo('nivel')} required opciones={niveles} />
        <FormField
          label="Comentarios"
          type="textarea"
          {...propsCampo('comentario')}
          maxLength={LARGO_MAXIMO_COMENTARIO}
        />
      </fieldset>

      <FormField
        label="Acepto que el jardín use estos datos solo para gestionar esta solicitud de pre-matrícula y contactarme sobre ella."
        type="checkbox"
        {...propsCampo('consentimiento')}
        required
      />
    </FormularioDemo>
  )
}
