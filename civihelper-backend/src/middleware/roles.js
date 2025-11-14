// src/middleware/roles.js

/**
 * Conjunto de roles válidos (en MAYÚSCULAS).
 * Ajusta si agregas más roles en el futuro.
 */
export const ROLE_RANK = {
  CLIENT: 1,
  PROVIDER: 2,
  ADMIN: 3,
};

/**
 * Normaliza a MAYÚSCULAS y valida el rol.
 * Devuelve la cadena en MAYÚSCULAS o "" si es falsy.
 * @param {unknown} r
 * @returns {string}
 */
export function normalizeRole(r) {
  return String(r || "").toUpperCase();
}

/**
 * Verifica si el rol del usuario está incluido en la lista requerida (OR).
 * @param {string} userRole
 * @param {string|string[]} required
 * @returns {boolean}
 */
export function hasAnyRole(userRole, required) {
  const u = normalizeRole(userRole);
  const list = (Array.isArray(required) ? required : [required]).map(normalizeRole);
  return list.includes(u);
}

/**
 * Verifica si userRole >= minRole según jerarquía.
 * Jerarquía definida por ROLE_RANK (mayor número = más privilegios).
 * @param {string} userRole
 * @param {string} minRole
 * @returns {boolean}
 */
export function hasMinRole(userRole, minRole) {
  const u = ROLE_RANK[normalizeRole(userRole)] ?? 0;
  const m = ROLE_RANK[normalizeRole(minRole)];
  if (m == null) return false; // minRole inválido → false
  return u >= m;
}

/**
 * Crea un Error 403 consistente.
 * @param {string} message
 */
function forbidden(message) {
  const err = new Error(message || "Prohibido");
  err.status = 403;
  err.code = "FORBIDDEN";
  return err;
}

/**
 * Middleware: requiere UNO o VARIOS roles (OR).
 * Uso:
 *   app.post("/ruta", requireAuth, requireRole("ADMIN"), ...);
 *   app.post("/ruta", requireAuth, requireRole(["ADMIN","PROVIDER"]), ...);
 *
 * @param {string|string[]} required
 * @returns {(req,res,next)=>void}
 */
export function requireRole(required = "ADMIN") {
  const requiredList = Array.isArray(required) ? required : [required];
  const label = requiredList.map(normalizeRole).join(" o ");

  return (req, _res, next) => {
    try {
      const current = req?.user?.role;
      if (!current || !hasAnyRole(current, requiredList)) {
        return next(forbidden(`Prohibido: requiere rol ${label}`));
      }
      return next();
    } catch (e) {
      e.status = e.status || 403;
      e.code = e.code || "FORBIDDEN";
      return next(e);
    }
  };
}

/**
 * Middleware: requiere rol MÍNIMO según jerarquía.
 * Jerarquía: ADMIN (3) > PROVIDER (2) > CLIENT (1)
 * Uso:
 *   app.post("/ruta", requireAuth, requireMinRole("PROVIDER"), ...);
 *
 * @param {keyof typeof ROLE_RANK} minRole
 * @returns {(req,res,next)=>void}
 */
export function requireMinRole(minRole = "ADMIN") {
  const label = normalizeRole(minRole);

  return (req, _res, next) => {
    try {
      const current = req?.user?.role;
      if (!current || !hasMinRole(current, minRole)) {
        return next(forbidden(`Prohibido: requiere al menos rol ${label}`));
      }
      return next();
    } catch (e) {
      e.status = e.status || 403;
      e.code = e.code || "FORBIDDEN";
      return next(e);
    }
  };
}
