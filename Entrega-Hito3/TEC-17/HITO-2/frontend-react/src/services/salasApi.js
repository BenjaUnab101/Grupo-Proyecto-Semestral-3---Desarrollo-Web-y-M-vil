// TEC-17 / HU-09: cupos por sala. La API cuenta las matrículas en PostgreSQL.
import { pedir } from './http.js'

// Respuesta de la API -> lo que usa SalaCard (capacidad y matriculados).
export function aSala(dto) {
  return { id: dto.id, nombre: dto.nombre, nivel: dto.nivel, capacidad: dto.capacidad, matriculados: dto.matriculados }
}

export async function listarCuposSalas() {
  return (await pedir('/salas/cupos')).map(aSala)
}
