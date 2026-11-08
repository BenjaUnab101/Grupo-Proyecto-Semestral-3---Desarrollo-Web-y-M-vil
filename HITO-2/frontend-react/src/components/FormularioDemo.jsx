import '../styles/Formulario.css'

// Estructura visual común de los formularios demo (HU-11 y HU-12): título, aviso de
// demostración, mensaje de confirmación, <form noValidate> y botón de envío.
// Los campos (<FormField>) llegan como children.
// HU-25: `enviando` desactiva el botón mientras responde la API y `errorEnvio` muestra
// por qué no se pudo enviar (sin conexión, conflicto…) sin borrar lo escrito.
export default function FormularioDemo({
  id,
  titulo,
  aviso,
  mensajeConfirmacion,
  textoBoton,
  confirmado,
  refConfirmacion,
  enviando = false,
  errorEnvio = null,
  textoEnviando = 'Enviando…',
  onSubmit,
  children,
}) {
  return (
    <div id={id} className="form-demo">
      <h3 className="form-demo__titulo">{titulo}</h3>
      <p className="form-demo__aviso">{aviso}</p>

      {confirmado && (
        <div ref={refConfirmacion} tabIndex={-1} className="form-demo__confirmacion" role="status">
          {mensajeConfirmacion}
        </div>
      )}

      {errorEnvio && (
        <p className="form-demo__error-envio" role="alert">
          {errorEnvio}
        </p>
      )}

      {/* noValidate: la validación la hace React con mensajes propios, no el navegador. */}
      <form className="form-demo__form" onSubmit={onSubmit} noValidate>
        {children}

        <p className="form-demo__nota">Los campos marcados con * son obligatorios.</p>

        {/* onMouseDown evita que el campo activo pierda el foco al presionar el botón:
            si no, su mensaje de error aparece, empuja el botón hacia abajo y el clic
            termina fuera de él (había que hacer clic dos veces). El envío valida todo igual. */}
        <button
          type="submit"
          className="btn-institucional-primary form-demo__boton"
          onMouseDown={(evento) => evento.preventDefault()}
          disabled={enviando}
          aria-busy={enviando}
        >
          {enviando ? textoEnviando : textoBoton}
        </button>
      </form>
    </div>
  )
}
