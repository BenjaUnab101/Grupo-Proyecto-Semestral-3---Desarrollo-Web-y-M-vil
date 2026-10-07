import apoderados from '../data/apoderados.json'
import { validarRut, limpiarRut } from '../utils/rut.js'

// Autenticación simulada: compara contra el fixture demo, sin backend ni almacenamiento real.
// Acepta RUT o email como identificador. Devuelve el apoderado o null (mensaje de error siempre genérico).
export function autenticar(identificador, clave) {
  if (!identificador || !clave) return null

  const valorBuscado = identificador.trim().toLowerCase()

  const apoderadoEncontrado = apoderados.find((apoderado) => {
    const coincideEmail = apoderado.email.toLowerCase() === valorBuscado
    const coincideRut = validarRut(identificador) && limpiarRut(apoderado.rut) === limpiarRut(identificador)
    return (coincideEmail || coincideRut) && apoderado.clave === clave
  })

  return apoderadoEncontrado ?? null
}
