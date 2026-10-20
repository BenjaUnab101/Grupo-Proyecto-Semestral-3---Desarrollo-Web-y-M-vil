// HU-12 · Formulario de contacto con la dirección.
// Ejecutar: npm test
// Todos los datos son ficticios (correo demo@ejemplo.cl: solo se valida el formato).
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  CAMPOS_CONTACTO,
  LARGO_MINIMO_MENSAJE,
  VALORES_INICIALES_CONTACTO,
  normalizarCampoContacto,
  primerCampoConErrorContacto,
  validarCampoContacto,
  validarFormularioContacto,
} from './contacto.js'
import { contarCaracteres, validarLargoMinimo } from './validaciones.js'

const leer = (ruta) => readFileSync(new URL(ruta, import.meta.url), 'utf8')
const sinComentarios = (codigo) => codigo.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')

const VALIDOS = {
  nombre: 'Apoderado Demo',
  correo: 'demo@ejemplo.cl',
  telefono: '912345678',
  asunto: 'Consulta de prueba',
  mensaje: 'Hola, esta es una consulta ficticia.',
}

// ---------- CA1: obligatorios y formato ----------

test('CA1: formulario vacío marca los 5 campos como obligatorios', () => {
  const errores = validarFormularioContacto(VALORES_INICIALES_CONTACTO)
  assert.deepEqual(Object.keys(errores), ['nombre', 'correo', 'telefono', 'asunto', 'mensaje'])
  assert.equal(errores.nombre, 'Ingresa tu nombre.')
  assert.equal(errores.mensaje, 'Escribe tu consulta.')
})

test('CA1: solo espacios cuenta como vacío (trim)', () => {
  assert.equal(validarCampoContacto('asunto', '    '), 'Ingresa el asunto de tu consulta.')
  assert.equal(validarCampoContacto('nombre', '\t'), 'Ingresa tu nombre.')
})

test('CA1: correo y teléfono con formato inválido dan error específico', () => {
  assert.equal(validarCampoContacto('correo', 'demo@ejemplo'), 'El correo no es válido. Usa el formato nombre@dominio.cl.')
  assert.equal(validarCampoContacto('telefono', '9123'), 'El teléfono debe ser chileno de 9 dígitos, por ejemplo +56 9 1234 5678.')
})

test('CA1: datos válidos no generan errores', () => {
  assert.deepEqual(validarFormularioContacto(VALIDOS), {})
})

test('CA1: al corregir, el error del campo desaparece', () => {
  assert.ok(validarCampoContacto('correo', 'demo@'))
  assert.equal(validarCampoContacto('correo', 'demo@ejemplo.cl'), null)
  assert.ok(validarCampoContacto('telefono', '+56 9 1234'))
  assert.equal(validarCampoContacto('telefono', '+56 9 1234 5678'), null)
})

test('CA-C: no exige un correo real, solo el formato', () => {
  for (const correo of ['demo@ejemplo.cl', 'prueba@dominio-ficticio.com', 'a@b.co']) {
    assert.equal(validarCampoContacto('correo', correo), null, correo)
  }
})

test('foco: el primer error sigue el orden visual', () => {
  assert.equal(primerCampoConErrorContacto({ mensaje: 'x', correo: 'y' }), 'correo')
  assert.deepEqual(CAMPOS_CONTACTO, Object.keys(VALORES_INICIALES_CONTACTO))
})

// ---------- CA2: límite mínimo de 10 caracteres ----------

test('CA2: el mínimo documentado es 10 caracteres', () => {
  assert.equal(LARGO_MINIMO_MENSAJE, 10)
})

test('CA2 / CP-HU-12-02: 9 caracteres fallan e indican el mínimo', () => {
  const nueve = '123456789'
  assert.equal(contarCaracteres(nueve), 9)
  assert.equal(validarCampoContacto('mensaje', nueve), 'La consulta debe tener al menos 10 caracteres (te falta 1).')
})

test('CA2: 10 caracteres cumplen el mínimo', () => {
  assert.equal(validarCampoContacto('mensaje', '1234567890'), null)
})

test('CA2: los espacios de los extremos no cuentan para el mínimo', () => {
  assert.ok(validarCampoContacto('mensaje', '   123456789   ')) // 9 reales
  assert.equal(validarCampoContacto('mensaje', '  1234567890  '), null) // 10 reales
  assert.equal(validarCampoContacto('mensaje', 'Hola hola!'), null) // espacio interior sí cuenta
})

test('CA2: tildes y emojis cuentan como un carácter', () => {
  assert.equal(contarCaracteres('ñandú'), 5)
  assert.equal(contarCaracteres('🙂🙂'), 2)
  assert.ok(validarCampoContacto('mensaje', 'áéíóúñÁÉÍ')) // 9
  assert.equal(validarCampoContacto('mensaje', 'áéíóúñÁÉÍÓ'), null) // 10
})

test('CA2: mensaje de faltantes en plural', () => {
  assert.equal(validarLargoMinimo('abc', 10, 'La consulta'), 'La consulta debe tener al menos 10 caracteres (te faltan 7).')
})

test('límites máximos: asunto 100 y consulta 1000', () => {
  assert.equal(validarCampoContacto('asunto', 'x'.repeat(100)), null)
  assert.equal(validarCampoContacto('asunto', 'x'.repeat(101)), 'El asunto puede tener hasta 100 caracteres.')
  assert.equal(validarCampoContacto('mensaje', 'x'.repeat(1000)), null)
  assert.equal(validarCampoContacto('mensaje', 'x'.repeat(1001)), 'La consulta puede tener hasta 1000 caracteres.')
})

test('normalización al salir del campo: trim y formato de teléfono', () => {
  assert.equal(normalizarCampoContacto('telefono', ' 912345678 '), '+56 9 1234 5678')
  assert.equal(normalizarCampoContacto('nombre', '  Ana  '), 'Ana')
  assert.equal(normalizarCampoContacto('mensaje', '  línea 1\nlínea 2  '), 'línea 1\nlínea 2')
})

// ---------- CA4 / CA-C: reutilización sin duplicar lógica ----------

test('CA4: FormContacto reutiliza FormField, FormularioDemo y el hook compartido', () => {
  const form = leer('../components/FormContacto.jsx')
  assert.match(form, /import FormField from '\.\/FormField\.jsx'/)
  assert.match(form, /import FormularioDemo from '\.\/FormularioDemo\.jsx'/)
  assert.match(form, /import useFormularioDemo from '\.\.\/hooks\/useFormularioDemo\.js'/)
  assert.match(form, /<FormField/)
  // No tiene estado ni manejadores propios: todo viene del hook.
  assert.doesNotMatch(form, /useState|useRef|preventDefault|<form/)
})

test('CA4: contacto.js usa validaciones.js y no redefine reglas', () => {
  const contacto = sinComentarios(leer('./contacto.js'))
  assert.match(contacto, /from '\.\/validaciones\.js'/)
  // Ninguna expresión regular propia: correo y teléfono vienen de validaciones.js.
  assert.doesNotMatch(contacto, /\/\^|new RegExp|\.test\(/)
})

test('CA4: pre-matrícula (HU-11) usa las mismas validaciones compartidas', () => {
  const preMatricula = sinComentarios(leer('./preMatricula.js'))
  assert.match(preMatricula, /from '\.\/validaciones\.js'/)
  assert.doesNotMatch(preMatricula, /\/\^|new RegExp|\.test\(/)
  assert.match(leer('../components/FormPreMatricula.jsx'), /useFormularioDemo\(/)
})

test('CA4: las reglas de correo y teléfono existen en un solo archivo', () => {
  const archivos = ['./validaciones.js', './contacto.js', './preMatricula.js', '../hooks/useFormularioDemo.js',
    '../components/FormContacto.jsx', '../components/FormPreMatricula.jsx', '../components/FormField.jsx']
  const conPatronCorreo = archivos.filter((a) => /PATRON_CORREO\s*=/.test(leer(a)))
  const conReglaTelefono = archivos.filter((a) => /\[2-9\]\\d\{8\}/.test(leer(a)))
  assert.deepEqual(conPatronCorreo, ['./validaciones.js'])
  assert.deepEqual(conReglaTelefono, ['./validaciones.js'])
})

test('regresión: al confirmar se quita el foco antes de limpiar (sin error fantasma)', () => {
  const hook = leer('../hooks/useFormularioDemo.js')
  const blur = hook.indexOf('document.activeElement.blur()')
  const limpiar = hook.indexOf('setValores(valoresIniciales)')
  assert.ok(blur > 0 && blur < limpiar, 'el blur debe ocurrir antes de limpiar los valores')
})

// ---------- CA3: demo sin HTTP ni persistencia ----------

test('CA3: mensaje de demostración exacto', () => {
  assert.match(leer('../components/FormContacto.jsx'), /'Demostración: consulta validada, no enviada a la dirección'/)
})

test('CA3: sin solicitudes HTTP ni almacenamiento en el flujo de contacto', () => {
  const codigo = ['../components/FormContacto.jsx', '../components/FormularioDemo.jsx', '../components/FormField.jsx',
    '../hooks/useFormularioDemo.js', './contacto.js', './validaciones.js'].map((a) => sinComentarios(leer(a))).join('\n')
  for (const prohibido of [/fetch\(/, /XMLHttpRequest/, /axios/, /sendBeacon/, /WebSocket/, /localStorage/,
    /sessionStorage/, /document\.cookie/, /indexedDB/, /console\./, /\baction=/]) {
    assert.doesNotMatch(codigo, prohibido)
  }
})
