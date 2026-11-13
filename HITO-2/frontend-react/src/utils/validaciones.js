// Validaciones compartidas por los formularios demo del portal (HU-11 pre-matrícula,
// HU-12 contacto). Funciones puras, sin React. Cada validador devuelve un mensaje de
// error o null si el valor es válido. Cada formulario solo define sus campos y textos.
import { formatearRut, limpiarRut, validarRut } from './rut.js'

// ---------- Utilidades de texto ----------

// Recorta espacios; cualquier valor que no sea texto se trata como vacío.
export function recortar(valor) {
  return typeof valor === 'string' ? valor.trim() : ''
}

// Cuenta caracteres reales después de recortar ("á" o un emoji cuentan como 1).
export function contarCaracteres(valor) {
  return [...recortar(valor)].length
}

// ---------- Reglas genéricas ----------

// Un texto con solo espacios cuenta como vacío.
export function validarObligatorio(valor, mensaje = 'Este campo es obligatorio.') {
  return recortar(valor) === '' ? mensaje : null
}

export function validarLargoMinimo(valor, minimo, nombreCampo = 'El texto') {
  const largo = contarCaracteres(valor)
  if (largo >= minimo) return null
  const faltan = minimo - largo
  return `${nombreCampo} debe tener al menos ${minimo} caracteres (te ${faltan === 1 ? 'falta 1' : `faltan ${faltan}`}).`
}

export function validarLargoMaximo(valor, maximo, nombreCampo = 'El texto') {
  return contarCaracteres(valor) > maximo ? `${nombreCampo} puede tener hasta ${maximo} caracteres.` : null
}

// ---------- RUT ----------
// Usa utils/rut.js (módulo 11, acepta DV "K"/"k", con o sin puntos y guion).

export function validarRutCampo(valor) {
  const recortado = recortar(valor)
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

export function normalizarRut(valor) {
  const recortado = recortar(valor)
  return formatearRut(recortado) ?? recortado
}

// ---------- Correo ----------
// Regla práctica: algo@dominio.ext, sin espacios, con una extensión de 2 o más letras.
// Solo se revisa el formato: no se verifica que el correo exista (se puede probar
// con uno ficticio como demo@ejemplo.cl).

const PATRON_CORREO = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[A-Za-z]{2,}$/

export function validarCorreo(valor) {
  const correo = recortar(valor)
  if (correo.length > 254 || !PATRON_CORREO.test(correo) || correo.includes('..')) {
    return 'El correo no es válido. Usa el formato nombre@dominio.cl.'
  }
  return null
}

// ---------- Teléfono chileno ----------
// Regla documentada (docs/HU-11-pre-matricula.md):
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
  const numero = limpiarTelefono(recortar(valor))
  if (!/^[2-9]\d{8}$/.test(numero)) {
    return 'El teléfono debe ser chileno de 9 dígitos, por ejemplo +56 9 1234 5678.'
  }
  return null
}

// "912345678" → "+56 9 1234 5678"; fijo de Santiago "221234567" → "+56 2 2123 4567";
// otros fijos "322123456" → "+56 32 212 3456". Si no es válido, devuelve el texto sin cambios.
export function formatearTelefono(valor) {
  if (validarTelefono(valor)) return valor
  const n = limpiarTelefono(recortar(valor))
  if (n[0] === '9' || n[0] === '2') return `+56 ${n[0]} ${n.slice(1, 5)} ${n.slice(5)}`
  return `+56 ${n.slice(0, 2)} ${n.slice(2, 5)} ${n.slice(5)}`
}

// ---------- Formulario completo ----------

// Aplica `validarCampo(nombre, valor)` a cada campo y devuelve solo los que tienen
// error, por ejemplo { correo: '…' }.
export function validarTodos(campos, valores, validarCampo) {
  const errores = {}
  for (const campo of campos) {
    const mensaje = validarCampo(campo, valores?.[campo])
    if (mensaje) errores[campo] = mensaje
  }
  return errores
}

// Primer campo con error según el orden visual (para mover el foco ahí).
export function primerError(campos, errores) {
  return campos.find((campo) => Boolean(errores?.[campo])) ?? null
}
