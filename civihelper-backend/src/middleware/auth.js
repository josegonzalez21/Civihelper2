// src/middleware/auth.js
import jwt from "jsonwebtoken";

/* =========================
   Configuración / ENV
========================= */
const ALG = (process.env.JWT_ALG || "HS256").toUpperCase(); // "HS256" | "RS256"
const ISSUER = process.env.JWT_ISSUER || undefined;
const AUDIENCE = process.env.JWT_AUDIENCE || undefined;
const CLOCK_TOLERANCE = Number(process.env.JWT_CLOCK_TOLERANCE || 0); // seg

// HS256
const HS_SECRET = process.env.JWT_SECRET || "";

// RS256: PEM fijo o JWKS
const PUBLIC_KEY_PEM = (process.env.JWT_PUBLIC_KEY || "").replace(/\\n/g, "\n");
const JWKS_URI = process.env.JWT_JWKS_URI || ""; // ej: https://domain/.well-known/jwks.json
const JWKS_CACHE_TTL_MS = Number(process.env.JWT_CACHE_TTL_MS || 10 * 60 * 1000); // 10 min

// Validación básica de ALG/config al cargar
if (!["HS256", "RS256"].includes(ALG)) {
  throw new Error(`JWT_ALG no soportado: ${ALG}`);
}
if (ALG === "HS256" && HS_SECRET.length < 32 && process.env.NODE_ENV !== "production") {
  console.warn(
    "[auth] Advertencia: JWT_SECRET corto/inseguro para HS256 en desarrollo. Usa ≥32 chars."
  );
}
if (ALG === "RS256" && !PUBLIC_KEY_PEM && !JWKS_URI) {
  throw new Error("Para RS256 debes definir JWT_PUBLIC_KEY o JWT_JWKS_URI");
}

/* =========================
   JWKS cache (in-memory)
========================= */
const jwksCache = Object.create(null); // kid -> { pem, expiresAt }

async function fetchJwks() {
  // Node 18+ tiene fetch nativo
  const res = await fetch(JWKS_URI, { method: "GET" });
  if (!res.ok) throw new Error(`No se pudo obtener JWKS (${res.status})`);
  const data = await res.json();
  if (!data || !Array.isArray(data.keys)) throw new Error("JWKS inválido");
  return data.keys;
}

async function jwkToPem(jwk) {
  const { kty, n, e } = jwk || {};
  if (kty !== "RSA" || !n || !e) throw new Error("JWK no soportado (se espera RSA)");
  const { createPublicKey } = await import("crypto");
  const keyObj = createPublicKey({ key: { kty: "RSA", n, e }, format: "jwk" });
  return keyObj.export({ type: "spki", format: "pem" }).toString();
}

async function getPemForKid(kid) {
  const now = Date.now();
  const cached = jwksCache[kid];
  if (cached && cached.expiresAt > now) return cached.pem;

  const keys = await fetchJwks();
  const jwk = keys.find((k) => String(k.kid) === String(kid) && k.kty === "RSA");
  if (!jwk) throw new Error("KID no encontrado en JWKS");

  const pem = await jwkToPem(jwk);
  jwksCache[kid] = { pem, expiresAt: now + JWKS_CACHE_TTL_MS };
  return pem;
}

/* =========================
   Extracción de token
========================= */
/**
 * Obtiene el token de:
 *  1) Authorization: Bearer <token>
 *  2) Cookie "token"
 *  3) Header "x-access-token"
 *  4) Query param ?token=
 */
function getToken(req) {
  // 1) Authorization
  const h = req.headers?.authorization ?? req.headers?.Authorization;
  if (typeof h === "string") {
    // Soporta espacios extra/case insensible
    const match = /^Bearer\s+(.+)$/i.exec(h.trim());
    if (match?.[1]) return match[1].trim();
  }
  // 2) Cookie "token"
  if (req.cookies?.token) return String(req.cookies.token).trim();
  // 3) Header alterno
  if (req.headers?.["x-access-token"]) return String(req.headers["x-access-token"]).trim();
  // 4) Query param
  if (req.query?.token) return String(req.query.token).trim();
  return null;
}

/* =========================
   Verificación JWT (async)
========================= */
async function getVerifyKeyForHeader(header) {
  if (ALG === "HS256") {
    if (!HS_SECRET) throw new Error("JWT_SECRET no configurado para HS256");
    return HS_SECRET;
  }

  // RS256
  if (PUBLIC_KEY_PEM) return PUBLIC_KEY_PEM;

  if (JWKS_URI) {
    const kid = header?.kid;
    if (!kid) throw new Error("Token RS256 sin 'kid' y sin JWT_PUBLIC_KEY configurado");
    return getPemForKid(kid); // async
  }

  throw new Error("Falta JWT_PUBLIC_KEY o JWT_JWKS_URI para RS256");
}

async function verifyAsync(token) {
  // Decodificar encabezado para elegir clave (no valida firma aún)
  const decoded = jwt.decode(token, { complete: true });
  if (!decoded || !decoded.header) throw new Error("Token inválido");
  const { header } = decoded;

  if (header.alg !== ALG) {
    // Evita ataques "alg none"/downgrade
    const err = new Error("Algoritmo JWT no permitido");
    err.name = "JsonWebTokenError";
    throw err;
  }

  const key = await getVerifyKeyForHeader(header);
  const opts = {
    algorithms: [ALG],
    issuer: ISSUER,
    audience: AUDIENCE,
    clockTolerance: CLOCK_TOLERANCE,
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
    scope: payload.scope || payload.scp || undefined,
    iat: payload.iat,
    exp: payload.exp,
    email: payload.email,
  };
}

/* =========================
   Middlewares
========================= */
/**
 * optionalAuth:
 *  - Si hay token válido ⇒ setea req.user/req.auth/req.token
 *  - Si no hay token o es inválido ⇒ sigue como público
 */
export async function optionalAuth(req, _res, next) {
  try {
    const token = getToken(req);
    if (!token) return next();
    const payload = await verifyAsync(token);
    req.user = buildUser(payload);
    req.auth = payload;
    req.token = token;
    return next();
  } catch {
    // token inválido/expirado: continuar como anónimo
    return next();
  }
}

/**
 * requireAuth:
 *  - Exige token válido ⇒ 401 si falta o es inválido
 */
export async function requireAuth(req, res, next) {
  try {
    const token = getToken(req);
    if (!token) return res.status(401).json({ message: "No autorizado" });

    const payload = await verifyAsync(token);
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
        : e?.message?.includes("Algoritmo")
        ? "Token inválido"
        : "No autorizado";
    return res.status(401).json({ message: msg });
  }
}

/**
 * requireScopes(["scope:a", "scope:b"])
 * - Verifica que el JWT incluya TODOS los scopes requeridos
 */
export function requireScopes(required = []) {
  const reqList = Array.isArray(required)
    ? required
    : String(required || "").split(" ");
  const requiredSet = new Set(reqList.filter(Boolean));

  return (req, res, next) => {
    const current = req?.user;
    if (!current) return res.status(401).json({ message: "No autorizado" });

    const tokenScopes = Array.isArray(current.scope)
      ? current.scope
      : typeof current.scope === "string"
      ? current.scope.split(" ")
      : [];

    const got = new Set(tokenScopes.filter(Boolean));
    for (const sc of requiredSet) {
      if (!got.has(sc)) {
        return res.status(403).json({ message: `Prohibido: requiere scope '${sc}'` });
      }
    }
    return next();
  };
}

// Exporta getToken si te resulta útil en tests u otros middlewares
export { getToken };
