// Autenticación y portal de apoderados (HU-16). Según el diagrama de arquitectura:
//   PortalApoderados → hooks/useSesionApoderado.js → services/auth.js → API (/auth, /portal)
// La contraseña se valida en el servidor contra un hash PBKDF2; aquí solo viaja por HTTP.
import { pedir } from './http.js'

export const ETIQUETA_ROL = { apoderado: 'Apoderado', organizador: 'Personal del jardín', administrador: 'Dirección' }

// Respuesta de la API -> perfil que usa React.
export function aPerfil(dto) {
  return {
    usuarioId: dto.usuario_id,
    email: dto.email,
    rol: dto.rol,
    nombre: dto.nombre,
    apoderadoId: dto.apoderado_id,
    hijos: dto.hijos ?? [],
    esEditor: dto.rol === 'administrador' || dto.rol === 'organizador', // publica comunicados y gestiona actividades
    esDireccion: dto.rol === 'administrador', // revisa pre-matrículas, organizadores y pagos
  }
}

export async function iniciarSesion(email, password) {
  const datos = await pedir('/auth/login', { metodo: 'POST', cuerpo: { email, password } })
  return { token: datos.token, expiraEn: datos.expira_en, perfil: aPerfil(datos.perfil) }
}

// El token ya va en Authorization (http.js). Revoca la sesión EN EL SERVIDOR.
export async function cerrarSesion() {
  await pedir('/auth/logout', { metodo: 'POST' })
}

export async function obtenerPerfil() {
  return aPerfil(await pedir('/auth/yo'))
}

// Solo development/test: correos de las cuentas ficticias para la pantalla de login
// (nunca contraseñas). En producción la API responde 404 y la lista no se muestra.
export async function listarCuentasPrueba() {
  const datos = await pedir('/auth/cuentas-prueba')
  return { claveConfigurada: datos.clave_configurada, cuentas: datos.cuentas }
}

export function aAlumnoPortal(dto) {
  return { id: dto.id, codigo: dto.codigo, nombre: dto.nombre, parentesco: dto.parentesco, sala: dto.sala, nivel: dto.nivel }
}

export async function listarMisAlumnos() {
  return (await pedir('/portal/alumnos')).map(aAlumnoPortal)
}

export async function obtenerFicha(alumnoId) {
  const dto = await pedir(`/portal/alumnos/${alumnoId}`)
  return {
    ...aAlumnoPortal(dto),
    anioEscolar: dto.anio_escolar,
    estadoMatricula: dto.estado_matricula,
    inscripciones: dto.inscripciones.map((i) => ({ actividadId: i.actividad_id, titulo: i.titulo, fecha: i.fecha, estado: i.estado })),
  }
}