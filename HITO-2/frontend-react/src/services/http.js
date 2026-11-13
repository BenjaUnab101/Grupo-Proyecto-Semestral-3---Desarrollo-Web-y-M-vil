// TEC-17: cliente HTTP para la API propia (FastAPI).
// Todas las llamadas a la API pasan por pedir(): los componentes nunca usan fetch directo.

// import.meta.env solo existe en Vite; en las pruebas con Node es undefined.
export const API_URL =
  import.meta.env?.VITE_API_WEB ||
  import.meta.env?.VITE_API_URL ||
  'http://localhost:8000/api/v1'

// Mensaje para el usuario según el código HTTP.
const MENSAJES = {
  0: 'No hay conexión con el servidor. Revisa tu internet e intenta de nuevo.',
  400: 'Hay datos que corregir. Revisa los campos marcados.',
  401: 'Debes iniciar sesión para realizar esta acción.',
  403: 'Tu cuenta no tiene permiso para realizar esta acción.',
  404: 'No encontramos lo que buscabas.',
  409: 'No se pudo completar la acción por un conflicto con los datos actuales.',
  500: 'El servicio no está disponible en este momento. Intenta más tarde.',
}

// Error de la API. `estado` es el código HTTP (0 = sin conexión).
export class ErrorApi extends Error {
  constructor(estado, cuerpo = null) {
    // En 403, 404 y 409 la API explica el motivo en español ("No quedan cupos…"): se usa ese texto.
    const explicacion = [403, 404, 409].includes(estado) && typeof cuerpo?.detail === 'string' ? cuerpo.detail : null
    super(explicacion ?? MENSAJES[estado] ?? MENSAJES[500])
    this.estado = estado
    this.errores = cuerpo?.errores ?? [] // errores por campo de un 400: [{ campo, mensaje }]
  }
}

// HU-16: token de la sesión iniciada (POST /auth/login). Vive solo en memoria (no en
// localStorage): al recargar la página hay que volver a iniciar sesión. Lo fija SesionProvider
// y viaja en Authorization; el backend decide los permisos según el rol de esa sesión.
let tokenSesion = null
export function establecerToken(token) {
  tokenSesion = token || null
}

/**
 * Llama a la API. Devuelve la respuesta en JSON o lanza un ErrorApi.
 * @param {string} ruta ej. '/comunicados'
 * @param {object} [opciones] { metodo, cuerpo, parametros }
 */
export async function pedir(ruta, { metodo = 'GET', cuerpo, parametros } = {}) {
  const encabezados = {}
  if (cuerpo !== undefined) encabezados['Content-Type'] = 'application/json'
  if (tokenSesion) encabezados.Authorization = `Bearer ${tokenSesion}`

  // Parámetros de consulta (?estado=recibida). Los vacíos no se envían.
  const consulta = new URLSearchParams(Object.entries(parametros ?? {}).filter(([, valor]) => valor)).toString()
  const url = `${API_URL}${ruta}${consulta ? `?${consulta}` : ''}`

  if (globalThis.navigator?.onLine === false) throw new ErrorApi(0) // el navegador sabe que no hay internet

  let respuesta
  try {
    respuesta = await fetch(url, {
      method: metodo,
      headers: encabezados,
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    })
  } catch {
    throw new ErrorApi(0) // sin internet o servidor apagado
  }

  const datos = respuesta.status === 204 ? null : await respuesta.json().catch(() => null)
  if (!respuesta.ok) throw new ErrorApi(respuesta.status >= 500 ? 500 : respuesta.status, datos)
  return datos
}

// Mensaje para mostrar a partir de cualquier error.
export function mensajeDeError(error) {
  return error instanceof ErrorApi ? error.message : MENSAJES[500]
}

// Errores de un 400 por campo: [{ campo: 'body.titulo', mensaje }] -> { titulo: 'mensaje' }.
export function erroresPorCampo(error) {
  const resultado = {}
  for (const { campo, mensaje } of error?.errores ?? []) {
    const nombre = campo.replace(/^body\.?/, '') || 'general'
    resultado[nombre] ??= traducir(mensaje)
  }
  return resultado
}

// Los mensajes propios de la API ya vienen en español ("Value error, …"); los automáticos
// de FastAPI vienen en inglés y se traducen aquí.
function traducir(mensaje) {
  if (mensaje.startsWith('Value error, ')) return mensaje.slice('Value error, '.length)
  if (mensaje === 'Field required') return 'Este campo es obligatorio.'
  const minimo = mensaje.match(/at least (\d+) character/)
  if (minimo) return `Debe tener al menos ${minimo[1]} caracteres.`
  const maximo = mensaje.match(/at most (\d+) character/)
  if (maximo) return `Puede tener como máximo ${maximo[1]} caracteres.`
  return 'El valor no es válido.'
}