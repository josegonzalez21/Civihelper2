// src/lib/jwt.js
import jwt from "jsonwebtoken";

/* =============================
   Helpers de ENV
============================= */
const toMaybeString = (v) => {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
};

/* =============================
   Configuración
============================= */
const ALG = (process.env.JWT_ALG || "HS256").toUpperCase(); // "HS256" | "RS256"
const ISSUER = toMaybeString(process.env.JWT_ISSUER);       // solo si string
const AUDIENCE = toMaybeString(process.env.JWT_AUDIENCE);   // solo si string
const KEY_ID = toMaybeString(process.env.JWT_KEY_ID || process.env.JWT_KID);          // solo si string
const CLOCK_TOLERANCE = Number(process.env.JWT_CLOCK_TOLERANCE || 0); // segundos
const DEFAULT_EXP = process.env.JWT_EXPIRES_IN || "7d";

/**
 * Obtiene la clave privada/segura para firmar.
 */
function getSignKey() {
  if (ALG === "RS256") {
    const priv = toMaybeString(process.env.JWT_PRIVATE_KEY);
    if (!priv) throw new Error("JWT_PRIVATE_KEY faltante para RS256");
    return priv.replace(/\\n/g, "\n");
  }
  const secret = toMaybeString(process.env.JWT_SECRET);
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET no establecido o inseguro (min 32 chars) para HS256.");
  }
  return secret;
}

/**
 * Obtiene la clave pública para verificar.
 */
function getVerifyKey() {
  if (ALG === "RS256") {
    const pub = toMaybeString(process.env.JWT_PUBLIC_KEY);
    if (!pub) throw new Error("JWT_PUBLIC_KEY faltante para RS256");
    return pub.replace(/\\n/g, "\n");
  }
  return getSignKey(); // HS256 usa el mismo secreto
}

/* =============================
   Firmar y Verificar
============================= */

/**
 * Firma un JWT con payload + opciones.
 * - Solo añade issuer/audience/keyid si son strings válidos
 * @param {object} payload - datos a incluir
 * @param {object} opts - opciones extra (exp, aud, iss, etc.)
 */
export function signJWT(payload, opts = {}) {
  const key = getSignKey();

  // Construye opciones sin campos inválidos
  const options = {
    algorithm: ALG,
    expiresIn: opts.expiresIn || DEFAULT_EXP,
    ...opts,
  };

  // issuer / audience opcionales (solo si string)
  if (ISSUER) options.issuer = ISSUER;
  if (AUDIENCE) options.audience = AUDIENCE;

  // Header 'kid' solo si hay string
  if (KEY_ID) options.keyid = KEY_ID;

  return jwt.sign(payload, key, options);
}

/**
 * Verifica un JWT y devuelve su payload.
 * - Solo valida issuer/audience si existen
 * @param {string} token
 * @param {object} opts - opciones adicionales para verify
 */
export function verifyJWT(token, opts = {}) {
  const key = getVerifyKey();

  const verifyOpts = {
    algorithms: [ALG],
    clockTolerance: CLOCK_TOLERANCE,
    ...opts,
  };

  if (ISSUER) verifyOpts.issuer = ISSUER;
  if (AUDIENCE) verifyOpts.audience = AUDIENCE;

  return jwt.verify(token, key, verifyOpts);
}
