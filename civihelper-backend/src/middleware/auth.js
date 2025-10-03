// src/middleware/auth.js
import jwt from "jsonwebtoken";

/* =========================
   Helpers de configuración
========================= */
const ALG = (process.env.JWT_ALG || "HS256").toUpperCase(); // "HS256" | "RS256"
const ISSUER = process.env.JWT_ISSUER || undefined;
const AUDIENCE = process.env.JWT_AUDIENCE || undefined;
const CLOCK_TOLERANCE = Number(process.env.JWT_CLOCK_TOLERANCE || 0); // segundos

function getVerifyKey() {
  if (ALG === "RS256") {
    const pub = process.env.JWT_PUBLIC_KEY;
    if (!pub) throw new Error("JWT_PUBLIC_KEY faltante para RS256");
    return pub.replace(/\\n/g, "\n"); // por si viene en una sola línea
  }
  // HS256
  return process.env.JWT_SECRET || "changeme";
}

/* =========================
   Extracción de token
========================= */
/**
 * Obtiene el token Bearer del header, cookie, header alterno o query.
 */
function getToken(req) {
  // 1) Authorization: Bearer <token>
  const h = req.headers?.authorization || req.headers?.Authorization;
  if (typeof h === "string") {
    const [type, token] = h.split(" ");
    if (type?.toLowerCase() === "bearer" && token) return token.trim();
  }
  // 2) Cookie "token" (requiere cookie-parser en la app)
  if (req.cookies?.token) return String(req.cookies.token).trim();

  // 3) Header alterno
  if (req.headers["x-access-token"]) return String(req.headers["x-access-token"]).trim();

  // 4) Query param (útil para tests/links puntuales)
  if (req.query?.token) return String(req.query.token).trim();

  return null;
}

/* =========================
   Verificación JWT
========================= */
/**
 * Verifica el JWT y devuelve su payload (lanza Error si no es válido).
 */
function verify(token) {
  const key = getVerifyKey();
  const opts = {
    algorithms: [ALG],
    issuer: ISSUER,
    audience: AUDIENCE,
    clockTolerance: CLOCK_TOLERANCE, // segundos de tolerancia por desfase de reloj
  };
  return jwt.verify(token, key, opts);
}

/* =========================
   Normalización de usuario
========================= */
function buildUser(payload) {
  return {
    sub: payload.sub,
    role: payload.role || "CLIENT",
    tokenVersion: payload.tokenVersion ?? 0,
    iat: payload.iat,
    exp: payload.exp,
    // puedes agregar más claims si los firmas (p.ej. email)
  };
}

/* =========================
   Middlewares
========================= */
/**
 * optionalAuth:
 * - Si hay token válido ⇒ rellena req.user/req.auth/req.token y sigue.
 * - Si no hay token o es inválido ⇒ sigue como anónimo.
 */
export function optionalAuth(req, _res, next) {
  try {
    const token = getToken(req);
    if (!token) return next();

    const payload = verify(token);
    req.user = buildUser(payload);
    req.auth = payload; // payload completo, por si lo necesitas en otras rutas
    req.token = token;
    return next();
  } catch {
    // Token inválido/expirado: continuar como público
    return next();
  }
}

/**
 * requireAuth:
 * - Exige un token válido. Si falla ⇒ 401.
 */
export function requireAuth(req, res, next) {
  try {
    const token = getToken(req);
    if (!token) {
      return res.status(401).json({ message: "No autorizado" });
    }

    const payload = verify(token);
    req.user = buildUser(payload);
    req.auth = payload;
    req.token = token;
    return next();
  } catch (e) {
    const msg =
      e?.name === "TokenExpiredError"
        ? "Sesión expirada"
        : e?.name === "JsonWebTokenError"
        ? "Token inválido"
        : "No autorizado";
    return res.status(401).json({ message: msg });
  }
}
