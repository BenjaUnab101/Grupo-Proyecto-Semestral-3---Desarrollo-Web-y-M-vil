// HITO 4: pruebas de las reglas del recordatorio en el teléfono (utils/recordatorios.js).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { idRecordatorio, momentoRecordatorio, textoRecordatorio } from './recordatorios.js'

// Fechas en hora local, igual que en el teléfono.
const local = (anio, mes, dia, horas = 0, minutos = 0) => new Date(anio, mes - 1, dia, horas, minutos)

test('avisa el día anterior a las 18:00 si todavía no llega esa hora', () => {
  const momento = momentoRecordatorio('2026-11-27', '10:30', local(2026, 11, 23, 12))
  assert.deepEqual(momento, local(2026, 11, 26, 18, 0))
})

test('si ya pasó el aviso del día anterior, avisa una hora antes del inicio', () => {
  const momento = momentoRecordatorio('2026-11-27', '10:30', local(2026, 11, 26, 20))
  assert.deepEqual(momento, local(2026, 11, 27, 9, 30))
})

test('sin hora se asume 09:00', () => {
  const momento = momentoRecordatorio('2026-11-27', undefined, local(2026, 11, 27, 7))
  assert.deepEqual(momento, local(2026, 11, 27, 8, 0))
})

test('el día anterior cruza el cambio de mes', () => {
  const momento = momentoRecordatorio('2026-12-01', '18:30', local(2026, 11, 20))
  assert.deepEqual(momento, local(2026, 11, 30, 18, 0))
})

test('si la actividad ya empezó o la fecha es inválida, no hay recordatorio', () => {
  assert.equal(momentoRecordatorio('2026-11-27', '10:30', local(2026, 11, 27, 10)), null)
  assert.equal(momentoRecordatorio('2026-02-30', '10:30', local(2026, 1, 1)), null)
  assert.equal(momentoRecordatorio('', '10:30'), null)
})

test('el id de la notificación es el id de la inscripción (entero de 32 bits)', () => {
  assert.equal(idRecordatorio(15), 15)
  assert.equal(idRecordatorio('15'), 15)
  assert.equal(idRecordatorio(0), null)
  assert.equal(idRecordatorio(2 ** 31), null)
  assert.equal(idRecordatorio('abc'), null)
})

test('texto de la notificación con y sin detalles', () => {
  assert.deepEqual(textoRecordatorio({ titulo: 'Taller de pintura', hijo: 'Sofía', hora: '10:30', lugar: 'Sala Azul' }), {
    titulo: 'Recordatorio: Taller de pintura',
    cuerpo: 'Sofía está inscrito/a (10:30 h · Sala Azul). ¡No lo olvides!',
  })
  assert.equal(textoRecordatorio({ titulo: 'Paseo', hijo: 'Tomás' }).cuerpo, 'Tomás está inscrito/a. ¡No lo olvides!')
})
