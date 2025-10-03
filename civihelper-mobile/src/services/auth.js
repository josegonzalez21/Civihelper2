// src/services/auth.js
// Funciones específicas de auth.
// Nota: No almacenar contraseñas en cliente. En producción, servir siempre por HTTPS.

import { fetchJSON } from "./api";

// Validación mínima en cliente (no sustituye validación del backend)
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const ALLOWED_ROLES = new Set(["CLIENT", "PROVIDER"]); // No permitir ADMIN desde la app pública

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function assertEmail(email) {
  const e = normalizeEmail(email);
  if (!EMAIL_RE.test(e)) throw new Error("Correo inválido");
  return e;
}

function assertPassword(pwd) {
  const p = String(pwd ?? "");
  if (p.length < 8) throw new Error("La contraseña debe tener al menos 8 caracteres");
  return p;
}

/**
 * Inicia sesión con email/clave.
 * @returns {Promise<{token:string, user:{id:string,name:string,email:string,role:string}}>}
 */
export function loginUser(email, password) {
  const e = assertEmail(email);
  const p = assertPassword(password);

  return fetchJSON("/auth/login", {
    method: "POST",
    body: { email: e, password: p },
  });
}

/**
 * Registra un usuario. Desde el cliente solo permitimos roles seguros.
 * @returns {Promise<{token:string, user:{id:string,name:string,email:string,role:string}}>}
 */
export function registerUser({ name, email, password, role = "CLIENT" }) {
  const e = assertEmail(email);
  const p = assertPassword(password);
  const safeRole = ALLOWED_ROLES.has(String(role).toUpperCase())
    ? String(role).toUpperCase()
    : "CLIENT";

  return fetchJSON("/auth/register", {
    method: "POST",
    body: {
      name: String(name || "").trim() || "Usuario",
      email: e,
      password: p,
      role: safeRole,
    },
  });
}

/**
 * Login social: /auth/social/:provider
 * payload puede ser:
 *  - { code, redirectUri } para Google/Facebook (PKCE)
 *  - { identityToken } para Apple
 *  - En modo demo: { email, fullName?, oauthId? }
 */
export function socialLogin(provider, payload) {
  const prov = String(provider || "").toLowerCase(); // "google" | "facebook" | "apple"
  if (!prov) throw new Error("Proveedor social requerido");

  // En modo demo, si viene email, lo validamos; si no, lo deja pasar al backend.
  if (payload?.email) payload.email = assertEmail(payload.email);

  return fetchJSON(`/auth/social/${prov}`, {
    method: "POST",
    body: payload || {},
  });
}

