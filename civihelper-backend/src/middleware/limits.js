// src/middleware/limits.js
import rateLimit from "express-rate-limit";

function jsonHandler(req, res /*, next*/) {
  return res.status(429).json({
    ok: false,
    message: "Demasiadas solicitudes, intenta nuevamente más tarde.",
  });
}

/** Límite general (API completa) */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 1000,                // por IP
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonHandler,
});

/** Límite para firmar subidas (estricto) */
export const uploadSignLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 min
  max: 60,                  // 60 firmas / 10 min / IP
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonHandler,
});

/** Límite para firmar lecturas (más laxo) */
export const uploadGetLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 min
  max: 300,                 // 300 firmas GET / 10 min / IP
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonHandler,
});

/** (Opcional) Límite de login/register si quieres endurecer auth */
export const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 min
  max: 30,                 // 30 intentos / 5 min
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonHandler,
});
