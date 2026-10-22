'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Ejecuta `cargar` al montar el componente y luego cada `intervaloMs`
 * (por defecto 5 s). Sirve para que la bandeja y los enviados se
 * actualicen solos mientras los workers procesan las colas.
 */
export function usePolling<T>(cargar: () => Promise<T>, intervaloMs = 5000) {
  const [datos, setDatos] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [actualizado, setActualizado] = useState<Date | null>(null);

  // Guardamos la función en una ref para no reiniciar el intervalo en cada render.
  const cargarRef = useRef(cargar);
  useEffect(() => {
    cargarRef.current = cargar;
  }, [cargar]);

  const recargar = useCallback(async () => {
    try {
      const resultado = await cargarRef.current();
      setDatos(resultado);
      setError(null);
      setActualizado(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    // La primera carga se agenda en lugar de llamarse directamente dentro del efecto.
    const primera = setTimeout(recargar, 0);
    const id = setInterval(recargar, intervaloMs);
    return () => {
      clearTimeout(primera);
      clearInterval(id);
    };
  }, [recargar, intervaloMs]);

  return { datos, error, cargando, actualizado, recargar };
}
