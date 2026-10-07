import { useCallback, useEffect, useRef, useState } from 'react';
import { obtenerPronostico } from '../services/climaService';

const TIMEOUT_MS = 8000;

export function useClima() {
  const [pronostico, setPronostico] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [reintento, setReintento] = useState(0);

  const solicitudActual = useRef(0);

  const reintentar = useCallback(() => {
    setReintento((actual) => actual + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const solicitudId = ++solicitudActual.current;

    let activo = true;
    let timeoutAlcanzado = false;

    setCargando(true);
    setError(null);

    const timeoutId = setTimeout(() => {
      timeoutAlcanzado = true;
      controller.abort();
    }, TIMEOUT_MS);

    async function cargarPronostico() {
      try {
        const datos = await obtenerPronostico(controller.signal);

        if (!activo || solicitudId !== solicitudActual.current) {
          return;
        }

        setPronostico(datos);
        setError(null);
      } catch (err) {
        if (!activo || solicitudId !== solicitudActual.current) {
          return;
        }

        if (timeoutAlcanzado) {
          setError(
            'La solicitud del pronóstico tardó demasiado. Intenta nuevamente.'
          );
          return;
        }

        if (err?.name === 'AbortError') {
          return;
        }

        setError(
          err?.message ||
            'No fue posible obtener el pronóstico meteorológico.'
        );
      } finally {
        if (activo && solicitudId === solicitudActual.current) {
          setCargando(false);
        }
      }
    }

    cargarPronostico();

    return () => {
      activo = false;
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [reintento]);

  return {
    pronostico,
    cargando,
    error,
    reintentar,
  };
}