import test from 'node:test'
import assert from 'node:assert/strict'
import { limpiarRut, calcularDigitoVerificador, validarRut, formatearRut } from './rut.js'

test('limpiarRut quita puntos, guion y espacios, y sube el DV', () => {
  assert.equal(limpiarRut('12.345.678-5'), '123456785')
  assert.equal(limpiarRut(' 8765432-k '), '8765432K')
})

test('calcularDigitoVerificador coincide con RUTs demo conocidos', () => {
  assert.equal(calcularDigitoVerificador('12345678'), '5')
  assert.equal(calcularDigitoVerificador('9876543'), '3')
  assert.equal(calcularDigitoVerificador('8765432'), 'K')
})

test('validarRut acepta RUTs demo válidos en distintos formatos', () => {
  assert.equal(validarRut('12.345.678-5'), true)
  assert.equal(validarRut('12345678-5'), true)
  assert.equal(validarRut('9876543-3'), true)
  assert.equal(validarRut('8765432-K'), true)
  assert.equal(validarRut('8765432-k'), true)
})

test('validarRut rechaza DV incorrecto o estructura inválida', () => {
  assert.equal(validarRut('12345678-9'), false)
  assert.equal(validarRut('123'), false)
  assert.equal(validarRut(''), false)
  assert.equal(validarRut(undefined), false)
})

test('formatearRut devuelve el formato con puntos y guion', () => {
  assert.equal(formatearRut('123456785'), '12.345.678-5')
  assert.equal(formatearRut('98765433'), '9.876.543-3')
})

test('formatearRut devuelve null si el RUT no es válido', () => {
  assert.equal(formatearRut('12345678-9'), null)
})
