import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parseFecha, formatearFecha, ordenarComunicados } from './comunicados.js'

const datos = JSON.parse(
  readFileSync(new URL('../data/comunicados.json', import.meta.url), 'utf8'),
)

// Comprueba que los comunicados se muestran desde el más reciente al más antiguo.
test('CA1: ordena de más reciente a más antiguo', () => {
  const fechas = ordenarComunicados(datos).map((c) => c.fecha)
  assert.deepEqual(fechas, [...fechas].sort().reverse())
})

// Comprueba que ordenar no modifica el arreglo original ni los datos cargados.
test('CA1: no muta el arreglo de origen', () => {
  const copia = datos.map((c) => c.id)
  const original = [...datos].reverse()
  const antes = original.map((c) => c.id)
  ordenarComunicados(original)
  assert.deepEqual(original.map((c) => c.id), antes)
  assert.deepEqual(datos.map((c) => c.id), copia)
})

// Verifica que cada comunicado tenga un identificador único para usarlo como key.
test('CA3: los ids del JSON son únicos (sirven como key)', () => {
  const ids = datos.map((c) => c.id)
  assert.equal(new Set(ids).size, ids.length)
})

// Comprueba el comportamiento esperado para fechas inválidas o ausentes.
test('CA4: fechas inválidas no rompen y van al final', () => {
  const lista = [
    { id: 'a', fecha: 'no-es-fecha' },
    { id: 'b', fecha: '2026-02-30' },
    { id: 'c', fecha: '2026-01-01' },
    { id: 'd' },
    { id: 'e', fecha: '2026-03-01' },
  ]
  assert.deepEqual(ordenarComunicados(lista).map((c) => c.id), ['e', 'c', 'a', 'b', 'd'])
  assert.equal(formatearFecha('no-es-fecha'), null)
  assert.equal(formatearFecha(undefined), null)
  assert.equal(parseFecha('2026-02-30'), null)
})

// Comprueba que las fechas ISO se interpretan como días locales sin desfase horario.
test('fecha ISO se interpreta como día local, sin desfase', () => {
  assert.equal(parseFecha('2026-09-29').getDate(), 29)
})

// Comprueba que las entradas vacías o que no son arreglos devuelven una lista vacía.
test('CA3: lista vacía o valor no-arreglo devuelve []', () => {
  assert.deepEqual(ordenarComunicados([]), [])
  assert.deepEqual(ordenarComunicados(null), [])
})
