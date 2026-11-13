// Utilidades para validar y formatear RUT chileno (uso exclusivamente demo/simulado).

// Quita puntos, guion y espacios; deja el dígito verificador en mayúscula.
export function limpiarRut(valor) {
  if (typeof valor !== 'string') return ''
  return valor.replace(/[.\s]/g, '').replace('-', '').toUpperCase()
}

// Calcula el dígito verificador (módulo 11) para el número de un RUT sin DV.
export function calcularDigitoVerificador(numero) {
  const digitos = String(numero).split('').reverse()
  const multiplicadores = [2, 3, 4, 5, 6, 7]

  let suma = 0
  digitos.forEach((digito, indice) => {
    const multiplicador = multiplicadores[indice % multiplicadores.length]
    suma += Number(digito) * multiplicador
  })

  const resto = 11 - (suma % 11)
  if (resto === 11) return '0'
  if (resto === 10) return 'K'
  return String(resto)
}

// Verifica estructura (7-8 dígitos + DV) y que el DV calculado coincida.
export function validarRut(valor) {
  const rutLimpio = limpiarRut(valor)
  if (!/^\d{7,8}[0-9K]$/.test(rutLimpio)) return false

  const numero = rutLimpio.slice(0, -1)
  const dv = rutLimpio.slice(-1)
  return calcularDigitoVerificador(numero) === dv
}

// Formatea a "12.345.678-5". Si el RUT no es válido devuelve null.
export function formatearRut(valor) {
  if (!validarRut(valor)) return null

  const rutLimpio = limpiarRut(valor)
  const numero = rutLimpio.slice(0, -1)
  const dv = rutLimpio.slice(-1)

  const numeroFormateado = numero
    .split('')
    .reverse()
    .reduce((acumulado, digito, indice) => {
      const separador = indice > 0 && indice % 3 === 0 ? '.' : ''
      return digito + separador + acumulado
    }, '')

  return `${numeroFormateado}-${dv}`
}
