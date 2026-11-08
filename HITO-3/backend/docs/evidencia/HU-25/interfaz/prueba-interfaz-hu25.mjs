// HU-25: prueba de la interfaz con una API simulada (mismas rutas, datos y errores que la real).
import { chromium } from 'playwright'
const [H, OUT] = process.argv.slice(2)
const API = 'http://localhost:8000/api/v1'
const r = []
const ok = (id, c, d) => { r.push(`${c ? 'PASA ' : 'FALLA'} ${id} — ${d}`) }

const TRANSICIONES = { recibida: ['en_revision', 'rechazada'], en_revision: ['aceptada', 'lista_espera', 'rechazada'], lista_espera: ['aceptada', 'rechazada'], aceptada: [], rechazada: [] }
const ETQ = { recibida: 'Recibida', en_revision: 'En revisión', lista_espera: 'Lista de espera', aceptada: 'Aceptada', rechazada: 'Rechazada' }

// Estado del "servidor": vive fuera del navegador, así que sobrevive a recargar la página.
const servidor = {
  sig: 10,
  solicitudes: [
    { id: 1, codigo: 'PM-DEMAA2', nombre_apoderado: 'Familia Demo Uno', rut: '11111111-1', correo: 'familia.demo1@ejemplo.cl', telefono: '911111111', nombre_parvulo: 'Párvulo Demo Uno', nivel: 'medio-mayor', comentario: 'Solicitud ficticia de demostración.', estado: 'en_revision', mensaje_familia: 'Estamos revisando tu solicitud.', creada_en: '2026-11-01T12:00:00Z', actualizada_en: '2026-11-05T12:00:00Z', historial: [{ estado_anterior: null, estado_nuevo: 'recibida', mensaje_familia: null, usuario_id: null, creado_en: '2026-11-01T12:00:00Z' }, { estado_anterior: 'recibida', estado_nuevo: 'en_revision', mensaje_familia: 'Estamos revisando tu solicitud.', usuario_id: 1, creado_en: '2026-11-05T12:00:00Z' }] },
    { id: 2, codigo: 'PM-DEMBB3', nombre_apoderado: 'Familia Demo Dos', rut: '22222222-2', correo: 'familia.demo2@ejemplo.cl', telefono: '922222222', nombre_parvulo: 'Párvulo Demo Dos', nivel: 'sala-tel', comentario: null, estado: 'recibida', mensaje_familia: null, creada_en: '2026-11-06T12:00:00Z', actualizada_en: '2026-11-06T12:00:00Z', historial: [{ estado_anterior: null, estado_nuevo: 'recibida', mensaje_familia: null, usuario_id: null, creado_en: '2026-11-06T12:00:00Z' }] },
  ],
  forzar400Rut: false,
  llamadas: [],
}
const cuentas = [
  { usuario_id: 1, email: 'direccion.demo@ejemplo.cl', rol: 'administrador', nombre: 'Dirección' },
  { usuario_id: 2, email: 'educadora.demo@ejemplo.cl', rol: 'organizador', nombre: 'Educadora Demo' },
]
const salida = (s) => { const { historial: _h, ...resto } = s; return resto }
const ahora = () => new Date().toISOString()

async function manejar(route) {
  const q = route.request()
  const url = new URL(q.url())
  const ruta = url.pathname.replace('/api/v1', '')
  const metodo = q.method()
  const uid = Number(q.headers()['x-usuario-id'] || 0) || null
  const usuario = cuentas.find((c) => c.usuario_id === uid)
  const cuerpo = q.postData() ? JSON.parse(q.postData()) : null
  servidor.llamadas.push({ metodo, ruta: ruta + url.search, uid, cuerpo })
  const json = (status, body) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body), headers: { 'access-control-allow-origin': '*' } })
  const clave = `${metodo} ${ruta}`

  if (clave === 'GET /sesion/cuentas-demo') return json(200, cuentas)
  if (clave === 'GET /sesion/yo') return usuario ? json(200, { ...usuario, apoderado_id: null, hijos: [] }) : json(401, { detail: 'Debe identificarse' })
  if (['GET /salas/cupos', 'GET /comunicados', 'GET /actividades'].includes(clave)) return json(200, [])

  if (clave === 'POST /prematriculas') {
    if (servidor.forzar400Rut) return json(400, { detail: 'Datos de entrada inválidos', errores: [{ campo: 'body.rut', mensaje: 'Value error, El dígito verificador no corresponde a este RUT. Revísalo.' }] })
    if (cuerpo.consentimiento !== true) return json(400, { detail: 'Datos de entrada inválidos', errores: [{ campo: 'body.consentimiento', mensaje: 'Value error, Debes aceptar el uso de estos datos para gestionar la solicitud.' }] })
    const rut = cuerpo.rut.replace(/[.\s-]/g, '').toUpperCase()
    const dup = servidor.solicitudes.find((s) => s.rut === `${rut.slice(0, -1)}-${rut.slice(-1)}` && s.nombre_parvulo.toLowerCase() === cuerpo.nombre_parvulo.trim().toLowerCase() && s.nivel === cuerpo.nivel && ['recibida', 'en_revision', 'lista_espera'].includes(s.estado))
    if (dup) return json(409, { detail: 'Ya existe una solicitud en curso para este párvulo y nivel. Consulta su estado con tu código de seguimiento.' })
    const id = ++servidor.sig
    const s = { id, codigo: 'PM-7K3Q9X', nombre_apoderado: cuerpo.nombre_apoderado.trim(), rut: `${rut.slice(0, -1)}-${rut.slice(-1)}`, correo: cuerpo.correo.trim().toLowerCase(), telefono: cuerpo.telefono.replace(/\D/g, '').slice(-9), nombre_parvulo: cuerpo.nombre_parvulo.trim(), nivel: cuerpo.nivel, comentario: cuerpo.comentario, estado: 'recibida', mensaje_familia: null, creada_en: ahora(), actualizada_en: ahora(), historial: [{ estado_anterior: null, estado_nuevo: 'recibida', mensaje_familia: null, usuario_id: null, creado_en: ahora() }] }
    servidor.solicitudes.push(s)
    return json(201, { id, codigo: s.codigo, estado: s.estado, creada_en: s.creada_en })
  }
  if (clave === 'POST /prematriculas/seguimiento') {
    const s = servidor.solicitudes.find((x) => x.codigo === cuerpo.codigo)
    if (!s || s.correo !== cuerpo.correo.toLowerCase()) return json(404, { detail: 'No encontramos una solicitud con ese código y correo. Revisa ambos datos.' })
    return json(200, { codigo: s.codigo, estado: s.estado, nivel: s.nivel, mensaje_familia: s.mensaje_familia, creada_en: s.creada_en, actualizada_en: s.actualizada_en })
  }
  if (ruta.startsWith('/prematriculas')) {
    if (!usuario) return json(401, { detail: 'Debe identificarse con el encabezado X-Usuario-Id' })
    if (usuario.rol !== 'administrador') return json(403, { detail: 'Solo dirección puede revisar las solicitudes de pre-matrícula' })
    if (clave === 'GET /prematriculas') {
      const estado = url.searchParams.get('estado')
      const lista = servidor.solicitudes.filter((s) => !estado || s.estado === estado).sort((a, b) => b.creada_en.localeCompare(a.creada_en))
      return json(200, lista.map(salida))
    }
    const m = clave.match(/^PATCH \/prematriculas\/(\d+)\/estado$/)
    if (m) {
      const s = servidor.solicitudes.find((x) => x.id === Number(m[1]))
      if (!ETQ[cuerpo.estado]) return json(400, { detail: 'Datos de entrada inválidos', errores: [] })
      s.historial.push({ estado_anterior: s.estado, estado_nuevo: cuerpo.estado, mensaje_familia: cuerpo.mensaje_familia, usuario_id: uid, creado_en: ahora() })
      Object.assign(s, { estado: cuerpo.estado, mensaje_familia: cuerpo.mensaje_familia, actualizada_en: ahora() })
      return json(200, salida(s))
    }
  }
  return json(404, { detail: 'Ruta simulada no encontrada: ' + clave })
}

const b = await chromium.launch()
const ctx = await b.newContext({ viewport: { width: 1100, height: 1000 }, timezoneId: 'America/Santiago' })
await ctx.route(`${API}/**`, manejar)
await ctx.route('https://api.open-meteo.com/**', (x) => x.abort())
await ctx.route('https://fonts.**', (x) => x.abort())
const p = await ctx.newPage()
const errores = []
p.on('pageerror', (e) => errores.push(e.message))
await p.goto(`${H}/index.html`)
await p.waitForSelector('#pre-matricula')
// Solo para las capturas: el menú fijo no tapa el contenido al fotografiar secciones largas.
const menuEstatico = () => p.addStyleTag({ content: 'header.sticky-top{position:static!important}' })
await menuEstatico()

const F = '#pre-matricula'
const campo = (n) => p.locator(`${F} [name="${n}"]`)
const err = (n) => p.locator(`#pre-matricula-${n}-error`)
const enviar = () => p.click(`${F} button[type=submit]`)
const llenar = async (datos) => {
  for (const [n, v] of Object.entries(datos)) {
    if (n === 'nivel') await campo(n).selectOption(v)
    else if (n === 'consentimiento') { if (v) await campo(n).check(); else await campo(n).uncheck() }
    else await campo(n).fill(v)
  }
}
const DATOS = { nombreApoderado: 'Familia Prueba Demo', rut: '12.345.678-5', correo: 'familia.prueba@ejemplo.cl', telefono: '912345678', nombreParvulo: 'Párvulo Prueba Demo', nivel: 'medio-mayor', comentario: 'Datos ficticios.', consentimiento: true }
const posts = () => servidor.llamadas.filter((l) => l.metodo === 'POST' && l.ruta === '/prematriculas').length

// ---------- CA1: validación en React ----------
await enviar()
const nErr = await p.locator(`${F} .campo__error`).count()
ok('CA1 obligatorios + consentimiento', nErr === 7 && (await err('consentimiento').innerText()).includes('Debes aceptar'), `${nErr} errores; casilla: "${await err('consentimiento').innerText()}"`)
ok('CA1 no llama a la API con errores', posts() === 0, '0 solicitudes POST')
ok('CA1 foco en el primer error', await p.evaluate(() => document.activeElement?.id) === 'pre-matricula-nombreApoderado', 'foco en Nombre completo')
await p.locator(F).screenshot({ path: `${OUT}/01-validacion-react.png` })
await llenar({ ...DATOS, rut: '12.345.678-9', correo: 'familia@ejemplo', consentimiento: false })
await enviar()
ok('CA1 formatos (RUT, correo) validados en React', (await err('rut').innerText()).includes('dígito verificador') && (await err('correo').innerText()).includes('no es válido') && posts() === 0, 'mensajes junto a cada campo, sin enviar')

// ---------- CA2 + CP-HU-25-01: envío correcto ----------
await llenar(DATOS)
ok('casilla: marcarla quita el error', (await err('consentimiento').count()) === 0, 'error desaparece al marcar')
await enviar()
await p.waitForSelector(`${F} .form-demo__confirmacion`)
const post = servidor.llamadas.find((l) => l.metodo === 'POST' && l.ruta === '/prematriculas')
const conf = await p.locator(`${F} .form-demo__confirmacion`).innerText()
ok('CA2 POST /prematriculas con los datos (snake_case) y consentimiento', post.cuerpo.nombre_apoderado === 'Familia Prueba Demo' && post.cuerpo.nombre_parvulo === 'Párvulo Prueba Demo' && post.cuerpo.consentimiento === true && post.cuerpo.telefono === '+56 9 1234 5678', JSON.stringify(post.cuerpo))
ok('CA4 confirmación visible con el código', conf.includes('PM-7K3Q9X') && (await p.evaluate(() => document.activeElement?.className)).includes('form-demo__confirmacion'), conf.replace(/\n/g, ' '))
ok('formulario se limpia tras enviar', (await campo('nombreApoderado').inputValue()) === '' && !(await campo('consentimiento').isChecked()), 'campos vacíos y casilla desmarcada')
await p.locator(F).screenshot({ path: `${OUT}/02-confirmacion-codigo.png` })
ok('el código pasa a «Consultar mi solicitud»', (await p.inputValue('#seguimiento-codigo')) === 'PM-7K3Q9X', 'campo código precargado')

// ---------- CP-HU-25-01: tras recargar el sitio ----------
await p.reload()
await p.waitForSelector('#seguimiento-prematricula')
await menuEstatico()
ok('tras recargar: el código sigue ahí (solo el código, sin datos personales)', (await p.inputValue('#seguimiento-codigo')) === 'PM-7K3Q9X' && (await p.inputValue('#seguimiento-correo')) === '', 'código precargado; correo vacío')
const guardado = await p.evaluate(() => JSON.stringify(Object.fromEntries(Object.entries(localStorage))))
ok('navegador: solo se guarda el código', guardado === '{"pequenos-reyes:codigo-prematricula":"PM-7K3Q9X"}', guardado)
await p.fill('#seguimiento-correo', 'FAMILIA.PRUEBA@ejemplo.cl')
await p.click('#seguimiento-prematricula button[type=submit]')
await p.waitForSelector('.seguimiento')
ok('tras recargar: la API devuelve la solicitud y su estado', (await p.locator('.seguimiento__estado').innerText()) === 'Recibida', (await p.locator('.seguimiento').innerText()).split('\n').slice(0, 3).join(' | '))
await p.locator('#seguimiento-prematricula').screenshot({ path: `${OUT}/03-seguimiento-tras-recarga.png` })

// ---------- CP-HU-25-02: negativos ----------
await p.fill('#seguimiento-correo', 'otra.familia@ejemplo.cl')
await p.click('#seguimiento-prematricula button[type=submit]')
await p.waitForSelector('#seguimiento-prematricula .form-demo__error-envio')
ok('CP-02 404: código con otro correo', (await p.locator('#seguimiento-prematricula .form-demo__error-envio').innerText()) === 'No encontramos una solicitud con ese código y correo. Revisa ambos datos.' && (await p.locator('.seguimiento').count()) === 0, 'mensaje de la API; no se muestra la solicitud')
await p.locator('#seguimiento-prematricula').screenshot({ path: `${OUT}/04-seguimiento-404.png` })
await p.fill('#seguimiento-correo', '')
await p.click('#seguimiento-prematricula button[type=submit]')
ok('CP-02 consulta sin correo: aviso en React, sin llamar a la API', (await p.locator('#seguimiento-prematricula .form-demo__error-envio').innerText()).includes('Escribe el código'), await p.locator('#seguimiento-prematricula .form-demo__error-envio').innerText())

await llenar(DATOS)
await enviar()
await p.waitForSelector(`${F} .form-demo__error-envio`)
ok('CP-02 409 duplicada: motivo de la API y no se borra lo escrito', (await p.locator(`${F} .form-demo__error-envio`).innerText()).includes('Ya existe una solicitud en curso') && (await campo('nombreApoderado').inputValue()) === 'Familia Prueba Demo', await p.locator(`${F} .form-demo__error-envio`).innerText())
await p.locator(F).screenshot({ path: `${OUT}/05-duplicada-409.png` })

servidor.forzar400Rut = true
await campo('nombreParvulo').fill('Otro Párvulo Demo')
await enviar()
await p.waitForSelector('#pre-matricula-rut-error')
ok('CP-02 400 de la API: el mensaje aparece junto al campo RUT y se enfoca', (await err('rut').innerText()).includes('dígito verificador') && await p.evaluate(() => document.activeElement?.id) === 'pre-matricula-rut' && (await p.locator(`${F} .form-demo__error-envio`).innerText()).includes('Revisa los campos'), await err('rut').innerText())
await p.locator(F).screenshot({ path: `${OUT}/06-api-400-campo.png` })
servidor.forzar400Rut = false

await ctx.setOffline(true)
await enviar()
await p.waitForSelector(`${F} .form-demo__error-envio`)
ok('sin conexión: aviso y datos conservados', (await p.locator(`${F} .form-demo__error-envio`).innerText()).includes('No hay conexión') && (await campo('rut').inputValue()) === '12.345.678-5', await p.locator(`${F} .form-demo__error-envio`).innerText())
await ctx.setOffline(false)

// ---------- CA3: dirección ----------
ok('visitante no ve el panel de dirección', (await p.locator('#panel-solicitudes').count()) === 0, 'sin panel')
await p.selectOption('#cuenta-demo', '2')
await p.waitForTimeout(400)
ok('educadora (personal) tampoco ve el panel', (await p.locator('#panel-solicitudes').count()) === 0, 'sin panel')
await p.selectOption('#cuenta-demo', '1')
await p.waitForSelector('#panel-solicitudes .solicitud')
ok('CA3 dirección ve las solicitudes desde la API', (await p.locator('#panel-solicitudes .solicitud').count()) === 3, `${await p.locator('#panel-solicitudes .solicitud').count()} tarjetas`)
const nueva = p.locator('#panel-solicitudes .solicitud', { hasText: 'PM-7K3Q9X' })
ok('dirección ve RUT y teléfono con formato', (await nueva.innerText()).includes('12345678-5') && (await nueva.innerText()).includes('+56 9 1234 5678'), 'RUT •••.678-5')
await nueva.locator('select').selectOption('en_revision')
await nueva.locator('textarea').fill('Recibimos tus datos; te escribiremos esta semana.')
await nueva.locator('button[type=submit]').click()
await p.waitForSelector('#panel-solicitudes .alert-success')
const patch = servidor.llamadas.find((l) => l.metodo === 'PATCH')
ok('CA3 cambiar estado (PATCH con la cuenta de dirección)', patch.cuerpo.estado === 'en_revision' && patch.uid === 1 && (await p.locator('#panel-solicitudes .alert-success').innerText()).includes('PM-7K3Q9X'), JSON.stringify(patch.cuerpo))
await p.waitForFunction(() => [...document.querySelectorAll('#panel-solicitudes .solicitud')].some((li) => li.textContent.includes('PM-7K3Q9X') && li.textContent.includes('En revisión')))
await p.locator('#panel-solicitudes').screenshot({ path: `${OUT}/07-panel-direccion.png` })

const filtro = p.locator('#panel-solicitudes select').first()
await filtro.selectOption('aceptada')
await p.waitForSelector('#panel-solicitudes .estado-api--vacio')
ok('CA4 estado vacío en el panel', (await p.locator('#panel-solicitudes .estado-api--vacio').innerText()) === 'No hay solicitudes en estado «Aceptada».', await p.locator('#panel-solicitudes .estado-api--vacio').innerText())
// Error de la API al guardar (servidor caído): se avisa arriba de la lista.
await filtro.selectOption('recibida')
await p.waitForFunction(() => document.querySelectorAll('#panel-solicitudes .solicitud').length === 1)
await ctx.setOffline(true)
await p.locator('#panel-solicitudes .solicitud button[type=submit]').click()
await p.waitForSelector('#panel-solicitudes p.alert-danger')
ok('error al guardar: aviso visible', (await p.locator('#panel-solicitudes p.alert-danger').innerText()).includes('No hay conexión'), await p.locator('#panel-solicitudes p.alert-danger').innerText())
await ctx.setOffline(false)

// La familia vuelve a consultar y ve el estado nuevo.
await p.selectOption('#cuenta-demo', '')
await p.fill('#seguimiento-codigo', 'pm-7k3q9x')
await p.fill('#seguimiento-correo', 'familia.prueba@ejemplo.cl')
await p.click('#seguimiento-prematricula button[type=submit]')
await p.waitForFunction(() => document.querySelector('.seguimiento__estado')?.textContent === 'En revisión')
ok('la familia ve el nuevo estado y el mensaje de dirección', (await p.locator('.seguimiento__mensaje').innerText()).includes('te escribiremos esta semana'), (await p.locator('.seguimiento__mensaje').innerText()))
await p.locator('#seguimiento-prematricula').screenshot({ path: `${OUT}/08-familia-ve-cambio.png` })
ok('sin errores JS', errores.length === 0, errores.join(' / ') || 'ninguno')

// ---------- Responsive ----------
const movil = await b.newContext({ viewport: { width: 375, height: 800 }, timezoneId: 'America/Santiago' })
await movil.route(`${API}/**`, manejar)
await movil.route('https://**', (x) => x.abort())
const pm = await movil.newPage()
await pm.goto(`${H}/index.html`)
await pm.selectOption('#cuenta-demo', '1')
await pm.waitForSelector('#panel-solicitudes .solicitud')
const desborde = await pm.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
ok('responsive 375 px sin scroll horizontal (formulario, seguimiento y panel)', desborde <= 0, `desborde ${desborde}px`)
await pm.locator('#panel-solicitudes .solicitud').first().screenshot({ path: `${OUT}/09-movil-panel.png` })

await b.close()
console.log(r.join('\n'))
console.log(`\n${r.filter((x) => x.startsWith('PASA')).length}/${r.length} PASA`)
