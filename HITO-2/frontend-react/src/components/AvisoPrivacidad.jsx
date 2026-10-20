// Aviso de privacidad del portal apoderados (contexto simulado/demo).
export default function AvisoPrivacidad() {
  return (
    <p className="text-muted small mb-0">
      Portal simulado con fines de demostración: los datos de apoderados y alumnos son ficticios. La sesión se
      guarda solo en la memoria del navegador, no se almacena en localStorage, sessionStorage ni cookies, y se
      cierra automáticamente al recargar la página o al presionar "Cerrar sesión".
    </p>
  )
}
