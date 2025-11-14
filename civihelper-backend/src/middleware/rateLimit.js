// src/middleware/rateLimit.js
import rateLimit, { ipKeyGenerator } from "express-rate-limit";

/**
 * -----------------------------------------------------------------------------
 * Rate Limit centralizado
 *  - Compatible con IPv6 (usa ipKeyGenerator de express-rate-limit).
 *  - Respuestas 429 coherentes con Retry-After.
 *  - Modo DEV con multiplicador y opción de apagar por completo.
 *  - Allowlist por ENV (IPs/hosts separados por coma).
 *  - Skip para endpoints de health y estáticos.
 *  - Helpers de key para IP, IP+email, IP+provider, userOrIp, IP+ruta.
 * -----------------------------------------------------------------------------
 */

const isProd = process.env.NODE_ENV === "production";
const DEV_RATE_LIMIT_OFF = process.env.DEV_RATE_LIMIT_OFF === "1";
const DEV_LIMIT_MULT = Math.max(1, Number(process.env.DEV_LIMIT_MULT || 5));

/* =============================
   Utils
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

/** onLimitReached: log mínimo, sin filtrar PII */
function onLimitReached(req /*, res, optionsUsed */) {
  try {
    const ip = ipKeyGenerator(req);
    const route = `${req.method}:${req.baseUrl || ""}${req.path || ""}`;
    // eslint-disable-next-line no-console
    console.warn(`[rate-limit] Reached: ${ip} -> ${route}`);
  } catch {
    /* noop */
  }
}

/** Lista blanca por ENV (coma-separada) */
function parseAllowlist() {
  const raw = String(process.env.RATE_LIMIT_ALLOWLIST || "").trim();
  if (!raw) return [];
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

/** Skip para endpoints de health y estáticos comunes */
function defaultSkip(req) {
  const p = `${req.baseUrl || ""}${req.path || ""}`;
  if (!p) return false;
  const lower = p.toLowerCase();
  if (lower === "/" || lower.endsWith("/healthz") || lower.endsWith("/livez") || lower.endsWith("/readyz")) {
    return true;
  }
  // Si sirves estáticos locales
  if (lower.startsWith("/uploads/") || lower.startsWith("/static/") || lower.startsWith("/assets/")) {
    return true;
  }
  return false;
}

/* =============================
   Creador de limiters
============================= */

/**
 * Creador de limiters con ajustes amigables para desarrollo.
 * - En dev, si DEV_RATE_LIMIT_OFF=1 → se “apaga”.
 * - En dev, multiplica el límite por DEV_LIMIT_MULT (por defecto x5).
 * - Soporta allowlist por ENV: RATE_LIMIT_ALLOWLIST="127.0.0.1,::1,10.0.0.0"
 */
export function createLimiter(options = {}) {
  if (!isProd && DEV_RATE_LIMIT_OFF) {
    // Desactivar completamente en desarrollo
    return (_req, _res, next) => next();
  }

  const allowList = parseAllowlist();

  // Opciones por defecto (cabeceras estándar y handler consistente)
  const base = {
    standardHeaders: true,
    legacyHeaders: false,
    handler: options.handler || default429Handler,
    onLimitReached: options.onLimitReached || onLimitReached,
    keyGenerator: options.keyGenerator || ipKeyGenerator,
    skip: (req, res) => {
      if (typeof options.skip === "function" && options.skip(req, res)) return true;
      return defaultSkip(req);
    },
    allowList: options.allowList || allowList, // acepta array o función async
  };

  // En dev, relajamos límites salvo que nos los den explícitos
  const devAdjusted =
    !isProd
      ? {
          ...options,
          limit:
            options.limit != null
              ? Number(options.limit)
              : 100, // sensato por defecto si no pasaron limit
          windowMs: options.windowMs != null ? Number(options.windowMs) : 60 * 1000,
        }
      : options;

  const finalOptions = {
    ...base,
    ...devAdjusted,
  };

  // Multiplicador dev si estamos en dev y el limit es numérico
  if (!isProd && Number.isFinite(finalOptions.limit)) {
    finalOptions.limit = Math.max(1, Math.floor(Number(finalOptions.limit) * DEV_LIMIT_MULT));
  }

  return rateLimit(finalOptions);
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
  const uid = req?.user?.sub || req?.user?.id;
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

/**
 * Límite general para la API (aplícalo como “fallback”).
 * Ajustable por ENV:
 *  - GENERAL_WINDOW_MS (default 60000)
 *  - GENERAL_LIMIT (default 300)
 */
const GENERAL_WINDOW_MS = Number(process.env.GENERAL_WINDOW_MS || 60_000);
const GENERAL_LIMIT = Number(process.env.GENERAL_LIMIT || 300);

export const generalLimiter = createLimiter({
  windowMs: GENERAL_WINDOW_MS,
  limit: GENERAL_LIMIT,
  // keyGenerator por defecto: IP normalizada (IPv6 OK)
});

/**
 * Límite específico para /api/auth
 * Ajustable por ENV:
 *  - AUTH_WINDOW_MS (default 60000)
 *  - AUTH_LIMIT (default 20)
 */
const AUTH_WINDOW_MS = Number(process.env.AUTH_WINDOW_MS || 60_000);
const AUTH_LIMIT = Number(process.env.AUTH_LIMIT || 20);

export const authLimiter = createLimiter({
  windowMs: AUTH_WINDOW_MS,
  limit: AUTH_LIMIT,
  skipSuccessfulRequests: false,
  keyGenerator: ipOnlyKey, // usa IP normalizada (IPv6 OK)
});
