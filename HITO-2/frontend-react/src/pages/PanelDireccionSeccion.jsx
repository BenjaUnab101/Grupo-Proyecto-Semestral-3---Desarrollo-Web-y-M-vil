import SectionTitle from '../components/SectionTitle.jsx'
import PanelParticipacion from '../components/PanelParticipacion.jsx'
import PanelAuditoria from '../components/PanelAuditoria.jsx'
import { useSesion } from '../context/sesionContexto.js'
import '../styles/PanelDireccion.css'

// Sprint 3 · Daniel: paneles internos del jardín. Solo aparecen con sesión REAL; aun así la
// API vuelve a revisar el rol en cada petición (React no decide los permisos).
//  - HU-24: participación (dirección y personal).
//  - HU-22: bitácora de auditoría (solo dirección).
export default function PanelDireccionSeccion() {
  const { conToken, perfil } = useSesion()
  if (!conToken || !perfil || perfil.rol === 'apoderado') return null

  return (
    <section id="panel-direccion" className="py-4">
      <SectionTitle titulo="Panel del jardín" subtitulo="Indicadores de participación e historial de actividad" />
      <PanelParticipacion />
      {perfil.rol === 'administrador' && <PanelAuditoria />}
    </section>
  )
}
