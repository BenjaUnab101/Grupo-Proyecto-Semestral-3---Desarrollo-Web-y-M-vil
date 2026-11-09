// HU-09 · Estado de cupos de una sala (función pura). Antes vivía en components/SalaCard.jsx;
// se separó para que ese archivo solo exporte el componente (react-refresh).
// Función pura requerida por las notas técnicas
export function estadoCupos(sala) {
  const cap = Number(sala.capacidad) || 0;
  const mat = Number(sala.matriculados) || 0;

  if (cap <= 0) {
    return {
      texto: 'Sin información',
      claseBadge: 'bg-secondary',
      cuposDisponibles: 0,
      porcentaje: 100,
    };
  }

  const cupos = Math.max(0, cap - mat);
  const porcentaje = Math.min(100, Math.max(0, Math.round((mat / cap) * 100)));

  if (cupos === 0) {
    return {
      texto: 'Sin cupos',
      claseBadge: 'bg-danger text-white',
      cuposDisponibles: 0,
      porcentaje,
    };
  }

  if (cupos >= 1 && cupos <= 3) {
    return {
      texto: 'Últimos cupos',
      claseBadge: 'bg-warning text-dark',
      cuposDisponibles: cupos,
      porcentaje,
    };
  }

  return {
    texto: 'Cupos disponibles',
    claseBadge: 'bg-success text-white',
    cuposDisponibles: cupos,
    porcentaje,
  };
}
