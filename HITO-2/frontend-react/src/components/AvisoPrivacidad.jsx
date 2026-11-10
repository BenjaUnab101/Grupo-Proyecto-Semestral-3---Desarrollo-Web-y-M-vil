// Aviso de privacidad del portal apoderados.
// HU-16 (Sprint 3 · Daniel): el acceso ya es real (contraseña verificada en el servidor);
// los datos de la demostración siguen siendo ficticios.
export default function AvisoPrivacidad() {
  return (
    <p className="text-muted small mb-0">
      Solo ves a los alumnos asociados a tu cuenta: el servidor lo verifica en cada consulta. En esta demostración
      los datos de apoderados y alumnos son ficticios. La sesión vive solo en la memoria del navegador (no en
      localStorage, sessionStorage ni cookies), vence sola y se cierra en el servidor al presionar "Cerrar sesión".
    </p>
  )
}
