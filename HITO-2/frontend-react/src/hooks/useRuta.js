import { useSyncExternalStore } from 'react'
import { rutaDesdeHash } from '../utils/rutas.js'

// Apartado actual según el hash de la URL (#/calendario -> "calendario").
// useSyncExternalStore suscribe a React al evento `hashchange` del navegador: cada vez que se
// hace clic en un enlace del menú (o en "atrás" del navegador o del teléfono Android), la
// página se vuelve a dibujar con el apartado nuevo. No se guarda una copia en useState.
function suscribir(avisar) {
  window.addEventListener('hashchange', avisar)
  return () => window.removeEventListener('hashchange', avisar)
}

const leerHash = () => window.location.hash

export function useRuta() {
  const hash = useSyncExternalStore(suscribir, leerHash, () => '')
  return rutaDesdeHash(hash)
}
