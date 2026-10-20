// Validaciones y formateo para los datos de la ficha de alumno.

function esAsistenciaValida(valor) {
  return typeof valor === 'number' && Number.isFinite(valor) && valor >= 0 && valor <= 100
}

function esAtrasosValido(valor) {
  return typeof valor === 'number' && Number.isInteger(valor) && valor >= 0
}

// Asistencia: porcentaje 0-100. Fuera de rango o no numérico -> "Dato no disponible".
export function formatearAsistencia(valor) {
  if (!esAsistenciaValida(valor)) return 'Dato no disponible'
  return `${valor}%`
}

// Atrasos: entero >= 0. Negativo, decimal o no numérico -> "Dato no disponible".
export function formatearAtrasos(valor) {
  if (!esAtrasosValido(valor)) return 'Dato no disponible'
  return String(valor)
}

// Alerta visual cuando los atrasos superan 2. Un dato inválido no genera alerta.
export function hayAlertaAtrasos(valor) {
  return esAtrasosValido(valor) && valor > 2
}
