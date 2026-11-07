// TEC-17: sesión DEMO. Aún no hay login: se elige una cuenta ficticia (@ejemplo.cl) y su id
// viaja en el encabezado X-Usuario-Id. Los permisos los decide el backend.
import { pedir } from './http.js'

export const ETIQUETA_ROL = { apoderado: 'Apoderado', organizador: 'Personal del jardín', administrador: 'Dirección' }

export async function listarCuentasDemo() {
  const cuentas = await pedir('/sesion/cuentas-demo')
  return cuentas.map((c) => ({ usuarioId: c.usuario_id, rol: c.rol, nombre: c.nombre }))
}

export function aPerfil(dto) {
  return {
    usuarioId: dto.usuario_id,
    rol: dto.rol,
    nombre: dto.nombre,
    apoderadoId: dto.apoderado_id,
    hijos: dto.hijos,
    esEditor: dto.rol === 'administrador' || dto.rol === 'organizador', // publica comunicados
  }
}

export async function obtenerPerfil(usuarioId) {
  return aPerfil(await pedir('/sesion/yo', { usuarioId }))
}
