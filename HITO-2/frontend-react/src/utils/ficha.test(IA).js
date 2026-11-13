import test from 'node:test'
import assert from 'node:assert/strict'
import { formatearAsistencia, formatearAtrasos, hayAlertaAtrasos } from './ficha.js'

test('formatearAsistencia acepta el rango 0-100', () => {
  assert.equal(formatearAsistencia(0), '0%')
  assert.equal(formatearAsistencia(96), '96%')
  assert.equal(formatearAsistencia(100), '100%')
})

test('formatearAsistencia rechaza valores fuera de rango o no numéricos', () => {
  assert.equal(formatearAsistencia(-1), 'Dato no disponible')
  assert.equal(formatearAsistencia(101), 'Dato no disponible')
  assert.equal(formatearAsistencia('96'), 'Dato no disponible')
  assert.equal(formatearAsistencia(undefined), 'Dato no disponible')
  assert.equal(formatearAsistencia(NaN), 'Dato no disponible')
})

test('formatearAtrasos acepta enteros >= 0', () => {
  assert.equal(formatearAtrasos(0), '0')
  assert.equal(formatearAtrasos(3), '3')
})

test('formatearAtrasos rechaza negativos, decimales o no numéricos', () => {
  assert.equal(formatearAtrasos(-1), 'Dato no disponible')
  assert.equal(formatearAtrasos(1.5), 'Dato no disponible')
  assert.equal(formatearAtrasos('3'), 'Dato no disponible')
  assert.equal(formatearAtrasos(null), 'Dato no disponible')
})

test('hayAlertaAtrasos solo es true para enteros válidos mayores a 2', () => {
  assert.equal(hayAlertaAtrasos(3), true)
  assert.equal(hayAlertaAtrasos(2), false)
  assert.equal(hayAlertaAtrasos(0), false)
  assert.equal(hayAlertaAtrasos(-1), false)
  assert.equal(hayAlertaAtrasos('3'), false)
})
