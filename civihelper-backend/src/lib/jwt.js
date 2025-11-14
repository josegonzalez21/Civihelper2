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
const KEY_ID = toMaybeString(process.env.JWT_KEY_ID || process.env.JWT_KID);
const CLOCK_TOLERANCE = Number(process.env.JWT_CLOCK_TOLERANCE || 0); // segundos
const DEFAULT_EXP = process.env.JWT_EXPIRES_IN || "7d";

/* =============================
   Claves
============================= */
function normalizePem(pem) {
  // Permite pastas con \n en variables de entorno
  return String(pem).replace(/\\n/g, "\n");
}

/**
 * Obtiene la clave privada/segura para firmar.
 */
function getSignKey() {
  if (ALG === "RS256") {
    const priv = toMaybeString(process.env.JWT_PRIVATE_KEY);
    if (!priv) throw new Error("JWT_PRIVATE_KEY faltante para RS256");
    return normalizePem(priv);
  }
  const secret = toMaybeString(process.env.JWT_SECRET);
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET no establecido o inseguro (min 32 chars) para HS256.");
    // Si quieres permitir secretos cortos en dev, cámbialo bajo NODE_ENV !== 'production'
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
    return normalizePem(pub);
  }
  return getSignKey(); // HS256 usa el mismo secreto
}

/* =============================
   Firmar y verificar
============================= */

/**
 * Firma un JWT con payload + opciones.
 * - Solo añade issuer/audience/keyid si son strings válidos
 * - Por defecto usa expiresIn = DEFAULT_EXP (7d si no se define)
 * @param {object} payload - datos a incluir (plain object)
 * @param {object} opts - opciones extra (exp, aud, iss, notBefore, subject, jwtid, etc.)
 */
export function signJWT(payload, opts = {}) {
  if (payload == null || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Payload debe ser un objeto");
  }

  const key = getSignKey();

  // Construye opciones sin campos inválidos
  const options = {
    algorithm: ALG,
    expiresIn: opts.expiresIn || DEFAULT_EXP,
    // props estándar opcionales que puedes pasar en opts:
    // subject, jwtid, notBefore, header, audience, issuer, keyid, etc.
    ...opts,
  };

  // issuer / audience opcionales (solo si string y no sobreescritos en opts)
  if (ISSUER && options.issuer == null) options.issuer = ISSUER;
  if (AUDIENCE && options.audience == null) options.audience = AUDIENCE;

  // Header 'kid' solo si hay string y no lo definiste tú mismo
  if (KEY_ID && options.keyid == null) options.keyid = KEY_ID;

  // Limpia headers vacíos si vinieron en options.header
  if (options.header && typeof options.header === "object") {
    if (KEY_ID && options.header.kid == null) options.header.kid = KEY_ID;
    // asegúrate del alg correcto si personalizas header
    options.header.alg = ALG;
  }

  return jwt.sign(payload, key, options);
}

/**
 * Verifica un JWT y devuelve su payload.
 * - Solo valida issuer/audience si existen en configuración (salvo que los pases en opts)
 * @param {string} token
 * @param {object} opts - opciones adicionales para verify (maxAge, complete, etc.)
 */
export function verifyJWT(token, opts = {}) {
  if (!token || typeof token !== "string") {
    throw new Error("Token requerido para verifyJWT");
  }

  const key = getVerifyKey();

  const verifyOpts = {
    algorithms: [ALG],
    clockTolerance: CLOCK_TOLERANCE,
    ...opts,
  };

  if (ISSUER && verifyOpts.issuer == null) verifyOpts.issuer = ISSUER;
  if (AUDIENCE && verifyOpts.audience == null) verifyOpts.audience = AUDIENCE;

  return jwt.verify(token, key, verifyOpts);
}

/* =============================
   Utilidades opcionales
============================= */

/** Decodifica sin verificar (útil para debug; NO usar para seguridad). */
export function decodeJWT(token, options) {
  return jwt.decode(token, options); // options: { complete: true } para header+payload
}
