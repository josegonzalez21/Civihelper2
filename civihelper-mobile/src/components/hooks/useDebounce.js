// src/hooks/useDebounce.js
import { useEffect, useState } from "react";

/**
 * useDebounce
 * Devuelve un valor estabilizado (debounced) después de un retraso.
 *
 * @param {any} value - Valor a debouncer (ej. string de búsqueda)
 * @param {number} delay - ms de espera antes de emitir el valor (default 400)
 * @returns {any} valor debounced
 */
export default function useDebounce(value, delay = 400) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
