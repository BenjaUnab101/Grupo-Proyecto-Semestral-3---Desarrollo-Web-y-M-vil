import { useState } from 'react'
import SectionTitle from '../components/SectionTitle.jsx'
import ProcesoMatricula from '../components/ProcesoMatricula.jsx'
import FormPreMatricula from '../components/FormPreMatricula.jsx'
import SeguimientoPrematricula from '../components/SeguimientoPrematricula.jsx'
import PanelSolicitudes from '../components/PanelSolicitudes.jsx'
import { useSesion } from '../context/sesionContexto.js'
import { guardarCodigo, leerCodigoGuardado } from '../utils/codigoSeguimiento.js'

// HU-25: etapas de matrícula + formulario conectado a la API + consulta del estado.
// Con la cuenta de dirección aparece además el panel para revisar las solicitudes.
export default function MatriculaSeccion() {
  const { esDireccion } = useSesion()
  // Último código: el recién creado o el recordado en este navegador (solo el código).
  const [codigoReciente, setCodigoReciente] = useState(leerCodigoGuardado)

  const alCrear = (codigo) => {
    guardarCodigo(codigo)
    setCodigoReciente(codigo)
  }

  return (
    <section id="matricula">
      <SectionTitle titulo="Proceso de Matrícula" subtitulo="Etapas, pre-matrícula y seguimiento de tu solicitud" />
      <ProcesoMatricula />
      <FormPreMatricula onCreada={alCrear} />
      {/* key: al crear una solicitud nueva, la consulta se reinicia con ese código. */}
      <SeguimientoPrematricula key={codigoReciente} codigoInicial={codigoReciente} />
      {esDireccion && <PanelSolicitudes />}
    </section>
  )
}
