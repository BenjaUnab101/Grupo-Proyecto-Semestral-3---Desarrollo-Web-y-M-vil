// HU-11: validaciones puras del formulario de pre-matrícula (sin React).
// Cada validador devuelve un mensaje de error específico o null si el valor es válido.
import { formatearRut, limpiarRut, validarRut } from './rut.js'

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

// ---------- RUT ----------

// Usa utils/rut.js (módulo 11, acepta DV "K"/"k", con o sin puntos y guion).
export function validarRutCampo(valor) {
  const recortado = valor.trim()
  const limpio = limpiarRut(recortado)
  // Si se escribe guion, después debe venir exactamente un dígito verificador.
  // Evita que "12.345.678-" se lea como el RUT 1.234.567-8.
  const guionMalUbicado = recortado.includes('-') && !/^[\d.\s]+-\s*[0-9kK]$/.test(recortado)
  if (guionMalUbicado || !/^\d{7,8}[0-9K]$/.test(limpio)) {
    return 'El RUT debe tener 7 u 8 dígitos y un dígito verificador, por ejemplo 12.345.678-5.'
  }
  if (!validarRut(limpio)) {
    return 'El dígito verificador no corresponde a este RUT. Revísalo.'
  }
  return null
}

// ---------- Correo ----------

// Regla práctica: algo@dominio.ext, sin espacios, con una extensión de 2 o más letras.
const PATRON_CORREO = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[A-Za-z]{2,}$/

export function validarCorreo(valor) {
  const correo = valor.trim()
  if (correo.length > 254 || !PATRON_CORREO.test(correo) || correo.includes('..')) {
    return 'El correo no es válido. Usa el formato nombre@dominio.cl.'
  }
  return null
}

// ---------- Teléfono chileno ----------
//  - Se ignoran espacios, guiones, puntos y paréntesis.
//  - Se acepta el prefijo +56 o 56 (opcional).
//  - Quedan exactamente 9 dígitos y el primero no puede ser 0 ni 1.
//    Esto cubre celulares (9 XXXX XXXX) y teléfonos fijos (2 2XXX XXXX, 32 2XX XXXX…).

export function limpiarTelefono(valor) {
  const soloDigitos = String(valor ?? '').replace(/[\s\-.()]/g, '')
  const sinMas = soloDigitos.startsWith('+') ? soloDigitos.slice(1) : soloDigitos
  return sinMas.length === 11 && sinMas.startsWith('56') ? sinMas.slice(2) : sinMas
}

export function validarTelefono(valor) {
  const numero = limpiarTelefono(valor.trim())
  if (!/^[2-9]\d{8}$/.test(numero)) {
    return 'El teléfono debe ser chileno de 9 dígitos, por ejemplo +56 9 1234 5678.'
  }
  return null
}

// "912345678" → "+56 9 1234 5678"; fijo de Santiago "221234567" → "+56 2 2123 4567";
// otros fijos "322123456" → "+56 32 212 3456". Si no es válido, devuelve el texto sin cambios.
export function formatearTelefono(valor) {
  if (validarTelefono(valor)) return valor
  const n = limpiarTelefono(valor.trim())
  if (n[0] === '9' || n[0] === '2') return `+56 ${n[0]} ${n.slice(1, 5)} ${n.slice(5)}`
  return `+56 ${n.slice(0, 2)} ${n.slice(2, 5)} ${n.slice(5)}`
}

// ---------- Validación por campo y del formulario ----------

export function validarCampo(nombre, valorBruto, niveles = []) {
  const valor = typeof valorBruto === 'string' ? valorBruto.trim() : ''

  // Campo opcional: solo se controla el largo.
  if (nombre === 'comentario') {
    return valor.length > LARGO_MAXIMO_COMENTARIO
      ? `El comentario puede tener hasta ${LARGO_MAXIMO_COMENTARIO} caracteres.`
      : null
  }

  // Obligatorios: un texto con solo espacios cuenta como vacío (trim).
  if (valor === '') return MENSAJES_OBLIGATORIO[nombre] ?? 'Este campo es obligatorio.'

  switch (nombre) {
    case 'nombreApoderado':
    case 'nombreParvulo':
      return valor.length > LARGO_MAXIMO_NOMBRE
        ? `El nombre puede tener hasta ${LARGO_MAXIMO_NOMBRE} caracteres.`
        : null
    case 'rut':
      return validarRutCampo(valor)
    case 'correo':
      return validarCorreo(valor)
    case 'telefono':
      return validarTelefono(valor)
    case 'nivel':
      return niveles.some((nivel) => nivel.id === valor) ? null : 'Selecciona un nivel de la lista.'
    default:
      return null
  }
}

// Devuelve solo los campos con error, por ejemplo { rut: '…', correo: '…' }.
export function validarFormulario(valores, niveles = []) {
  const errores = {}
  for (const campo of CAMPOS) {
    const mensaje = validarCampo(campo, valores?.[campo], niveles)
    if (mensaje) errores[campo] = mensaje
  }
  return errores
}

// Primer campo con error según el orden visual (para mover el foco ahí).
export function primerCampoConError(errores) {
  return CAMPOS.find((campo) => Boolean(errores?.[campo])) ?? null
}

// Normalización al salir de un campo válido: recorta espacios y da formato
// estándar al RUT y al teléfono. Si el valor es inválido se deja tal cual
// para que la persona vea exactamente lo que escribió.
export function normalizarCampo(nombre, valor) {
  if (typeof valor !== 'string') return valor
  const recortado = valor.trim()
  if (nombre === 'rut') return formatearRut(recortado) ?? recortado
  if (nombre === 'telefono') return formatearTelefono(recortado)
  return recortado
}
