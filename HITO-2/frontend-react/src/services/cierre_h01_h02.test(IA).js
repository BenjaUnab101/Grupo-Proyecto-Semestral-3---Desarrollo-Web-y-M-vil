// Cierre H-01/H-02/H-03 (Sprint 3): las pantallas heredadas usan la sesión, no X-Rol.
import test, { afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { establecerToken } from './http.js'
import { crearActividad, crearOrganizador, inscribirEnEvento, obtenerPagosInscripciones, registrarPagoInscripcion } from './eventosApi.js'
import { crearDocumento } from './documentosApi.js'

const leer = (ruta) => readFileSync(new URL(ruta, import.meta.url), 'utf8')
const sinComentarios = (codigo) => codigo.replace(/\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
const fetchOriginal = globalThis.fetch
afterEach(() => {
  globalThis.fetch = fetchOriginal
  establecerToken(null)
})

function capturar() {
  const llamadas = []
  globalThis.fetch = async (url, opciones = {}) => {
    llamadas.push({ url: String(url), opciones })
    return new Response(JSON.stringify({ id: 1 }), { status: 200 })
  }
  return llamadas
}

test('H-01: con sesión, las escrituras heredadas envían Bearer y nunca X-Rol', async () => {
  const llamadas = capturar()
  establecerToken('tok-sesion')
  await crearOrganizador({ nombre: 'Demo' })
  await crearActividad({ titulo: 'Demo' })
  await crearDocumento({ titulo: 'Demo' })
  await registrarPagoInscripcion({ actividad_id: 1 })
  for (const { opciones } of llamadas) {
    assert.equal(opciones.headers.Authorization, 'Bearer tok-sesion')
    assert.equal(opciones.headers['X-Rol'], undefined)
  }
})

test('H-02: el apoderado no envía apoderado_id; el personal puede indicarlo', async () => {
  const llamadas = capturar()
  await inscribirEnEvento(5, 7)
  assert.deepEqual(JSON.parse(llamadas[0].opciones.body), { alumno_id: 7 })
  await inscribirEnEvento(5, 7, 3)
  assert.deepEqual(JSON.parse(llamadas[1].opciones.body), { alumno_id: 7, apoderado_id: 3 })
})

test('H-02: sin sesión, la API responde 401 y el servicio lo propaga', async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ detail: 'Debes iniciar sesión' }), { status: 401 })
  await assert.rejects(() => obtenerPagosInscripciones(), (e) => e.estado === 401)
})

test('H-01/H-03: no quedan X-Rol ni selectores de rol en servicios ni pantallas heredadas', () => {
  const archivos = ['./eventosApi.js', './documentosApi.js', '../components/GestionActividades.jsx',
    '../components/GestionOrganizadores.jsx', '../components/Documentos.jsx', '../components/FlujoInscripcionEventos.jsx']
  for (const archivo of archivos) {
    const codigo = sinComentarios(leer(archivo))
    assert.doesNotMatch(codigo, /X-Rol/, archivo)
    assert.doesNotMatch(codigo, /selector-rol-hu/, archivo)
    assert.doesNotMatch(codigo, /fetch\(/, archivo)
  }
})
