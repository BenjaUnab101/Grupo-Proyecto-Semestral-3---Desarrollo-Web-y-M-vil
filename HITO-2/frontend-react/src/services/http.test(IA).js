// TEC-17: pruebas del cliente HTTP y de los servicios, con fetch simulado.
import test, { afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { API_URL, ErrorApi, erroresPorCampo, pedir } from './http.js'
import { aComunicado, listarComunicados, publicarComunicado } from './comunicadosApi.js'
import { aActividad, inscribir } from './actividadesApi.js'
import { aPerfil } from './sesionApi.js'

const fetchOriginal = globalThis.fetch
afterEach(() => {
  globalThis.fetch = fetchOriginal
})

// Reemplaza fetch por una respuesta fija y guarda la última solicitud.
function simular(estado, cuerpo) {
  const llamada = {}
  globalThis.fetch = async (url, opciones) => {
    Object.assign(llamada, { url, opciones })
    return new Response(cuerpo === undefined ? null : JSON.stringify(cuerpo), { status: estado })
  }
  return llamada
}

async function errorDe(promesa) {
  try {
    await promesa
  } catch (error) {
    return error
  }
  assert.fail('se esperaba un error')
}

// ---------- CA1: URL, parámetros y encabezados ----------

test('CA1: usa la URL base, omite parámetros vacíos y envía X-Usuario-Id', async () => {
  const llamada = simular(200, [])
  await pedir('/comunicados', { parametros: { nivel: '', vigentes: true }, usuarioId: 7 })
  assert.equal(API_URL, 'http://localhost:8000/api/v1')
  assert.equal(llamada.url, `${API_URL}/comunicados?vigentes=true`)
  assert.equal(llamada.opciones.headers['X-Usuario-Id'], '7')
})

test('CA1: POST envía el cuerpo en JSON; 204 devuelve null', async () => {
  const llamada = simular(201, { ok: true })
  await pedir('/x', { metodo: 'POST', cuerpo: { a: 1 } })
  assert.equal(llamada.opciones.method, 'POST')
  assert.equal(llamada.opciones.body, '{"a":1}')
  assert.equal(llamada.opciones.headers['Content-Type'], 'application/json')
  simular(204)
  assert.equal(await pedir('/comunicados/1', { metodo: 'DELETE' }), null)
})

// ---------- CA3: 400 / 401 / 403 / 409 / 5xx / sin conexión ----------

test('CA3: 400 trae los errores por campo, traducidos', async () => {
  simular(400, {
    detail: 'Datos de entrada inválidos',
    errores: [
      { campo: 'body.titulo', mensaje: 'String should have at least 3 characters' },
      { campo: 'body.rut', mensaje: 'Value error, El dígito verificador no corresponde a este RUT. Revísalo.' },
      { campo: 'body.nivel', mensaje: "Input should be 'General', 'Salas TEL' or 'Preescolar'" },
    ],
  })
  const error = await errorDe(pedir('/comunicados', { metodo: 'POST', cuerpo: {} }))
  assert.ok(error instanceof ErrorApi)
  assert.equal(error.estado, 400)
  assert.deepEqual(erroresPorCampo(error), {
    titulo: 'Debe tener al menos 3 caracteres.',
    rut: 'El dígito verificador no corresponde a este RUT. Revísalo.',
    nivel: 'El valor no es válido.',
  })
})

test('CA3: 401 y 403 tienen su propio mensaje', async () => {
  simular(401, { detail: 'Debe identificarse' })
  assert.match((await errorDe(pedir('/x'))).message, /elegir una cuenta/)
  simular(403, { detail: 'Sin permiso para esta acción' })
  assert.equal((await errorDe(pedir('/x'))).message, 'Sin permiso para esta acción')
})

test('CA3: 409 muestra el motivo que da la API', async () => {
  simular(409, { detail: 'No quedan cupos disponibles para esta actividad' })
  const error = await errorDe(inscribir(3, 1, 1, 5))
  assert.equal(error.estado, 409)
  assert.equal(error.message, 'No quedan cupos disponibles para esta actividad')
})

test('CA3: 503 -> servicio no disponible', async () => {
  simular(503, { detail: 'Base de datos caída' })
  const error = await errorDe(pedir('/actividades'))
  assert.equal(error.estado, 500)
  assert.match(error.message, /no está disponible/)
})

test('CA3: sin internet o servidor apagado -> estado 0 y mensaje de conexión', async () => {
  globalThis.fetch = async () => {
    throw new TypeError('Failed to fetch')
  }
  const error = await errorDe(pedir('/actividades'))
  assert.equal(error.estado, 0)
  assert.match(error.message, /No hay conexión/)
})

// ---------- Conversión de datos de la API ----------

test('comunicado: snake_case -> props de ComunicadoCard; fecha en hora de Chile', async () => {
  const dto = { id: 4, titulo: 'Corte de agua', cuerpo: 'Texto', nivel: 'General', alcance: null, categoria: 'Aviso',
    es_urgente: true, fecha_publicacion: '2026-11-07T01:30:00Z', autor_usuario_id: 2 }
  const c = aComunicado(dto)
  assert.equal(c.fecha, '2026-11-06') // 01:30 UTC del 7 = 22:30 del 6 en Chile
  assert.equal(c.esUrgente, true)
  assert.equal('autor_usuario_id' in c, false)
  simular(200, [dto])
  assert.deepEqual(await listarComunicados(), [c])
})

test('publicar comunicado: POST con la cuenta elegida', async () => {
  const llamada = simular(201, { id: 9, titulo: 'Hola', cuerpo: 'x', nivel: 'General', categoria: 'Aviso', es_urgente: false, fecha_publicacion: '2026-11-07T15:00:00Z' })
  await publicarComunicado({ titulo: 'Hola', cuerpo: 'x', nivel: 'General', esUrgente: false }, 3)
  assert.equal(llamada.opciones.headers['X-Usuario-Id'], '3')
  assert.equal(JSON.parse(llamada.opciones.body).categoria, 'Aviso')
})

test('actividad y perfil', () => {
  const actividad = aActividad({ id: 1, titulo: 'Taller', descripcion: 'Traer delantal', fecha: '2026-11-20', hora: '18:30:00',
    lugar: 'Patio', cupo_maximo: 10, cupos_disponibles: 6, inscripciones_abiertas: true })
  assert.equal(actividad.hora, '18:30')
  assert.equal(actividad.preparar, 'Traer delantal')
  assert.equal(aActividad({ ...actividad, hora: null }).hora, undefined)

  const direccion = aPerfil({ usuario_id: 2, rol: 'administrador', nombre: 'Dirección', apoderado_id: null, hijos: [] })
  assert.equal(direccion.esEditor, true)
  const educadora = aPerfil({ usuario_id: 3, rol: 'organizador', nombre: 'Educadora', apoderado_id: null, hijos: [] })
  assert.equal(educadora.esEditor, true)
  const apoderada = aPerfil({ usuario_id: 4, rol: 'apoderado', nombre: 'Apoderada', apoderado_id: 1, hijos: [] })
  assert.equal(apoderada.esEditor, false)
})

// ---------- CA1 / CA2 / CA4: estructura del código ----------

const SRC = fileURLToPath(new URL('..', import.meta.url))
const archivos = (carpeta) =>
  readdirSync(carpeta).flatMap((nombre) => {
    const ruta = join(carpeta, nombre)
    return statSync(ruta).isDirectory() ? archivos(ruta) : [ruta]
  })
const codigo = archivos(SRC).filter((r) => /\.jsx?$/.test(r) && !r.includes('.test('))
const leer = (ruta) => readFileSync(ruta, 'utf8')

test('CA1: solo services/ llama a fetch', () => {
  for (const ruta of codigo.filter((r) => /\bfetch\s*\(/.test(leer(r)))) {
    assert.match(ruta.slice(SRC.length), /^services[\\/]/, `${ruta} llama a fetch fuera de services/`)
  }
})

test('CA2: la app ya no importa los JSON de salas, actividades ni comunicados', () => {
  for (const ruta of codigo) assert.doesNotMatch(leer(ruta), /data\/(salas|actividades|comunicados)\.json/, ruta)
})

test('CA4: las secciones con datos de la API están en pages/ y usan useRecurso', () => {
  for (const pagina of ['CuposSeccion', 'ComunicadosSeccion', 'CalendarioSeccion']) {
    assert.match(leer(join(SRC, 'pages', `${pagina}.jsx`)), /useRecurso\(/)
  }
})
