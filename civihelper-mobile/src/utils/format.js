// src/utils/format.js

// Convierte un Retry-After (segundos o fecha HTTP) a milisegundos
export function parseRetryAfter(msOrDate) {
  if (!msOrDate) return null;
  // Si viene como número en segundos (e.g., "30")
  const n = parseInt(msOrDate, 10);
  if (!Number.isNaN(n)) return n * 1000;

  // Si viene como fecha (e.g., "Wed, 21 Oct 2015 07:28:00 GMT")
  const when = Date.parse(msOrDate);
  if (!Number.isNaN(when)) return Math.max(0, when - Date.now());

  return null;
}

// Formatea CLP de manera robusta (con fallback si Intl no está disponible)
export function formatPriceCL(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "—";

  try {
    // Hermes/JS moderno: Intl ya está soportado
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      maximumFractionDigits: 0,
    }).format(num);
  } catch {
    // Fallback simple: separador de miles con puntos, sin decimales
    const rounded = Math.round(num);
    return "$" + rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }
}

// Utilidades menores opcionales y reutilizables
export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
export const truncate = (txt, max = 60) =>
  typeof txt === "string" && txt.length > max ? txt.slice(0, max - 1) + "…" : txt;

export const safeNumber = (v, fallback = 0) =>
  Number.isFinite(Number(v)) ? Number(v) : fallback;
