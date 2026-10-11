// HU-12: configuración del formulario de contacto con la dirección (campos, textos
// y límites). No define reglas propias: usa las de utils/validaciones.js, las mismas
// del formulario de pre-matrícula (HU-11).
import {
  formatearTelefono,
  primerError,
  recortar,
  validarCorreo,
  validarLargoMaximo,
  validarLargoMinimo,
  validarObligatorio,
  validarTelefono,
  validarTodos,
} from './validaciones.js'

export const LARGO_MAXIMO_NOMBRE = 80
export const LARGO_MAXIMO_ASUNTO = 100
// Mínimo documentado (CA2): 9 caracteres no alcanzan, 10 sí. Se cuentan después de
// quitar los espacios del inicio y del final.
export const LARGO_MINIMO_MENSAJE = 10
export const LARGO_MAXIMO_MENSAJE = 1000

// Orden de los campos en pantalla: define también a cuál va el foco al confirmar.
export const CAMPOS_CONTACTO = ['nombre', 'correo', 'telefono', 'asunto', 'mensaje']

export const VALORES_INICIALES_CONTACTO = {
  nombre: '',
  correo: '',
  telefono: '',
  asunto: '',
  mensaje: '',
}

const MENSAJES_OBLIGATORIO = {
  nombre: 'Ingresa tu nombre.',
  correo: 'Ingresa un correo para recibir la respuesta.',
  telefono: 'Ingresa un teléfono de contacto.',
  asunto: 'Ingresa el asunto de tu consulta.',
  mensaje: 'Escribe tu consulta.',
}

export function validarCampoContacto(nombre, valor) {
  const vacio = validarObligatorio(valor, MENSAJES_OBLIGATORIO[nombre])
  if (vacio) return vacio

  switch (nombre) {
    case 'nombre':
      return validarLargoMaximo(valor, LARGO_MAXIMO_NOMBRE, 'El nombre')
    case 'correo':
      return validarCorreo(valor)
    case 'telefono':
      return validarTelefono(valor)
    case 'asunto':
      return validarLargoMaximo(valor, LARGO_MAXIMO_ASUNTO, 'El asunto')
    case 'mensaje':
      return (
        validarLargoMinimo(valor, LARGO_MINIMO_MENSAJE, 'La consulta') ??
        validarLargoMaximo(valor, LARGO_MAXIMO_MENSAJE, 'La consulta')
      )
    default:
      return null
  }
}

export function validarFormularioContacto(valores) {
  return validarTodos(CAMPOS_CONTACTO, valores, validarCampoContacto)
}

export function primerCampoConErrorContacto(errores) {
  return primerError(CAMPOS_CONTACTO, errores)
}

// Al salir de un campo válido: recorta espacios y da formato al teléfono.
// El mensaje solo se recorta en los extremos (se respetan sus saltos de línea).
export function normalizarCampoContacto(nombre, valor) {
  if (typeof valor !== 'string') return valor
  if (nombre === 'telefono') return formatearTelefono(recortar(valor))
  return recortar(valor)
}
