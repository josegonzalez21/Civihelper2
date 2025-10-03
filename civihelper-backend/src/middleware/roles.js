// src/middleware/roles.js

/**
 * Normaliza a MAYÚSCULAS y valida el rol.
 */
function normalizeRole(r) {
  return String(r || "").toUpperCase();
}

/**
 * Verifica si el rol del usuario está incluido en la lista requerida.
 * @param {string} userRole
 * @param {string|string[]} required
 * @returns {boolean}
 */
function hasAnyRole(userRole, required) {
  const u = normalizeRole(userRole);
  const list = Array.isArray(required) ? required : [required];
  return list.map(normalizeRole).includes(u);
}

/**
 * Mapa de jerarquía de roles (mayor número = más privilegios)
 */
const ROLE_RANK = {
  CLIENT: 1,
  PROVIDER: 2,
  ADMIN: 3,
};

/**
 * Verifica si userRole >= minRole según jerarquía.
 */
function hasMinRole(userRole, minRole) {
  const u = ROLE_RANK[normalizeRole(userRole)] ?? 0;
  const m = ROLE_RANK[normalizeRole(minRole)] ?? Infinity; // Infinity fuerza false si minRole inválido
  return u >= m;
}

/**
 * Middleware: requiere UNO o VARIOS roles (OR).
 * Uso:
 *   app.post("/ruta", requireAuth, requireRole("ADMIN"), ...);
 *   app.post("/ruta", requireAuth, requireRole(["ADMIN","PROVIDER"]), ...);
 */
export function requireRole(required = "ADMIN") {
  return (req, _res, next) => {
    try {
      const current = req?.user?.role;
      if (!current || !hasAnyRole(current, required)) {
        const err = new Error(
          `Prohibido: requiere rol ${Array.isArray(required) ? required.join(" o ") : required}`
        );
        err.status = 403;
        return next(err);
      }
      return next();
    } catch (e) {
      e.status = e.status || 403;
      return next(e);
    }
  };
}

/**
 * Middleware: requiere rol MÍNIMO según jerarquía.
 * Jerarquía: ADMIN (3) > PROVIDER (2) > CLIENT (1)
 * Uso:
 *   app.post("/ruta", requireAuth, requireMinRole("PROVIDER"), ...);
 */
export function requireMinRole(minRole = "ADMIN") {
  return (req, _res, next) => {
    try {
      const current = req?.user?.role;
      if (!current || !hasMinRole(current, minRole)) {
        const err = new Error(`Prohibido: requiere al menos rol ${minRole}`);
        err.status = 403;
        return next(err);
      }
      return next();
    } catch (e) {
      e.status = e.status || 403;
      return next(e);
    }
  };
}
