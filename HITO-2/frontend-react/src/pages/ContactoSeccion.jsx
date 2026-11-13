import { useState } from 'react'
import SectionTitle from '../components/SectionTitle.jsx'
import FormContacto from '../components/FormContacto.jsx'
import SeguimientoContacto, { ResumenConsulta } from '../components/SeguimientoContacto.jsx'
import PanelContacto from '../components/PanelContacto.jsx'
import EstadoCarga from '../components/EstadosApi.jsx'
import { useSesion } from '../context/sesionContexto.js'
import { useRecurso } from '../hooks/useRecurso.js'
import { listarMisConsultas } from '../services/contactoApi.js'

// HU-12 + HU-26 (Sprint 3 · Daniel): contacto con dirección persistido.
//  - Todos: formulario (POST /contacto) y revisión por código + correo.
//  - Con sesión real: "Mis consultas" (solo las propias, GET /contacto/mias).
//  - Dirección con sesión real: panel para gestionar el estado de atención.
export default function ContactoSeccion() {
  const { conToken, esDireccion, perfil } = useSesion()
  const [codigoReciente, setCodigoReciente] = useState('')

  return (
    <section id="contacto">
      <SectionTitle titulo="Contacto con la Dirección" subtitulo="Envía tu consulta y revisa si fue atendida" />
      {/* key: al enviar otra consulta, "Mis consultas" se vuelve a cargar. */}
      <FormContacto onCreada={setCodigoReciente} />
      <SeguimientoContacto key={codigoReciente} codigoInicial={codigoReciente} />
      {conToken && perfil && !esDireccion && <MisConsultas key={`mis-${codigoReciente}`} />}
      {conToken && esDireccion && <PanelContacto />}
    </section>
  )
}

function MisConsultas() {
  const consultas = useRecurso(listarMisConsultas)
  return (
    <section id="mis-consultas" className="panel-solicitudes">
      <h3 className="h5 mb-3">Mis consultas</h3>
      <EstadoCarga
        recurso={consultas}
        textoCargando="Cargando tus consultas…"
        textoError="No pudimos cargar tus consultas."
        textoVacio="Aún no has enviado consultas con esta cuenta."
      >
        {consultas.datos?.map((c) => <ResumenConsulta key={c.codigo} consulta={c} />)}
      </EstadoCarga>
    </section>
  )
}
