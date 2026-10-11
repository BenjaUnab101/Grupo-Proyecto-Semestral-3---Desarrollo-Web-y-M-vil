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

export const MENSAJE_DEMO = 'Demostración: solicitud validada, no enviada al jardín'

const validarConNiveles = (nombre, valor) => validarCampo(nombre, valor, niveles)

// HU-11: formulario controlado de pre-matrícula (DEMO).
// Estado y eventos: hooks/useFormularioDemo.js (valores, errores, onChange/onBlur/onSubmit).
// Privacidad: los datos solo viven en ese estado mientras se escribe. No se envían
// por red ni se guardan; al confirmar se borran.
export default function FormPreMatricula() {
  const { confirmado, refConfirmacion, manejarEnvio, propsCampo } = useFormularioDemo({
    idFormulario: 'pre-matricula',
    campos: CAMPOS,
    valoresIniciales: VALORES_INICIALES,
    validarCampo: validarConNiveles,
    normalizarCampo,
  })

  return (
    <FormularioDemo
      id="pre-matricula"
      titulo="Formulario de pre-matrícula (demo)"
      aviso={
        <>
          Esta es una demostración: la información <strong>no se envía al jardín ni se guarda</strong>.
          Para probarla, usa datos ficticios y no ingreses datos reales de niños o niñas.
        </>
      }
      mensajeConfirmacion={MENSAJE_DEMO}
      textoBoton="Confirmar pre-matrícula (demo)"
      confirmado={confirmado}
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
    </FormularioDemo>
  )
}
