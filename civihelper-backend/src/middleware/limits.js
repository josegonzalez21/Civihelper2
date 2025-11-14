// src/middleware/limits.js
import rateLimit from "express-rate-limit";

/**
 * Handler estándar para respuestas JSON de rate-limit
 */
function json429Handler(req, res /*, next*/) {
  return res.status(429).json({
    ok: false,
    message: "Demasiadas solicitudes, intenta nuevamente más tarde.",
    retryAfterSeconds: Math.ceil(
      (req?.rateLimit?.resetTime
        ? new Date(req.rateLimit.resetTime).getTime() - Date.now()
        : 60_000) / 1000
    ),
  });
}

/**
 * Helper para crear un limiter con valores por defecto y soporte ENV
 */
function createSimpleLimiter({ windowMs, max, message, keyGenerator } = {}) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: json429Handler,
    keyGenerator,
    message: message || undefined,
  });
}

/** Límite general para toda la API */
export const generalLimiter = createSimpleLimiter({
  windowMs: 15 * 60 * 1000, // 15 min
  max: Number(process.env.GENERAL_LIMIT || 1000), // límite ajustable por ENV
});

/** Límite estricto para firmar subidas */
export const uploadSignLimiter = createSimpleLimiter({
  windowMs: 10 * 60 * 1000, // 10 min
  max: Number(process.env.UPLOAD_SIGN_LIMIT || 60),
});

/** Límite laxo para firmar lecturas (GET presignadas) */
export const uploadGetLimiter = createSimpleLimiter({
  windowMs: 10 * 60 * 1000, // 10 min
  max: Number(process.env.UPLOAD_GET_LIMIT || 300),
});

/** Límite para login/register */
export const authLimiter = createSimpleLimiter({
  windowMs: 5 * 60 * 1000, // 5 min
  max: Number(process.env.AUTH_LIMIT || 30),
});
