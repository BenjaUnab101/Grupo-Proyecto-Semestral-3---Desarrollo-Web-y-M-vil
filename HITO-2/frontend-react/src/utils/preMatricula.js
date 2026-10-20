// HU-11: configuración del formulario de pre-matrícula (campos, textos y reglas).
// Las reglas en sí (RUT, correo, teléfono, obligatorios, largos) viven en
// utils/validaciones.js y se comparten con el formulario de contacto (HU-12).
import {
  normalizarRut,
  formatearTelefono,
  primerError,
  recortar,
  validarCorreo,
  validarLargoMaximo,
  validarObligatorio,
  validarRutCampo,
  validarTelefono,
  validarTodos,
} from './validaciones.js'

// Se re-exportan para quien ya los importaba desde aquí.
export {
  formatearTelefono,
  limpiarTelefono,
  validarCorreo,
  validarRutCampo,
  validarTelefono,
} from './validaciones.js'

export const LARGO_MAXIMO_NOMBRE = 80
export const LARGO_MAXIMO_COMENTARIO = 300

// Orden de los campos en pantalla: define también a cuál va el foco al confirmar.
export const CAMPOS = ['nombreApoderado', 'rut', 'correo', 'telefono', 'nombreParvulo', 'nivel', 'comentario']

export const VALORES_INICIALES = {
  nombreApoderado: '',
  rut: '',
  correo: '',
  telefono: '',
  nombreParvulo: '',
  nivel: '',
  comentario: '',
}

const MENSAJES_OBLIGATORIO = {
  nombreApoderado: 'Ingresa el nombre del apoderado.',
  rut: 'Ingresa el RUT del apoderado.',
  correo: 'Ingresa un correo de contacto.',
  telefono: 'Ingresa un teléfono de contacto.',
  nombreParvulo: 'Ingresa el nombre del párvulo.',
  nivel: 'Selecciona el nivel al que postula.',
}

export function validarCampo(nombre, valor, niveles = []) {
  // Campo opcional: solo se controla el largo.
  if (nombre === 'comentario') {
    return validarLargoMaximo(valor, LARGO_MAXIMO_COMENTARIO, 'El comentario')
  }

  const vacio = validarObligatorio(valor, MENSAJES_OBLIGATORIO[nombre])
  if (vacio) return vacio

  switch (nombre) {
    case 'nombreApoderado':
    case 'nombreParvulo':
      return validarLargoMaximo(valor, LARGO_MAXIMO_NOMBRE, 'El nombre')
    case 'rut':
      return validarRutCampo(valor)
    case 'correo':
      return validarCorreo(valor)
    case 'telefono':
      return validarTelefono(valor)
    case 'nivel':
      return niveles.some((nivel) => nivel.id === recortar(valor)) ? null : 'Selecciona un nivel de la lista.'
    default:
      return null
  }
}

export function validarFormulario(valores, niveles = []) {
  return validarTodos(CAMPOS, valores, (campo, valor) => validarCampo(campo, valor, niveles))
}

export function primerCampoConError(errores) {
  return primerError(CAMPOS, errores)
}

// Al salir de un campo válido: recorta espacios y da formato al RUT y al teléfono.
export function normalizarCampo(nombre, valor) {
  if (typeof valor !== 'string') return valor
  if (nombre === 'rut') return normalizarRut(valor)
  if (nombre === 'telefono') return formatearTelefono(recortar(valor))
  return recortar(valor)
}
