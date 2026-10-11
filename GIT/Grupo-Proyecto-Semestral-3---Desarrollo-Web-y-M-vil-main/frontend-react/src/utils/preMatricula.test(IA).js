// HU-11 · Formulario de pre-matrícula con validación en tiempo real.
// Ejecutar: npm test
// Todos los datos son ficticios (RUT de ejemplo calculados con módulo 11).
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  CAMPOS,
  VALORES_INICIALES,
  formatearTelefono,
  limpiarTelefono,
  normalizarCampo,
  primerCampoConError,
  validarCampo,
  validarCorreo,
  validarFormulario,
  validarRutCampo,
  validarTelefono,
} from './preMatricula.js'

const leer = (ruta) => readFileSync(new URL(ruta, import.meta.url), 'utf8')
const niveles = JSON.parse(leer('../data/niveles.json'))

const VALIDOS = {
  nombreApoderado: 'Apoderada Demo',
  rut: '12.345.678-5',
  correo: 'demo@ejemplo.cl',
  telefono: '+56 9 1234 5678',
  nombreParvulo: 'Párvulo Demo',
  nivel: 'medio-mayor',
  comentario: '',
}

// ---------- CA1: obligatorios ----------

test('CA1: formulario vacío marca los 6 obligatorios y no el comentario opcional', () => {
  const errores = validarFormulario(VALORES_INICIALES, niveles)
  assert.deepEqual(Object.keys(errores), ['nombreApoderado', 'rut', 'correo', 'telefono', 'nombreParvulo', 'nivel'])
  assert.equal(errores.comentario, undefined)
  assert.equal(errores.rut, 'Ingresa el RUT del apoderado.')
})

test('CA-C: trim — un obligatorio con solo espacios cuenta como vacío', () => {
  assert.equal(validarCampo('nombreApoderado', '   ', niveles), 'Ingresa el nombre del apoderado.')
  assert.equal(validarCampo('nombreParvulo', '\t \n', niveles), 'Ingresa el nombre del párvulo.')
  assert.equal(validarCampo('nombreApoderado', '  Ana  ', niveles), null)
})

test('CA1: datos válidos no generan errores', () => {
  assert.deepEqual(validarFormulario(VALIDOS, niveles), {})
})

test('CA4: el foco va al primer campo con error según el orden visual', () => {
  assert.equal(primerCampoConError({ telefono: 'x', rut: 'y' }), 'rut')
  assert.equal(primerCampoConError(validarFormulario(VALORES_INICIALES, niveles)), 'nombreApoderado')
  assert.equal(primerCampoConError({}), null)
  assert.deepEqual(CAMPOS, Object.keys(VALORES_INICIALES))
})

// ---------- CA2 / CA-C: RUT ----------

test('CA-C RUT: acepta formatos normalizables y DV K mayúscula o minúscula', () => {
  for (const rut of ['12.345.678-5', '12345678-5', '123456785', ' 12.345.678-5 ', '8.765.432-K', '8765432-k', '9876543-3']) {
    assert.equal(validarRutCampo(rut), null, rut)
  }
})

test('CA-C RUT: mensajes específicos para formato y para dígito verificador', () => {
  const formato = 'El RUT debe tener 7 u 8 dígitos y un dígito verificador, por ejemplo 12.345.678-5.'
  const dv = 'El dígito verificador no corresponde a este RUT. Revísalo.'
  for (const rut of ['123', 'abc', '12.345.678-', '1234-5678-5', '12.345.678-55', '123456789012', '12.345.678-X']) {
    assert.equal(validarRutCampo(rut), formato, rut)
  }
  assert.equal(validarRutCampo('12.345.678-9'), dv)
  assert.equal(validarRutCampo('8.765.432-1'), dv)
  assert.equal(validarRutCampo('9876543-K'), dv)
})

test('CA-C RUT: al salir del campo se normaliza a 12.345.678-5', () => {
  assert.equal(normalizarCampo('rut', '123456785'), '12.345.678-5')
  assert.equal(normalizarCampo('rut', ' 8765432-k '), '8.765.432-K')
  assert.equal(normalizarCampo('rut', '12345678-9'), '12345678-9') // inválido: se deja como lo escribió
})

// ---------- CA2: correo ----------

test('CA2 correo: válidos e inválidos', () => {
  for (const c of ['demo@ejemplo.cl', 'nombre.apellido@dominio.com', 'a+b@sub.dominio.cl', ' demo@ejemplo.cl ']) {
    assert.equal(validarCorreo(c), null, c)
  }
  for (const c of ['demo', 'demo@', '@ejemplo.cl', 'demo@ejemplo', 'demo@ejemplo.c', 'de mo@ejemplo.cl', 'demo@@ejemplo.cl', 'demo@ejemplo..cl']) {
    assert.equal(validarCorreo(c), 'El correo no es válido. Usa el formato nombre@dominio.cl.', c)
  }
})

// ---------- CA2 / CA-C: teléfono chileno ----------

test('CA-C teléfono: regla documentada — 9 dígitos, prefijo +56 opcional, no empieza en 0 ni 1', () => {
  for (const t of ['912345678', '9 1234 5678', '+56 9 1234 5678', '+56912345678', '56912345678', '(+56) 9-1234-5678', '221234567', '+56 32 212 3456']) {
    assert.equal(validarTelefono(t), null, t)
  }
  const mensaje = 'El teléfono debe ser chileno de 9 dígitos, por ejemplo +56 9 1234 5678.'
  for (const t of ['12345678', '91234567', '9123456789', '012345678', '112345678', '+54 9 1234 5678', '9123abcd8', '+1 912345678']) {
    assert.equal(validarTelefono(t), mensaje, t)
  }
})

test('CA-C teléfono: limpieza y formato consistente', () => {
  assert.equal(limpiarTelefono('+56 9 1234-5678'), '912345678')
  assert.equal(formatearTelefono('912345678'), '+56 9 1234 5678')
  assert.equal(formatearTelefono('221234567'), '+56 2 2123 4567')
  assert.equal(formatearTelefono('322123456'), '+56 32 212 3456')
  assert.equal(formatearTelefono('123'), '123') // inválido: sin cambios
})

// ---------- CA2: al corregir, el error desaparece ----------

test('CA2: un campo con error queda sin error al corregirlo', () => {
  assert.ok(validarCampo('rut', '12.345.678-9', niveles))
  assert.equal(validarCampo('rut', '12.345.678-5', niveles), null)
  assert.ok(validarCampo('correo', 'demo@', niveles))
  assert.equal(validarCampo('correo', 'demo@ejemplo.cl', niveles), null)
  assert.ok(validarCampo('telefono', '9123', niveles))
  assert.equal(validarCampo('telefono', '9 1234 5678', niveles), null)
})

// ---------- Nivel, comentario y largos ----------

test('nivel: debe ser un id existente en niveles.json', () => {
  assert.equal(validarCampo('nivel', '', niveles), 'Selecciona el nivel al que postula.')
  assert.equal(validarCampo('nivel', 'nivel-inventado', niveles), 'Selecciona un nivel de la lista.')
  assert.equal(validarCampo('nivel', 'sala-tel', niveles), null)
})

test('niveles.json: ids únicos (sirven como key) y nombres no vacíos', () => {
  const ids = niveles.map((n) => n.id)
  assert.equal(new Set(ids).size, ids.length)
  assert.ok(niveles.every((n) => typeof n.nombre === 'string' && n.nombre.trim() !== ''))
})

test('comentario opcional y límites de largo', () => {
  assert.equal(validarCampo('comentario', '', niveles), null)
  assert.ok(validarCampo('comentario', 'x'.repeat(301), niveles))
  assert.ok(validarCampo('nombreApoderado', 'x'.repeat(81), niveles))
})

// ---------- Contrato y privacidad (estático) ----------

test('contrato: formulario controlado con valores/errores y FormField con aria', () => {
  const form = leer('../components/FormPreMatricula.jsx')
  const campo = leer('../components/FormField.jsx')
  assert.match(form, /const \[valores, setValores\] = useState\(VALORES_INICIALES\)/)
  assert.match(form, /const \[errores, setErrores\] = useState\(\{\}\)/)
  assert.match(form, /evento\.preventDefault\(\)/)
  assert.match(form, /onSubmit=\{manejarEnvio\}/)
  assert.match(form, /noValidate/)
  // Regresión: sin esto, el error que aparece al perder el foco empuja el botón y el clic se pierde.
  assert.match(form, /onMouseDown=\{\(evento\) => evento\.preventDefault\(\)\}/)
  assert.match(form, /Demostración: solicitud validada, no enviada al jardín/)
  assert.match(campo, /'aria-invalid'/)
  assert.match(campo, /'aria-describedby'/)
  assert.match(campo, /key=\{opcion\.id\}/)
})

test('CA3 privacidad: el formulario no persiste ni envía datos', () => {
  const codigo = ['../components/FormPreMatricula.jsx', '../components/FormField.jsx', './preMatricula.js']
    .map(leer)
    .join('\n')
    .replace(/\/\/.*$/gm, '') // ignora comentarios
  for (const prohibido of [/localStorage/, /sessionStorage/, /document\.cookie/, /indexedDB/, /fetch\(/, /XMLHttpRequest/, /sendBeacon/, /console\./]) {
    assert.doesNotMatch(codigo, prohibido)
  }
})
