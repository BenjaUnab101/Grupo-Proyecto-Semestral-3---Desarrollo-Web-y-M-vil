import '../styles/Formulario.css'

// HU-11: campo de formulario reutilizable y controlado.
// Props del contrato: label, name, type, value, error, onChange, onBlur.
// Props opcionales: id (por defecto "campo-<name>"; si hay dos formularios en la misma
// página, cada uno debe entregar ids distintos), required, ayuda (texto de apoyo),
// opciones (para type="select"),
// y cualquier atributo extra del input (autoComplete, inputMode, maxLength…).
//
// Accesibilidad: el <label> está asociado por htmlFor/id; si hay error, el input
// queda con aria-invalid="true" y aria-describedby apunta al mensaje de error
// (y a la ayuda, si existe), así el lector de pantalla los lee al enfocar el campo.
export default function FormField({
  id: idRecibido,
  label,
  name,
  type = 'text',
  value,
  error,
  onChange,
  onBlur,
  required = false,
  ayuda,
  opciones = [],
  ...atributos
}) {
  const id = idRecibido ?? `campo-${name}`
  const idAyuda = ayuda ? `${id}-ayuda` : null
  const idError = error ? `${id}-error` : null
  const describedBy = [idAyuda, idError].filter(Boolean).join(' ') || undefined

  const propsComunes = {
    id,
    name,
    value,
    onChange,
    onBlur,
    required,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy,
    className: `campo__control${error ? ' campo__control--error' : ''}`,
    ...atributos,
  }

  let control
  if (type === 'select') {
    control = (
      <select {...propsComunes}>
        <option value="">Selecciona una opción</option>
        {opciones.map((opcion) => (
          <option key={opcion.id} value={opcion.id}>
            {opcion.nombre}
          </option>
        ))}
      </select>
    )
  } else if (type === 'textarea') {
    control = <textarea rows={3} {...propsComunes} />
  } else {
    control = <input type={type} {...propsComunes} />
  }

  return (
    <div className="campo">
      <label htmlFor={id} className="campo__etiqueta">
        {label}
        {required ? (
          <span className="campo__marca" aria-hidden="true"> *</span>
        ) : (
          <span className="campo__opcional"> (opcional)</span>
        )}
      </label>

      {control}

      {ayuda && (
        <p id={idAyuda} className="campo__ayuda">
          {ayuda}
        </p>
      )}

      {/* Render condicional: el mensaje solo existe cuando hay error. */}
      {error && (
        <p id={idError} className="campo__error">
          {error}
        </p>
      )}
    </div>
  )
}
