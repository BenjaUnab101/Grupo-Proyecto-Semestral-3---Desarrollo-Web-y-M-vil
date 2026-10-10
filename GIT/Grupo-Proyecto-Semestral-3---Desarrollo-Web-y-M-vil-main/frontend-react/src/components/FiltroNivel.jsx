// HU-03: filtro de comunicados por nivel. Es un componente controlado: no guarda
// estado propio; recibe las opciones, el valor activo y avisa los cambios al padre.
// Usa <button> nativos, por lo que funciona con teclado (Tab + Enter/Espacio)
// y aria-pressed comunica a lectores de pantalla cuál opción está activa.
export default function FiltroNivel({ opciones = [], filtroActivo, onCambiarFiltro, controla }) {
  return (
    <div className="filtro-nivel" role="group" aria-label="Filtrar comunicados por nivel">
      {opciones.map((opcion) => {
        const estaActivo = opcion === filtroActivo

        return (
          <button
            key={opcion}
            type="button"
            className={`filtro-nivel__opcion${estaActivo ? ' filtro-nivel__opcion--activa' : ''}`}
            aria-pressed={estaActivo}
            aria-controls={controla}
            onClick={() => onCambiarFiltro(opcion)}
          >
            {opcion}
          </button>
        )
      })}
    </div>
  )
}
