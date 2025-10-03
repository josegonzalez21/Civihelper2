// src/middleware/rateLimit.js
import rateLimit, { ipKeyGenerator } from "express-rate-limit";

const isProd = process.env.NODE_ENV === "production";
const DEV_RATE_LIMIT_OFF = process.env.DEV_RATE_LIMIT_OFF === "1";

/* =============================
   Utilidades
============================= */

/** Une segmentos de clave ignorando nulos/vacíos y normalizando espacios */
function keyJoin(...parts) {
  return parts
    .map((p) => (p == null ? "" : String(p).trim()))
    .filter(Boolean)
    .join(":");
}

/** Calcula segundos hasta el reset de ventana */
function secondsUntilReset(req) {
  const rt = req?.rateLimit?.resetTime;
  let msLeft = 60_000; // fallback 60s
  if (rt instanceof Date) msLeft = Math.max(0, rt.getTime() - Date.now());
  else if (typeof rt === "number") msLeft = Math.max(0, rt - Date.now());
  // Algunos stores no exponen resetTime; devolvemos 60s por defecto
  return Math.ceil(msLeft / 1000) || 60;
}

/** Handler estándar 429 con Retry-After */
function default429Handler(req, res) {
  const secs = secondsUntilReset(req);
  res.setHeader("Retry-After", String(secs));
  return res.status(429).json({
    message: "Demasiadas solicitudes. Intenta nuevamente más tarde.",
    retryAfterSeconds: secs,
  });
}

/* =============================
   Creador de limiters
============================= */

/**
 * Creador de limiters con ajustes amigables para desarrollo.
 * - En dev, si DEV_RATE_LIMIT_OFF=1, el limiter se “apaga”.
 * - En dev, multiplica el límite x5 salvo que se especifique otro.
 */
export function createLimiter(options = {}) {
  if (!isProd && DEV_RATE_LIMIT_OFF) {
    return (_req, _res, next) => next(); // desactivar en dev si así se indica
  }

  const devOptions = !isProd
    ? {
        ...options,
        limit: Math.max(50, Number(options.limit || 0) * 5),
        skipSuccessfulRequests: options.skipSuccessfulRequests ?? true,
      }
    : options;

  return rateLimit({
    standardHeaders: true, // X-RateLimit-* y RateLimit-*
    legacyHeaders: false,  // X-RateLimit-Remaining (antiguo)
    ...devOptions,
    handler: options.handler || default429Handler,
  });
}

/* =============================
   Generadores de clave
============================= */

/** Solo IP (normalizada, IPv6 friendly) */
export function ipOnlyKey(req, res) {
  return ipKeyGenerator(req, res);
}

/** IP + email (si no hay email, solo IP) */
export function ipEmailKey(req, res) {
  const ip = ipKeyGenerator(req, res);
  const email = String(req?.body?.email || "").trim().toLowerCase();
  return email ? keyJoin(ip, email) : ip;
}

/** IP + provider (si no hay provider, solo IP) */
export function ipProviderKey(req, res) {
  const ip = ipKeyGenerator(req, res);
  const provider = String(req?.params?.provider || "").trim().toLowerCase();
  return provider ? keyJoin(ip, provider) : ip;
}

/** User ID (JWT) o IP si no autenticado */
export function userOrIpKey(req, res) {
  const uid = req?.user?.sub;
  return uid ? `user:${uid}` : `ip:${ipKeyGenerator(req, res)}`;
}

/** IP + ruta (método + baseUrl + path) para limitar por endpoint */
export function ipRouteKey(req, res) {
  const ip = ipKeyGenerator(req, res);
  const route = `${req.method}:${req.baseUrl || ""}${req.path || ""}`;
  return keyJoin(ip, route.toLowerCase());
}

/* =============================
   Limiters listos para usar
============================= */

/** Límite general para la API (aplícalo como “fallback” en index.js) */
export const generalLimiter = createLimiter({
  windowMs: 60 * 1000, // 1 min
  limit: 300,          // en dev ~1500 por el multiplicador
  // keyGenerator por defecto ya usa ipKeyGenerator (IPv6 OK)
});

/** Límite específico para /api/auth */
export const authLimiter = createLimiter({
  windowMs: 60 * 1000, // 1 min
  limit: 20,           // en dev ~100 por el multiplicador
  skipSuccessfulRequests: false,
  keyGenerator: ipOnlyKey, // usa IP normalizada (IPv6 OK)
});
