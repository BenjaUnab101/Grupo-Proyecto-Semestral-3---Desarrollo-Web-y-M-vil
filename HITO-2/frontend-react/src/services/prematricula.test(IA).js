// HU-25: pruebas del servicio de pre-matrícula (con fetch simulado). Datos ficticios.
import test, { afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { cambiarEstado, consultarSeguimiento, enviarSolicitud, erroresDelFormulario, listarSolicitudes } from './prematriculaApi.js'
import { guardarCodigo, leerCodigoGuardado } from '../utils/codigoSeguimiento.js'
import { VALORES_INICIALES, validarFormulario } from '../utils/preMatricula.js'
import { aPerfil } from './sesionApi.js'

const leer = (ruta) => readFileSync(new URL(ruta, import.meta.url), 'utf8')
const niveles = JSON.parse(leer('../data/niveles.json'))
const VALIDOS = {
  nombreApoderado: 'Familia Demo',
  rut: '12.345.678-5',
  correo: 'familia.demo@ejemplo.cl',
  telefono: '+56 9 1234 5678',
  nombreParvulo: 'Párvulo Demo',
  nivel: 'medio-mayor',
  comentario: '',
  consentimiento: true,
}

const fetchOriginal = globalThis.fetch
afterEach(() => {
  globalThis.fetch = fetchOriginal
})

function simular(estado, cuerpo) {
  const llamada = {}
  globalThis.fetch = async (url, opciones) => {
    Object.assign(llamada, { url, opciones, cuerpo: opciones.body && JSON.parse(opciones.body) })
    return new Response(JSON.stringify(cuerpo), { status: estado })
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

test('CA1: el consentimiento es obligatorio', () => {
  assert.equal(VALORES_INICIALES.consentimiento, false)
  assert.equal(validarFormulario(VALIDOS, niveles).consentimiento, undefined)
  assert.match(validarFormulario({ ...VALIDOS, consentimiento: false }, niveles).consentimiento, /Debes aceptar/)
})

test('CA2: enviarSolicitud hace POST /prematriculas y devuelve código y estado', async () => {
  const llamada = simular(201, { id: 7, codigo: 'PM-7K3Q9X', estado: 'recibida', creada_en: '2026-11-07T14:00:00Z' })
  const creada = await enviarSolicitud(VALIDOS)
  assert.equal(llamada.opciones.method, 'POST')
  assert.match(llamada.url, /\/prematriculas$/)
  assert.deepEqual(llamada.cuerpo, {
    nombre_apoderado: 'Familia Demo', rut: '12.345.678-5', correo: 'familia.demo@ejemplo.cl', telefono: '+56 9 1234 5678',
    nombre_parvulo: 'Párvulo Demo', nivel: 'medio-mayor', comentario: null, consentimiento: true,
  })
  assert.equal(creada.codigo, 'PM-7K3Q9X')
  assert.equal(creada.estado, 'recibida')
})

test('CA4: un 400 de la API se muestra en los campos del formulario', async () => {
  simular(400, {
    detail: 'Datos de entrada inválidos',
    errores: [
      { campo: 'body.rut', mensaje: 'Value error, El dígito verificador no corresponde a este RUT. Revísalo.' },
      { campo: 'body.nombre_parvulo', mensaje: 'String should have at least 1 character' },
    ],
  })
  const error = await errorDe(enviarSolicitud(VALIDOS))
  assert.deepEqual(erroresDelFormulario(error), {
    rut: 'El dígito verificador no corresponde a este RUT. Revísalo.',
    nombreParvulo: 'Debe tener al menos 1 caracteres.',
  })
})

test('409 solicitud repetida: se muestra el motivo de la API', async () => {
  simular(409, { detail: 'Ya existe una solicitud en curso para este párvulo y nivel.' })
  assert.match((await errorDe(enviarSolicitud(VALIDOS))).message, /Ya existe una solicitud en curso/)
})

test('seguimiento: código y correo van en el cuerpo (no en la URL); 404 con el mensaje de la API', async () => {
  const llamada = simular(200, { codigo: 'PM-7K3Q9X', estado: 'en_revision', nivel: 'medio-mayor', mensaje_familia: 'Revisando' })
  const solicitud = await consultarSeguimiento('PM-7K3Q9X', 'familia.demo@ejemplo.cl')
  assert.doesNotMatch(llamada.url, /ejemplo\.cl/)
  assert.deepEqual(llamada.cuerpo, { codigo: 'PM-7K3Q9X', correo: 'familia.demo@ejemplo.cl' })
  assert.equal(solicitud.mensajeFamilia, 'Revisando')

  simular(404, { detail: 'No encontramos una solicitud con ese código y correo. Revisa ambos datos.' })
  assert.match((await errorDe(consultarSeguimiento('PM-ZZZZZZ', 'otra@ejemplo.cl'))).message, /No encontramos/)
})

test('CA3: dirección lista con filtro y cambia el estado con su cuenta; 403 para otros', async () => {
  let llamada = simular(200, [{ id: 3, codigo: 'PM-DEMAA2', estado: 'en_revision', rut: '11111111-1' }])
  const lista = await listarSolicitudes('en_revision', 1)
  assert.match(llamada.url, /\/prematriculas\?estado=en_revision$/)
  assert.equal(llamada.opciones.headers['X-Usuario-Id'], '1')
  assert.equal(lista[0].rut, '11111111-1')

  llamada = simular(200, { id: 3, codigo: 'PM-DEMAA2', estado: 'aceptada' })
  await cambiarEstado(3, 'aceptada', '', 1)
  assert.equal(llamada.opciones.method, 'PATCH')
  assert.deepEqual(llamada.cuerpo, { estado: 'aceptada', mensaje_familia: null })

  simular(403, { detail: 'Solo dirección puede revisar las solicitudes de pre-matrícula' })
  assert.match((await errorDe(listarSolicitudes('', 2))).message, /Solo dirección/)
})

test('código guardado: sin almacenamiento del navegador (Node) no falla', () => {
  assert.equal(leerCodigoGuardado(), '')
  assert.doesNotThrow(() => guardarCodigo('PM-7K3Q9X'))
})

test('privacidad: en el navegador solo se guarda el código; el formulario no usa fetch ni almacenamiento', () => {
  assert.deepEqual(leer('../utils/codigoSeguimiento.js').match(/localStorage\.setItem\([^)]*\)/g), ['localStorage.setItem(CLAVE, codigo)'])
  const formulario = leer('../components/FormPreMatricula.jsx') + leer('../hooks/useFormularioDemo.js')
  assert.doesNotMatch(formulario.replace(/\/\/.*$/gm, ''), /fetch\(|localStorage|sessionStorage/)
  // HU-26 (Sprint 3 · Daniel): el contacto ahora se envía, pero igual solo mediante services/ (sin fetch ni almacenamiento).
  assert.doesNotMatch(leer('../components/FormContacto.jsx').replace(/\/\/.*$/gm, ''), /fetch\(|localStorage|sessionStorage/)
})

test('solo dirección revisa las solicitudes (esDireccion)', () => {
  const perfil = (rol) => aPerfil({ usuario_id: 1, rol, nombre: 'Demo', apoderado_id: null, hijos: [] })
  assert.equal(perfil('administrador').esDireccion, true)
  assert.equal(perfil('organizador').esDireccion, false)
  assert.equal(perfil('apoderado').esDireccion, false)
})
