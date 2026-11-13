import { useState } from 'react'
import { NIVELES } from '../services/comunicados.js'
import { publicarComunicado } from '../services/comunicadosApi.js'
import { erroresPorCampo, mensajeDeError } from '../services/http.js'
import { useSesion } from '../context/sesionContexto.js'

const VACIO = { titulo: '', cuerpo: '', nivel: 'General', esUrgente: false }

// TEC-17 / HU-21: dirección o el personal publican un comunicado.
// Las reglas (largo del título, permisos…) las revisa la API; aquí se muestran sus respuestas:
// un 400 junto al campo y los demás errores (401, 403, sin conexión) arriba del formulario.
export default function FormPublicarComunicado({ onPublicado }) {
  const { revisarError } = useSesion()
  const [valores, setValores] = useState(VACIO)
  const [errores, setErrores] = useState({})
  const [aviso, setAviso] = useState(null) // { exito: true|false, texto }
  const [enviando, setEnviando] = useState(false)

  const cambiar = (evento) => {
    const { name, value, type, checked } = evento.target
    setValores({ ...valores, [name]: type === 'checkbox' ? checked : value })
    setErrores({ ...errores, [name]: undefined })
  }

  const enviar = async (evento) => {
    evento.preventDefault()
    setEnviando(true)
    setAviso(null)
    try {
      const publicado = await publicarComunicado(valores)
      setValores(VACIO)
      setErrores({})
      setAviso({ exito: true, texto: `Comunicado «${publicado.titulo}» publicado.` })
      onPublicado()
    } catch (error) {
      revisarError(error)
      setErrores(erroresPorCampo(error))
      setAviso({ exito: false, texto: mensajeDeError(error) })
    }
    setEnviando(false)
  }

  // Muestra el mensaje de error de un campo, si lo tiene.
  const errorDe = (nombre) =>
    errores[nombre] && <div id={`pub-${nombre}-error`} className="invalid-feedback d-block">{errores[nombre]}</div>

  return (
    <form className="form-publicar card border-0 shadow-sm p-3 mb-4" onSubmit={enviar} noValidate>
      <h3 className="h5 mb-3">Publicar un comunicado</h3>

      {aviso && (
        <div className={`alert py-2 ${aviso.exito ? 'alert-success' : 'alert-danger'}`} role={aviso.exito ? 'status' : 'alert'}>
          {aviso.texto}
        </div>
      )}

      <label htmlFor="pub-titulo" className="form-label">Título</label>
      <input id="pub-titulo" name="titulo" value={valores.titulo} onChange={cambiar}
        className={`form-control ${errores.titulo ? 'is-invalid' : ''}`} aria-invalid={Boolean(errores.titulo)} />
      {errorDe('titulo')}

      <label htmlFor="pub-cuerpo" className="form-label mt-2">Mensaje</label>
      <textarea id="pub-cuerpo" name="cuerpo" rows={3} value={valores.cuerpo} onChange={cambiar}
        className={`form-control ${errores.cuerpo ? 'is-invalid' : ''}`} aria-invalid={Boolean(errores.cuerpo)} />
      {errorDe('cuerpo')}

      <label htmlFor="pub-nivel" className="form-label mt-2">Nivel</label>
      <select id="pub-nivel" name="nivel" value={valores.nivel} onChange={cambiar} className="form-select">
        {NIVELES.map((nivel) => <option key={nivel}>{nivel}</option>)}
      </select>

      <div className="form-check my-3">
        <input id="pub-urgente" name="esUrgente" type="checkbox" checked={valores.esUrgente} onChange={cambiar} className="form-check-input" />
        <label htmlFor="pub-urgente" className="form-check-label">Marcar como urgente</label>
      </div>

      <button type="submit" className="btn-institucional-primary py-2 px-3 align-self-start" disabled={enviando}>
        {enviando ? 'Publicando…' : 'Publicar'}
      </button>
    </form>
  )
}