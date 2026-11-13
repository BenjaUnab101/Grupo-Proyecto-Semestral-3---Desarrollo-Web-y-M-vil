import { createContext, useContext } from 'react'

// Sesión compartida por toda la página (la entrega SesionProvider.jsx).
export const SesionContexto = createContext(null)

export function useSesion() {
  return useContext(SesionContexto)
}