import { useEffect, useState } from 'react'

// TEC-17: carga datos de la API y entrega los estados que necesita la pantalla.
//   const { datos, error, cargando, recargar } = useRecurso(cargar)
// `cargar` es una función de services/ envuelta en useCallback (si cambia, se vuelve a cargar).
// Si `cargar` es null no se pide nada (por ejemplo, cuando no hay un apoderado elegido).
export function useRecurso(cargar) {
  const [estado, setEstado] = useState({ datos: undefined, error: null, cargando: true })
  const [version, setVersion] = useState(0) // al cambiar, se vuelve a pedir

  useEffect(() => {
    if (!cargar) return
    let vigente = true // si la pantalla cambia antes de la respuesta, esta se ignora
    cargar().then(
      (datos) => {
        if (vigente) setEstado({ datos, error: null, cargando: false })
      },
      (error) => {
        if (vigente) setEstado({ datos: undefined, error, cargando: false })
      },
    )
    return () => {
      vigente = false
    }
  }, [cargar, version])

  const recargar = () => {
    setEstado((anterior) => ({ ...anterior, error: null, cargando: true })) // los datos anteriores siguen visibles
    setVersion((v) => v + 1)
  }

  return { ...estado, recargar }
}
