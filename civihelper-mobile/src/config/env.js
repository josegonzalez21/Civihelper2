// src/config/env.js
export const ENV = {
  API_URL: process.env.EXPO_PUBLIC_API_URL || "",
  CDN_BASE_URL: (process.env.EXPO_PUBLIC_CDN_BASE_URL || "").replace(/\/+$/, ""),
};

if (!ENV.API_URL) {
  // Mejor fallar fuerte en dev que depurar llamadas a 'undefined'
  console.warn("[ENV] Falta EXPO_PUBLIC_API_URL en tu entorno de Expo.");
}
