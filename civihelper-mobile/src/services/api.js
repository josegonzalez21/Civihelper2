/* eslint-disable no-console */

/* ============================================================================
   BASE DE API
   - Define EXPO_PUBLIC_API_URL en tu .env (Expo lo expone en tiempo de build)
   Guía rápida:
     • Web / iOS Simulator:  http://localhost:4000
     • Android Emulator:     http://10.0.2.2:4000
     • Teléfono físico:      http://192.168.1.12:4000  (tu IP LAN)
============================================================================ */
const DEFAULT_BASE = "http://192.168.1.12:4000";

const RAW_BASE =
  (globalThis?.process?.env?.EXPO_PUBLIC_API_URL ||
    (typeof process !== "undefined" && process?.env?.EXPO_PUBLIC_API_URL)) ||
  DEFAULT_BASE;

// normaliza: sin slash al final y sin duplicar /api
const BASE_TRIM = String(RAW_BASE).replace(/\/+$/, "");
export const API_BASE = BASE_TRIM;
export const API_URL = /\/api$/i.test(BASE_TRIM) ? BASE_TRIM : `${BASE_TRIM}/api`;

/* ============================================================================
   TOKEN (memoria + persistencia)
============================================================================ */
let AUTH_TOKEN = null;

// Persistencia: AsyncStorage si existe; si no, localStorage (web)
let _Storage = null;
try {
  // eslint-disable-next-line import/no-extraneous-dependencies, global-require
  _Storage = require("@react-native-async-storage/async-storage").default;
} catch {
  _Storage = null;
}

const TOKEN_KEY = "@auth/token";

async function _persistToken(token) {
  try {
    if (_Storage) {
      if (token) await _Storage.setItem(TOKEN_KEY, token);
      else await _Storage.removeItem(TOKEN_KEY);
    } else if (typeof localStorage !== "undefined") {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      else localStorage.removeItem(TOKEN_KEY);
    }
  } catch (e) {
    console.warn("[API] No se pudo persistir token:", e?.message || e);
  }
}

async function _readPersistedToken() {
  try {
    if (_Storage) return (await _Storage.getItem(TOKEN_KEY)) || null;
    if (typeof localStorage !== "undefined") return localStorage.getItem(TOKEN_KEY);
  } catch (e) {
    console.warn("[API] No se pudo leer token persistido:", e?.message || e);
  }
  return null;
}

// Hidratación perezosa: request() esperará la primera vez si no hay token en memoria
let _hydrated = false;
let _hydratingPromise = null;
async function _ensureHydrated() {
  if (_hydrated) return;
  if (_hydratingPromise) {
    await _hydratingPromise;
    return;
  }
  _hydratingPromise = (async () => {
    const t = await _readPersistedToken();
    if (t) AUTH_TOKEN = t;
    _hydrated = true;
  })();
  await _hydratingPromise;
}

export function setAuthToken(token) {
  AUTH_TOKEN = token || null;
  _persistToken(AUTH_TOKEN);
}
export function getAuthToken() { return AUTH_TOKEN; }
export function clearAuthToken() {
  AUTH_TOKEN = null;
  _persistToken(null);
}

/* ============================================================================
   UTILS
============================================================================ */
function buildQuery(query, alreadyHasQuery = false) {
  if (!query || typeof query !== "object") return "";
  const entries = Object.entries(query).filter(
    ([, v]) => v !== undefined && v !== null && v !== ""
  );
  if (!entries.length) return "";
  const sp = new URLSearchParams();
  for (const [k, v] of entries) sp.append(k, String(v));
  const sep = alreadyHasQuery ? "&" : "?";
  return `${sep}${sp.toString()}`;
}

function safeJSONParse(text) {
  try { return text ? JSON.parse(text) : {}; }
  catch { return { raw: text }; }
}

function isFormData(body) {
  return typeof FormData !== "undefined" && body instanceof FormData;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function looksLikeHTML(text = "") {
  const t = String(text).trim().slice(0, 200).toLowerCase();
  return t.startsWith("<!doctype") || t.startsWith("<html");
}

function ensureLeadingSlash(p) {
  if (!p) return "/";
  return p.startsWith("/") ? p : `/${p}`;
}

function makeUrl(path, query) {
  const isAbsolute = /^https?:\/\//i.test(path);
  const rel = isAbsolute ? path : `${API_URL}${ensureLeadingSlash(path)}`;
  const alreadyHasQuery = rel.includes("?");
  return `${rel}${buildQuery(query, alreadyHasQuery)}`;
}

/* ============================================================================
   CORE REQUEST con timeout, retries y logs
   opts:
    - method, body, headers, query
    - timeoutMs = 15000
    - retries = 1
    - retryDelayMs = 600
    - tag = "API"
============================================================================ */
export async function request(path, opts = {}) {
  const {
    method = "GET",
    body,
    headers = {},
    query,
    timeoutMs = 15000,
    retries = 1,
    retryDelayMs = 600,
    tag = "API",
  } = opts;

  // ⚠️ Asegura token desde persistencia si aún no está en memoria
  await _ensureHydrated();

  let attempt = 0;
  let lastErr;

  const url = makeUrl(path, query);

  while (attempt <= retries) {
    // Headers
    const h = { ...headers };
    if (!h.Accept) h.Accept = "application/json";
    // No forzar Content-Type si es FormData (el boundary lo arma el runtime)
    if (body !== undefined && !isFormData(body) && !h["Content-Type"]) {
      h["Content-Type"] = "application/json";
    }
    if (!h["X-Requested-With"]) h["X-Requested-With"] = "XMLHttpRequest";
    if (AUTH_TOKEN && !h.Authorization) h.Authorization = `Bearer ${AUTH_TOKEN}`;

    const controller = new AbortController();
    const startedAt = Date.now();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      console.log(`[${tag}] → (${attempt + 1}/${retries + 1}) ${method} ${url}`);

      const res = await fetch(url, {
        method,
        headers: h,
        body: body !== undefined && !isFormData(body) ? JSON.stringify(body) : body,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const dt = Date.now() - startedAt;
      console.log(`[${tag}] ← ${res.status} ${res.statusText || ""} (${dt}ms) ${url}`);

      if (res.status === 204) return {};

      const contentType = res.headers.get("content-type") || "";
      const text = await res.text();

      if (looksLikeHTML(text) || contentType.includes("text/html")) {
        const htmlErr = new Error(
          "La URL de la API no respondió JSON. Revisa EXPO_PUBLIC_API_URL o que el backend esté arriba."
        );
        htmlErr.status = res.status || 503;
        htmlErr.data = { contentType, snippet: text.slice(0, 200).replace(/\s+/g, " "), url };
        throw htmlErr;
      }

      const data = safeJSONParse(text);

      if (!res.ok) {
        // Manejo explícito de 429 con Retry-After
        if (res.status === 429 && attempt < retries) {
          const ra = res.headers.get("retry-after");
          const asInt = ra ? parseInt(ra, 10) : null;
          const waitMs = !Number.isNaN(asInt) && asInt != null ? asInt * 1000 : retryDelayMs * (attempt + 1);
          console.warn(`[${tag}] 429 Too Many Requests, reintentando en ${waitMs}ms…`);
          await sleep(waitMs);
          attempt++;
          continue;
        }

        // Reintentos para 5xx
        if (res.status >= 500 && attempt < retries) {
          const delay = retryDelayMs * (attempt + 1);
          console.warn(`[${tag}] HTTP ${res.status}, reintentando en ${delay}ms…`);
          await sleep(delay);
          attempt++;
          continue;
        }

        const detail = data?.message || data?.error || data?.raw || res.statusText || "Error de red";
        const error = new Error(detail);
        error.status = res.status;
        error.data = data;
        throw error;
      }

      return data || {};
    } catch (err) {
      clearTimeout(timeoutId);

      const aborted =
        err?.name === "AbortError" ||
        String(err?.message || "").toLowerCase().includes("aborted");

      if (aborted) {
        const dt = Date.now() - startedAt;
        const toErr = new Error("Tiempo de espera agotado. Intenta nuevamente.");
        toErr.code = "ETIMEDOUT";
        console.error(`[${tag}] ✖ AbortError/Timeout tras ${dt}ms en ${url}`);

        if (attempt < retries) {
          const delay = retryDelayMs * (attempt + 1);
          console.warn(`[${tag}] Timeout, reintentando en ${delay}ms…`);
          await sleep(delay);
          attempt++;
          continue;
        }
        throw toErr;
      }

      // Errores de red sin status (ej: desconexión, DNS, CORS en web, etc.)
      console.error(`[${tag}] ✖ Error de red:`, err);
      lastErr = err;

      if (!err?.status && attempt < retries) {
        const delay = retryDelayMs * (attempt + 1);
        console.warn(`[${tag}] Reintento por error de red en ${delay}ms…`);
        await sleep(delay);
        attempt++;
        continue;
      }

      throw err;
    }
  }

  throw lastErr || new Error("Error desconocido en request()");
}

// Alias de compatibilidad
export const fetchJSON = request;

/* ============================================================================
   Cliente "api" estilo axios (para useHomeData y otros):
   - api.get(path, { params, headers, tag })
   - api.post(path, body, { headers, tag })
   - api.put(path, body, { headers, tag })
   - api.delete(path, { headers, tag })
============================================================================ */
export const api = {
  get: (path, { params, headers, tag } = {}) =>
    request(path, { method: "GET", query: params, headers, tag }),
  post: (path, body, { headers, tag } = {}) =>
    request(path, { method: "POST", body, headers, tag }),
  put: (path, body, { headers, tag } = {}) =>
    request(path, { method: "PUT", body, headers, tag }),
  delete: (path, { headers, tag } = {}) =>
    request(path, { method: "DELETE", headers, tag }),
};

/* ============================================================================
   ENDPOINTS DE CONVENIENCIA (JSON)
============================================================================ */

// --- Auth ---
export const login = async (email, password) => {
  const data = await request("/auth/login", {
    method: "POST",
    body: { email, password },
    tag: "LOGIN",
  });
  if (data?.token) setAuthToken(data.token); // guarda token en memoria + persistencia
  return data;
};

export const register = (name, email, password, role = "CLIENT") =>
  request("/auth/register", { method: "POST", body: { name, email, password, role }, tag: "REGISTER" });

export const forgotPassword = (email) =>
  request("/auth/password/forgot", { method: "POST", body: { email }, tag: "FORGOT" });

export const resetPassword = ({ email, token, newPassword }) =>
  request("/auth/password/reset", { method: "POST", body: { email, token, newPassword }, tag: "RESET" });

// Perfil
export const me = (headers) => request("/me", { headers, tag: "ME" });
// Guardar KEY del avatar (S3)
export const meUpdateAvatar = (key) =>
  request("/me/avatar", { method: "PUT", body: { key }, tag: "ME_AVATAR" });

// Listado plano de categorías con filtros opcionales
// params: { search?, page?, pageSize?, sector?, onlyRoots?, parentId? }
export const categories = (params) =>
  request("/categories", { query: params, tag: "CATEGORIES" });

// Servicios (público)
export const services = (params) =>
  request("/services", { query: params, tag: "SERVICES" });

// Featured público
export const featured = ({ page = 1, pageSize = 8 } = {}) =>
  request("/featured", { query: { page, pageSize }, tag: "FEATURED" });

// =========================
// ADMIN: Categorías
// =========================
export const categoriesTree = () => request("/categories/tree", { tag: "CAT_TREE" });
export const categoriesRoots = () => request("/categories/roots", { tag: "CAT_ROOTS" });
export const categoryChildren = (id) => request(`/categories/${id}/children`, { tag: "CAT_CHILDREN" });

export function adminCreateCategory({ name, icon = null, parentId = null, isActive = true, sector = "OTHER" }) {
  return request("/categories", {
    method: "POST",
    body: { name, icon, parentId, isActive, sector },
    tag: "CAT_CREATE",
  });
}
export function adminUpdateCategory(id, { name, icon, parentId, isActive, sector }) {
  return request(`/categories/${id}`, {
    method: "PUT",
    body: { name, icon, parentId, isActive, sector },
    tag: "CAT_UPDATE",
  });
}
export function adminDeleteCategory(id) {
  return request(`/categories/${id}`, { method: "DELETE", tag: "CAT_DELETE" });
}

// NUEVO: set icon/cover por KEY S3 (endpoints admin en backend)
export const adminSetCategoryIcon = (id, key) =>
  request(`/categories/${id}/icon`, { method: "PUT", body: { key }, tag: "CAT_ICON" });
export const adminSetCategoryCover = (id, key) =>
  request(`/categories/${id}/cover`, { method: "PUT", body: { key }, tag: "CAT_COVER" });

/* ----------
   NUEVO: Multipart para crear/actualizar categoría con imagen (icon)
   - Soporta RN ({ uri, name, type }) y Web (File/Blob)
---------- */
function appendMaybeFile(fd, fieldName, file) {
  if (!file) return;
  const isBlob = typeof Blob !== "undefined" && file instanceof Blob;
  if (isBlob) {
    const fname = file.name || "icon.png";
    fd.append(fieldName, file, fname);
  } else if (file && file.uri) {
    fd.append(fieldName, {
      uri: file.uri,
      name: file.name || "icon.jpg",
      type: file.type || "image/jpeg",
    });
  }
}

export async function adminCreateCategoryMultipart({
  name,
  parentId = null,
  isActive = true,
  sector = "OTHER",
  icon = null,
}) {
  const fd = new FormData();
  if (name != null) fd.append("name", String(name));
  if (parentId != null) fd.append("parentId", String(parentId));
  if (isActive != null) fd.append("isActive", String(!!isActive));
  if (sector != null) fd.append("sector", String(sector));
  appendMaybeFile(fd, "icon", icon);

  // intenta /admin/categories; si no existe, cae a /categories
  try {
    return await request("/admin/categories", { method: "POST", body: fd, tag: "CAT_CREATE_MP" });
  } catch (e) {
    if (e?.status === 404) {
      return await request("/categories", { method: "POST", body: fd, tag: "CAT_CREATE_MP_FB" });
    }
    throw e;
  }
}

export async function adminUpdateCategoryMultipart(
  id,
  { name, parentId, isActive, sector, icon = null } = {}
) {
  const fd = new FormData();
  if (name !== undefined) fd.append("name", String(name));
  if (parentId !== undefined) {
    parentId == null ? fd.append("parentId", "") : fd.append("parentId", String(parentId));
  }
  if (isActive !== undefined) fd.append("isActive", String(!!isActive));
  if (sector !== undefined) fd.append("sector", String(sector));
  appendMaybeFile(fd, "icon", icon);

  try {
    return await request(`/admin/categories/${id}`, { method: "PATCH", body: fd, tag: "CAT_UPDATE_MP" });
  } catch (e) {
    if (e?.status === 404) {
      return await request(`/categories/${id}`, { method: "PATCH", body: fd, tag: "CAT_UPDATE_MP_FB" });
    }
    throw e;
  }
}

// =========================
/** ADMIN: Service Types (curados) */
// =========================
export async function adminCreateServiceType(params = {}) {
  const fd = new FormData();
  if (params.name) fd.append("name", String(params.name));
  if (params.description != null) fd.append("description", String(params.description));
  if (params.isActive != null) fd.append("isActive", String(params.isActive));
  if (params.image) fd.append("image", params.image); // { uri, name, type }
  return request("/admin/service-types", { method: "POST", body: fd, tag: "ST_CREATE" });
}
export const adminListServiceTypes = () =>
  request("/admin/service-types", { tag: "ST_LIST" });
export async function adminUpdateServiceType(id, params = {}) {
  const fd = new FormData();
  if (params.name != null) fd.append("name", String(params.name));
  if (params.description != null) fd.append("description", String(params.description));
  if (params.isActive != null) fd.append("isActive", String(params.isActive));
  if (params.image) fd.append("image", params.image);
  return request(`/admin/service-types/${id}`, { method: "PUT", body: fd, tag: "ST_UPDATE" });
}
export const adminDeleteServiceType = (id) =>
  request(`/admin/service-types/${id}`, { method: "DELETE", tag: "ST_DELETE" });

// =========================
// ADMIN: Servicios curados
// =========================
export async function adminCreateService(params = {}) {
  const fd = new FormData();
  if (params.title) fd.append("title", String(params.title));
  if (params.description != null) fd.append("description", String(params.description));
  if (params.priceFrom != null) fd.append("priceFrom", String(params.priceFrom));
  if (params.city != null) fd.append("city", String(params.city));
  if (params.serviceTypeId != null) fd.append("serviceTypeId", String(params.serviceTypeId));
  if (params.cover) fd.append("cover", params.cover); // { uri, name, type }
  if (Array.isArray(params.photos)) params.photos.forEach((p) => fd.append("photos", p));
  return request("/admin/services", { method: "POST", body: fd, tag: "SVC_CREATE" });
}
export const adminListServices = () =>
  request("/admin/services", { tag: "SVC_LIST" });
export async function adminUpdateService(id, params = {}) {
  const fd = new FormData();
  if (params.title != null) fd.append("title", String(params.title));
  if (params.description != null) fd.append("description", String(params.description));
  if (params.priceFrom != null) fd.append("priceFrom", String(params.priceFrom));
  if (params.city != null) fd.append("city", String(params.city));
  if (params.serviceTypeId != null) fd.append("serviceTypeId", String(params.serviceTypeId));
  if (params.cover) fd.append("cover", params.cover);
  if (Array.isArray(params.photos)) params.photos.forEach((p) => fd.append("photos", p));
  return request(`/admin/services/${id}`, { method: "PUT", body: fd, tag: "SVC_UPDATE" });
}
export const adminDeleteService = (id) =>
  request(`/admin/services/${id}`, { method: "DELETE", tag: "SVC_DELETE" });

/* ============================================================================
   ADMIN: Usuarios (detección con caché y fallbacks)
   - Detecta la ruta disponible: "/admin/users", "/users" o ninguna.
   - Cachea el resultado para no repetir 404.
============================================================================ */
let _usersApiPath = null; // "admin", "users", "none"

async function detectUsersApiPath() {
  if (_usersApiPath) return _usersApiPath;

  // Intento 1: /admin/users
  try {
    const probe = await request("/admin/users", { tag: "ADM_USERS_PROBE" });
    _usersApiPath = "admin";
    return _usersApiPath;
  } catch (e1) {
    if (e1?.status !== 404) throw e1;
  }

  // Intento 2: /users
  try {
    const probe = await request("/users", { tag: "USERS_PROBE" });
    _usersApiPath = "users";
    return _usersApiPath;
  } catch (e2) {
    if (e2?.status !== 404) throw e2;
  }

  // Ninguna existe
  _usersApiPath = "none";
  return _usersApiPath;
}

export async function adminListUsers() {
  const path = await detectUsersApiPath();
  if (path === "admin") {
    const data = await request("/admin/users", { tag: "ADM_USERS" });
    return Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
  }
  if (path === "users") {
    const data = await request("/users", { tag: "USERS_FALLBACK" });
    return Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
  }
  // "none" → módulo no habilitado en backend
  return [];
}

export async function adminToggleBlockUser(userId, blocked) {
  const path = await detectUsersApiPath();
  if (path === "admin") {
    return request(`/admin/users/${userId}/block`, {
      method: "POST",
      body: { blocked: !!blocked },
      tag: "ADM_USER_BLOCK",
    });
  }
  if (path === "users") {
    return request(`/users/${userId}/block`, {
      method: "POST",
      body: { blocked: !!blocked },
      tag: "USER_BLOCK_FALLBACK",
    });
  }
  const err = new Error("El módulo de usuarios no está habilitado en el backend.");
  err.code = "MODULE_DISABLED";
  throw err;
}

export async function adminSetUserRole(userId, role) {
  const path = await detectUsersApiPath();
  if (path === "admin") {
    return request(`/admin/users/${userId}/role`, {
      method: "POST",
      body: { role },
      tag: "ADM_USER_ROLE",
    });
  }
  if (path === "users") {
    return request(`/users/${userId}/role`, {
      method: "POST",
      body: { role },
      tag: "USER_ROLE_FALLBACK",
    });
  }
  const err = new Error("El módulo de usuarios no está habilitado en el backend.");
  err.code = "MODULE_DISABLED";
  throw err;
}


// =========================
// PROVIDER/CLIENT: Servicios (S3 keys flow)
// =========================

// Establecer portada por KEY (y miniatura opcional)
export const serviceSetCover = (serviceId, { key, thumbKey }) =>
  request(`/services/${serviceId}/cover`, {
    method: "PUT",
    body: { key, thumbKey },
    tag: "SVC_COVER",
  });

// Agregar imágenes adicionales por KEYs
// items: [{ key, thumbKey? }, ...]
export const serviceAddImages = (serviceId, items = []) =>
  request(`/services/${serviceId}/images`, {
    method: "POST",
    body: { items },
    tag: "SVC_IMAGES",
  });

/* ============================================================================
   UPLOADS S3 presign
============================================================================ */

// Firma para subir (PUT)
export const uploadsSign = ({ kind, ids, contentType, expiresIn = 60 }) =>
  request("/uploads/sign", {
    method: "POST",
    body: { kind, ids, contentType, expiresIn },
    tag: "S3_SIGN_PUT",
  });

// Firma para lectura (GET presign)
// Usa: { key } o { keys: [] }
export const uploadsSignGet = (payload) =>
  request("/uploads/sign-get", {
    method: "POST",
    body: payload,
    tag: "S3_SIGN_GET",
  });

/* ============================================================================
   Back-compat y export default
   - Permite usar: api.login(...), { api }.login(...), y API.api.login(...)
============================================================================ */
api.login = login;
api.register = register;
api.me = me;

// También exponemos algunos helpers comunes en api.*
api.uploadsSign = uploadsSign;
api.uploadsSignGet = uploadsSignGet;
api.meUpdateAvatar = meUpdateAvatar;
api.serviceSetCover = serviceSetCover;
api.serviceAddImages = serviceAddImages;
api.adminSetCategoryIcon = adminSetCategoryIcon;
api.adminSetCategoryCover = adminSetCategoryCover;
api.adminCreateCategoryMultipart = adminCreateCategoryMultipart;
api.adminUpdateCategoryMultipart = adminUpdateCategoryMultipart;

const defaultExport = {
  api,            // { get, post, put, delete, login, register, me, ... }
  request,
  login,
  register,
  me,
  meUpdateAvatar,
  uploadsSign,
  uploadsSignGet,
  serviceSetCover,
  serviceAddImages,
  adminSetCategoryIcon,
  adminSetCategoryCover,
  // Admin categories multipart:
  adminCreateCategoryMultipart,
  adminUpdateCategoryMultipart,
  // Admin users helpers:
  adminListUsers,
  adminToggleBlockUser,
  adminSetUserRole,
  API_BASE,
  API_URL,
  getAuthToken,
  setAuthToken,
  clearAuthToken,
};

export default defaultExport;
