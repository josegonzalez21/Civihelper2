// src/hooks/useCountdown.js
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * useCountdown
 * Hook para manejar un contador regresivo (segundos).
 *
 * @param {number} initialSeconds - cantidad de segundos inicial.
 * @param {object} options
 *  - autoStart?: boolean (default true)
 *  - onFinish?: () => void  callback cuando llega a 0
 */
export default function useCountdown(initialSeconds, { autoStart = true, onFinish } = {}) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [running, setRunning] = useState(autoStart);
  const intervalRef = useRef(null);

  const clear = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    if (!intervalRef.current) {
      setRunning(true);
      intervalRef.current = setInterval(() => {
        setSeconds((prev) => {
          if (prev <= 1) {
            clear();
            setRunning(false);
            if (onFinish) onFinish();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  }, [clear, onFinish]);

  const pause = useCallback(() => {
    clear();
    setRunning(false);
  }, [clear]);

  const reset = useCallback((newSeconds = initialSeconds, autostart = true) => {
    clear();
    setSeconds(newSeconds);
    if (autostart) {
      start();
    } else {
      setRunning(false);
    }
  }, [clear, initialSeconds, start]);

  useEffect(() => {
    if (autoStart) start();
    return clear;
  }, [autoStart, start, clear]);

  return {
    seconds,   // segundos restantes
    running,   // bool si está en curso
    start,     // función para iniciar
    pause,     // función para pausar
    reset,     // resetear a initialSeconds (o nuevo valor)
  };
}
