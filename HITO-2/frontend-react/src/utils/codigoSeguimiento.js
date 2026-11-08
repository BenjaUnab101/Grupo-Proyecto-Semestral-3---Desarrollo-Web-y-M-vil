// HU-25: recuerda en este navegador SOLO el código de la última solicitud (ej. "PM-7K3Q9X"),
// para no perderlo al recargar la página. Ningún dato personal se guarda aquí; el estado
// siempre se pide a la API. Si el navegador no permite guardar (modo privado), no pasa nada.
const CLAVE = 'pequenos-reyes:codigo-prematricula'

export function leerCodigoGuardado() {
  try {
    return window.localStorage.getItem(CLAVE) ?? ''
  } catch {
    return ''
  }
}

export function guardarCodigo(codigo) {
  try {
    window.localStorage.setItem(CLAVE, codigo)
  } catch {
    // sin almacenamiento: el código igual se ve en pantalla para anotarlo
  }
}
