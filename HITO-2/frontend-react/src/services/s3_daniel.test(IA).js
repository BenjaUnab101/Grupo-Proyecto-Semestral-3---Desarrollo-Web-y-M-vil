// Sprint 3 · Daniel: pruebas de los servicios de HU-16 (login), HU-22/24 (panel y bitácora)
// y HU-26 (contacto), con fetch simulado. Datos ficticios.
import test, { afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { API_URL, establecerToken, pedir } from './http.js'
import { cerrarSesion, iniciarSesion, listarCuentasPrueba, listarMisAlumnos, obtenerFicha } from './auth.js'
import { aConsultaIn, cambiarEstadoConsulta, enviarConsulta, erroresDelContacto, listarConsultas } from './contactoApi.js'
import { aPanel, obtenerBitacora, obtenerHistorial, obtenerPanel } from './panelApi.js'

const leer = (ruta) => readFileSync(new URL(ruta, import.meta.url), 'utf8')
const sinComentarios = (codigo) => codigo.replace(/\/\/.*$/gm, '')
const fetchOriginal = globalThis.fetch
afterEach(() => {
  globalThis.fetch = fetchOriginal
  establecerToken(null)
})

function simular(estado, cuerpo) {
  const llamadas = []
  globalThis.fetch = async (url, opciones) => {
    llamadas.push({ url, opciones })
    return new Response(cuerpo === undefined ? null : JSON.stringify(cuerpo), { status: estado })
  }
  return llamadas
}

const PERFIL = { usuario_id: 3, email: 'ap@ejemplo.cl', rol: 'apoderado', nombre: 'Apoderado Demo', apoderado_id: 9, hijos: [] }

// ---------- HU-16: token Bearer en memoria ----------

test('HU-16: login envía email+contraseña por POST y devuelve token y perfil', async () => {
  const llamadas = simular(200, { token: 'tok-1', tipo: 'bearer', expira_en: '2026-11-08T20:00:00Z', perfil: PERFIL })
  const sesion = await iniciarSesion('ap@ejemplo.cl', 'clave-ficticia')
  assert.equal(llamadas[0].url, `${API_URL}/auth/login`)
  assert.equal(llamadas[0].opciones.method, 'POST')
  assert.deepEqual(JSON.parse(llamadas[0].opciones.body), { email: 'ap@ejemplo.cl', password: 'clave-ficticia' })
  assert.equal(sesion.token, 'tok-1')
  assert.equal(sesion.perfil.apoderadoId, 9)
})

test('HU-16: pedir() envía Authorization solo cuando hay sesión y nunca X-Usuario-Id', async () => {
  const llamadas = simular(200, [])
  establecerToken('tok-2')
  await pedir('/portal/alumnos')
  assert.equal(llamadas[0].opciones.headers.Authorization, 'Bearer tok-2')
  assert.equal(llamadas[0].opciones.headers['X-Usuario-Id'], undefined)
  establecerToken(null)
  await pedir('/x')
  assert.equal(llamadas[1].opciones.headers.Authorization, undefined)
  assert.equal(llamadas[1].opciones.headers['X-Usuario-Id'], undefined)
})

test('HU-16: cuentas de prueba para la pantalla de login (sin contraseñas)', async () => {
  const llamadas = simular(200, { clave_configurada: true, cuentas: [{ email: 'ap@ejemplo.cl', rol: 'apoderado', nombre: 'Apoderado Demo' }] })
  const datos = await listarCuentasPrueba()
  assert.equal(llamadas[0].url, `${API_URL}/auth/cuentas-prueba`)
  assert.equal(datos.claveConfigurada, true)
  assert.equal(datos.cuentas[0].email, 'ap@ejemplo.cl')
})

test('HU-16: logout llama al servidor; credenciales inválidas -> ErrorApi 401', async () => {
  const llamadas = simular(204)
  establecerToken('tok-3')
  await cerrarSesion()
  assert.equal(llamadas[0].url, `${API_URL}/auth/logout`)
  assert.equal(llamadas[0].opciones.headers.Authorization, 'Bearer tok-3')
  simular(401, { detail: 'Correo o contraseña incorrectos' })
  await assert.rejects(iniciarSesion('ap@ejemplo.cl', 'mala'), (e) => e.estado === 401)
})

test('HU-16: hijos y ficha desde la API; 403 de un alumno ajeno llega como error', async () => {
  simular(200, [{ id: 1, codigo: 'DEMO-A01', nombre: 'Alumno Demo 01', parentesco: 'Madre', sala: null, nivel: null }])
  assert.equal((await listarMisAlumnos())[0].codigo, 'DEMO-A01')
  simular(200, { id: 1, codigo: 'DEMO-A01', nombre: 'Alumno Demo 01', parentesco: 'Madre', sala: 'Sala Demo', nivel: 'Kínder',
    anio_escolar: 2026, estado_matricula: 'vigente', inscripciones: [{ actividad_id: 4, titulo: 'Taller', fecha: '2026-11-20', estado: 'inscrita' }] })
  const ficha = await obtenerFicha(1)
  assert.equal(ficha.estadoMatricula, 'vigente')
  assert.equal(ficha.inscripciones[0].actividadId, 4)
  simular(403, { detail: 'No tienes acceso a la ficha de este alumno' })
  await assert.rejects(obtenerFicha(99), (e) => e.estado === 403 && /No tienes acceso/.test(e.message))
})

test('HU-16: el token no se guarda en el navegador y el flujo sigue el diagrama (PortalApoderados -> useSesionApoderado -> auth.js)', () => {
  const codigo = ['./http.js', './auth.js', '../hooks/useSesionApoderado.js', '../context/SesionProvider.jsx',
    '../components/LoginForm.jsx', '../components/PortalApoderados.jsx'].map((a) => sinComentarios(leer(a))).join('\n')
  assert.doesNotMatch(codigo, /localStorage|sessionStorage|document\.cookie/)
  assert.doesNotMatch(codigo, /apoderados\.json|X-Usuario-Id/)
  assert.equal(existsSync(new URL('./authApi.js', import.meta.url)), false)
  assert.equal(existsSync(new URL('./sesionApi.js', import.meta.url)), false)
})

// ---------- HU-26: contacto ----------

test('HU-26: enviar consulta (201) y mapear errores 400 por campo', async () => {
  const llamadas = simular(201, { id: 5, codigo: 'CT-ABC234', estado: 'nuevo', creada_en: '2026-11-08T18:00:00Z' })
  const creada = await enviarConsulta({ nombre: 'Demo', correo: 'demo@ejemplo.cl', telefono: '+56 9 1234 5678', asunto: 'A', mensaje: 'x'.repeat(12), extra: 'no' })
  assert.equal(llamadas[0].url, `${API_URL}/contacto`)
  assert.deepEqual(Object.keys(JSON.parse(llamadas[0].opciones.body)), ['nombre', 'correo', 'telefono', 'asunto', 'mensaje'])
  assert.equal(creada.codigo, 'CT-ABC234')
  assert.deepEqual(Object.keys(aConsultaIn({ nombre: 1, correo: 2, telefono: 3, asunto: 4, mensaje: 5, otro: 6 })), ['nombre', 'correo', 'telefono', 'asunto', 'mensaje'])
  simular(400, { detail: 'Datos de entrada inválidos', errores: [{ campo: 'body.mensaje', mensaje: 'String should have at least 10 characters' }] })
  const error = await enviarConsulta({}).catch((e) => e)
  assert.equal(error.estado, 400)
  assert.equal(erroresDelContacto(error).mensaje, 'Debe tener al menos 10 caracteres.')
})

test('HU-26: dirección filtra y cambia estado; 403 se informa', async () => {
  const llamadas = simular(200, [])
  await listarConsultas('en_gestion')
  assert.equal(llamadas[0].url, `${API_URL}/contacto?estado=en_gestion`)
  simular(403, { detail: 'Tu cuenta no tiene permiso para esta acción' })
  await assert.rejects(cambiarEstadoConsulta(1, 'cerrado', 'ok'), (e) => e.estado === 403)
})

// ---------- HU-24 / HU-22: panel y bitácora ----------

test('HU-24: el panel envía filtros y mapea las agregaciones', async () => {
  const llamadas = simular(200, {
    filtros: {}, totales: { actividades: 1, sin_inscritos: 0, completas: 1, cupo_total: 2, inscritos: 2, cancelados: 0, ocupacion_pct: 100 },
    actividades: [{ id: 1, codigo: 'DEMO-1', titulo: 'T', fecha: '2026-11-20', cupo_maximo: 2, inscripciones_abiertas: true,
      inscritos: 2, cancelados: 0, cupos_disponibles: 0, ocupacion_pct: 100, estado_participacion: 'completa' }],
  })
  const panel = await obtenerPanel({ actividadId: 1, desde: '2026-11-01', hasta: '' })
  assert.equal(llamadas[0].url, `${API_URL}/panel/participacion?actividad_id=1&desde=2026-11-01`)
  assert.equal(panel.totales.ocupacionPct, 100)
  assert.equal(panel.actividades[0].estado, 'completa')
  assert.equal(aPanel({ totales: { ...panel.totales }, actividades: [] }).actividades.length, 0)
})

test('HU-22: historial y bitácora paginados; 503 de Mongo llega como error', async () => {
  const llamadas = simular(200, { total: 21, pagina: 2, tamano: 10, items: [] })
  const historial = await obtenerHistorial({ actividadId: 3, pagina: 2 })
  assert.equal(llamadas[0].url, `${API_URL}/panel/participacion/historial?actividad_id=3&pagina=2&tamano=10`)
  assert.equal(historial.paginas, 3)
  simular(503, { detail: 'La bitácora de auditoría (MongoDB) no está disponible' })
  await assert.rejects(obtenerBitacora({ tipo: 'acceso_login' }), (e) => e.estado === 500)
})