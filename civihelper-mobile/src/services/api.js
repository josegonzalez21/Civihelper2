/* eslint-disable no-console */

/* ============================================================================
   BASE DE API
   - Define EXPO_PUBLIC_API_URL en tu .env
   Guía:
     • Web / iOS Simulator:  http://localhost:4000
     • Android Emulator:     http://10.0.2.2:4000
     • Teléfono físico:      http://192.168.1.4:4000 (tu IP LAN)
============================================================================ */
const DEFAULT_BASE = "http://192.168.1.4:4000";

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

// Hidratación perezosa
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
export function getAuthToken() {
  return AUTH_TOKEN;
}
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
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text };
  }
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
   HELPERS: Fallback por paths alternativos (404/html -> probar siguiente)
============================================================================ */
function isLikelyHtmlError(err) {
  return !!(err && err.status && err.data && typeof err.data.snippet === "string");
}

async function requestOrNull(path, opts = {}) {
  try {
    return await request(path, opts);
  } catch (e) {
    // Si es 404 o un 4xx que vino con HTML (algunos backends devuelven HTML en 404)
    if (e?.status === 404 || isLikelyHtmlError(e)) {
      return null;
    }
    throw e;
  }
}

/**
 * Intenta múltiples paths en orden y devuelve el primero OK.
 * Si todos fallan en 404/HTML, lanza un error claro.
 */
async function tryPaths(paths = [], opts = {}) {
  if (!Array.isArray(paths) || paths.length === 0) {
    throw new Error("tryPaths(paths): paths vacío");
  }
  for (const p of paths) {
    const res = await requestOrNull(p, opts);
    if (res !== null) return res;
  }
  const tag = opts?.tag || "API";
  const tried = paths.join(", ");
  const err = new Error(`[${tag}] Ninguno de los endpoints existe: ${tried}`);
  err.code = "ENDPOINT_NOT_FOUND";
  throw err;
}

/* ============================================================================
   CORE REQUEST con timeout, retries, manejo 304 y logs
============================================================================ */
export async function request(path, opts = {}) {
  const {
    method = "GET",
    body,
    headers = {},
    query,
    timeoutMs = 30000,
    // 🔧 Por defecto SIN reintentos implícitos
    retries = 0,
    retryDelayMs = 600,
    tag = "API",
    _cacheBusted = false,
  } = opts;

  await _ensureHydrated();

  let attempt = 0;
  let lastErr;

  const buildAttemptUrl = (busted = false) => {
    const q = { ...(query || {}) };
    if (busted && method === "GET") q.ts = Date.now();
    return makeUrl(path, q);
  };

  while (attempt <= retries) {
    const h = { ...headers };
    if (!h.Accept) h.Accept = "application/json";
    if (body !== undefined && !isFormData(body) && !h["Content-Type"]) {
      h["Content-Type"] = "application/json";
    }
    if (!h["X-Requested-With"]) h["X-Requested-With"] = "XMLHttpRequest";
    if (AUTH_TOKEN && !h.Authorization) h.Authorization = `Bearer ${AUTH_TOKEN}`;

    const controller = new AbortController();
    const startedAt = Date.now();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const url = buildAttemptUrl(_cacheBusted);

    try {
      console.log(`[${tag}] → (${attempt + 1}/${retries + 1}) ${method} ${url}`);

      const res = await fetch(url, {
        method,
        headers: h,
        body:
          body !== undefined && !isFormData(body)
            ? JSON.stringify(body)
            : body,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const dt = Date.now() - startedAt;
      console.log(
        `[${tag}] ← ${res.status} ${res.statusText || ""} (${dt}ms) ${url}`
      );

      // 204 -> vacío OK
      if (res.status === 204) return {};

      // 304 -> contenido no modificado
      if (res.status === 304) {
        console.warn(`[${tag}] HTTP 304 recibido.`);
        if (!_cacheBusted && method === "GET") {
          console.warn(`[${tag}] Reintentando con cache-busting…`);
          return await request(path, {
            ...opts,
            _cacheBusted: true,
          });
        }
        return { __status: 304 };
      }

      const contentType = (res.headers.get("content-type") || "").toLowerCase();
      const text = await res.text();

      if (looksLikeHTML(text) || contentType.includes("text/html")) {
        const htmlErr = new Error(
          "La URL de la API no respondió JSON. Revisa EXPO_PUBLIC_API_URL o que el backend esté arriba."
        );
        htmlErr.status = res.status || 503;
        htmlErr.data = {
          contentType,
          snippet: text.slice(0, 200).replace(/\s+/g, " "),
          url,
        };
        throw htmlErr;
      }

      const data = safeJSONParse(text);

      if (!res.ok) {
        // trato especial 429 con Retry-After — solo si hay retries explícitos
        if (retries > 0 && res.status === 429 && attempt < retries) {
          const ra = res.headers.get("retry-after");
          const asInt = ra ? parseInt(ra, 10) : null;
          const waitMs =
            !Number.isNaN(asInt) && asInt != null
              ? asInt * 1000
              : retryDelayMs * (attempt + 1);
          console.warn(
            `[${tag}] 429 Too Many Requests, reintentando en ${waitMs}ms…`
          );
          await sleep(waitMs);
          attempt++;
          continue;
        }

        // reintentos para 5xx — solo si hay retries explícitos
        if (retries > 0 && res.status >= 500 && attempt < retries) {
          const delay = retryDelayMs * (attempt + 1);
          console.warn(`[${tag}] HTTP ${res.status}, reintentando en ${delay}ms…`);
          await sleep(delay);
          attempt++;
          continue;
        }

        const detail =
          data?.message ||
          data?.error ||
          data?.raw ||
          res.statusText ||
          "Error de red";
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
        const toErr = new Error(
          "Tiempo de espera agotado. Intenta nuevamente."
        );
        toErr.code = "ETIMEDOUT";
        console.error(
          `[${tag}] ✖ AbortError/Timeout tras ${dt}ms en ${url}`
        );

        if (retries > 0 && attempt < retries) {
          const delay = retryDelayMs * (attempt + 1);
          console.warn(`[${tag}] Timeout, reintentando en ${delay}ms…`);
          await sleep(delay);
          attempt++;
          continue;
        }
        throw toErr;
      }

      console.error(`[${tag}] ✖ Error de red:`, err);
      lastErr = err;

      // reintento solo para errores sin status (fallo de red) — si hay retries explícitos
      if (retries > 0 && !err?.status && attempt < retries) {
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

// Alias
export const fetchJSON = request;

/* ============================================================================
   Cliente "api" estilo axios
============================================================================ */
export const api = {
  get: (path, { params, headers, tag } = {}) =>
    request(path, { method: "GET", query: params, headers, tag }),
  post: (path, body, { headers, tag } = {}) =>
    request(path, { method: "POST", body, headers, tag }),
  put: (path, body, { headers, tag } = {}) =>
    request(path, { method: "PUT", body, headers, tag }),
  patch: (path, body, { headers, tag } = {}) =>
    request(path, { method: "PATCH", body, headers, tag }),
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
  if (data?.token) setAuthToken(data.token);
  return data;
};

export const register = (name, email, password, role = "CLIENT") =>
  request("/auth/register", {
    method: "POST",
    body: { name, email, password, role },
    tag: "REGISTER",
  });

export const forgotPassword = (email) =>
  request("/auth/password/forgot", {
    method: "POST",
    body: { email },
    tag: "FORGOT",
  });

export const resetPassword = ({ email, token, newPassword }) =>
  request("/auth/password/reset", {
    method: "POST",
    body: { email, token, newPassword },
    tag: "RESET",
  });

// Perfil
export const me = (headers) => request("/me", { headers, tag: "ME" });
export const meUpdateAvatar = (key) =>
  request("/me/avatar", { method: "PUT", body: { key }, tag: "ME_AVATAR" });

// Categorías
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
export const categoriesTree = () =>
  request("/categories/tree", { tag: "CAT_TREE" });
export const categoriesRoots = () =>
  request("/categories/roots", { tag: "CAT_ROOTS" });
export const categoryChildren = (id) =>
  request(`/categories/${id}/children`, { tag: "CAT_CHILDREN" });

export function adminCreateCategory({
  name,
  icon = null,
  parentId = null,
  isActive = true,
  sector = "OTHER",
}) {
  return request("/categories", {
    method: "POST",
    body: { name, icon, parentId, isActive, sector },
    tag: "CAT_CREATE",
  });
}
export function adminUpdateCategory(id, {
  name,
  icon,
  parentId,
  isActive,
  sector,
}) {
  return request(`/categories/${id}`, {
    method: "PUT",
    body: { name, icon, parentId, isActive, sector },
    tag: "CAT_UPDATE",
  });
}
export function adminDeleteCategory(id) {
  return request(`/categories/${id}`, {
    method: "DELETE",
    tag: "CAT_DELETE",
  });
}

// Set icon/cover por KEY S3
export const adminSetCategoryIcon = (id, key) =>
  request(`/categories/${id}/icon`, {
    method: "PUT",
    body: { key },
    tag: "CAT_ICON",
  });
export const adminSetCategoryCover = (id, key) =>
  request(`/categories/${id}/cover`, {
    method: "PUT",
    body: { key },
    tag: "CAT_COVER",
  });

// Multipart helpers
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

  try {
    return await request("/admin/categories", {
      method: "POST",
      body: fd,
      tag: "CAT_CREATE_MP",
    });
  } catch (e) {
    if (e?.status === 404) {
      return await request("/categories", {
        method: "POST",
        body: fd,
        tag: "CAT_CREATE_MP_FB",
      });
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
    parentId == null
      ? fd.append("parentId", "")
      : fd.append("parentId", String(parentId));
  }
  if (isActive !== undefined) fd.append("isActive", String(!!isActive));
  if (sector !== undefined) fd.append("sector", String(sector));
  appendMaybeFile(fd, "icon", icon);

  try {
    return await request(`/admin/categories/${id}`, {
      method: "PATCH",
      body: fd,
      tag: "CAT_UPDATE_MP",
    });
  } catch (e) {
    if (e?.status === 404) {
      return await request(`/categories/${id}`, {
        method: "PATCH",
        body: fd,
        tag: "CAT_UPDATE_MP_FB",
      });
    }
    throw e;
  }
}

// =========================
// ADMIN: Service Types
// =========================
export async function adminCreateServiceType(params = {}) {
  const fd = new FormData();
  if (params.name) fd.append("name", String(params.name));
  if (params.description != null) fd.append("description", String(params.description));
  if (params.isActive != null) fd.append("isActive", String(params.isActive));
  if (params.image) fd.append("image", params.image);
  return request("/admin/service-types", {
    method: "POST",
    body: fd,
    tag: "ST_CREATE",
  });
}
export const adminListServiceTypes = () =>
  request("/admin/service-types", { tag: "ST_LIST" });
export async function adminUpdateServiceType(id, params = {}) {
  const fd = new FormData();
  if (params.name != null) fd.append("name", String(params.name));
  if (params.description != null)
    fd.append("description", String(params.description));
  if (params.isActive != null) fd.append("isActive", String(params.isActive));
  if (params.image) fd.append("image", params.image);
  return request(`/admin/service-types/${id}`, {
    method: "PUT",
    body: fd,
    tag: "ST_UPDATE",
  });
}
export const adminDeleteServiceType = (id) =>
  request(`/admin/service-types/${id}`, {
    method: "DELETE",
    tag: "ST_DELETE",
  });

// =========================
// ADMIN: Servicios curados
// =========================
export async function adminCreateService(params = {}) {
  const fd = new FormData();
  if (params.title) fd.append("title", String(params.title));
  if (params.description != null)
    fd.append("description", String(params.description));
  if (params.priceFrom != null) fd.append("priceFrom", String(params.priceFrom));
  if (params.city != null) fd.append("city", String(params.city));
  if (params.serviceTypeId != null)
    fd.append("serviceTypeId", String(params.serviceTypeId));
  if (params.cover) fd.append("cover", params.cover);
  if (Array.isArray(params.photos))
    params.photos.forEach((p) => fd.append("photos", p));
  return request("/admin/services", {
    method: "POST",
    body: fd,
    tag: "SVC_CREATE",
  });
}
export const adminListServices = (params = {}) =>
  request("/admin/services", { query: params, tag: "SVC_LIST" });
export async function adminUpdateService(id, params = {}) {
  const fd = new FormData();
  if (params.title != null) fd.append("title", String(params.title));
  if (params.description != null)
    fd.append("description", String(params.description));
  if (params.priceFrom != null) fd.append("priceFrom", String(params.priceFrom));
  if (params.city != null) fd.append("city", String(params.city));
  if (params.serviceTypeId != null)
    fd.append("serviceTypeId", String(params.serviceTypeId));
  if (params.cover) fd.append("cover", params.cover);
  if (Array.isArray(params.photos))
    params.photos.forEach((p) => fd.append("photos", p));
  return request(`/admin/services/${id}`, {
    method: "PUT",
    body: fd,
    tag: "SVC_UPDATE",
  });
}
export const adminDeleteService = (id) =>
  request(`/admin/services/${id}`, {
    method: "DELETE",
    tag: "SVC_DELETE",
  });

// =========================
// ADMIN: Users
// =========================
export const adminListUsers = (params = {}) =>
  request("/admin/users", { query: params, tag: "ADMIN_USERS_LIST" });

export const adminToggleBlockUser = (userId, blocked) =>
  request(`/admin/users/${userId}/block`, {
    method: "POST",
    body: { blocked },
    tag: "ADMIN_USER_BLOCK",
  });

export const adminSetUserRole = (userId, role) =>
  request(`/admin/users/${userId}/role`, {
    method: "POST",
    body: { role },
    tag: "ADMIN_USER_ROLE",
  });

// =========================
// ADMIN: Moderation & Reports
// =========================
export const adminListReports = (params = {}) =>
  request("/admin/reports", { query: params, tag: "ADMIN_REPORTS_LIST" });

export const adminResolveReport = (reportId) =>
  request(`/admin/reports/${reportId}/resolve`, {
    method: "POST",
    tag: "ADMIN_REPORT_RESOLVE",
  });

export const adminBlockEntity = (entityId, type) =>
  request("/admin/moderation/block", {
    method: "POST",
    body: { id: entityId, type },
    tag: "ADMIN_BLOCK",
  });

// =========================
// ADMIN: Dashboard/Metrics
// =========================
export const adminGetMetrics = () =>
  request("/admin/metrics", { tag: "ADMIN_METRICS" });

export const adminGetSystemStatus = () =>
  request("/admin/system/status", { tag: "ADMIN_STATUS" });

/* ============================================================================
   PROMOTIONS (banners) — para el carrusel del Home
============================================================================ */

// Público (para Home)
export const promotions = (params = {}) =>
  request("/promotions", { query: params, tag: "PROMOS" });

// ADMIN CRUD
export const adminCreatePromotion = (payload) =>
  request("/promotions", { method: "POST", body: payload, tag: "PROMO_CREATE" });

export const adminUpdatePromotion = (id, payload) =>
  request(`/promotions/${id}`, {
    method: "PUT",
    body: payload,
    tag: "PROMO_UPDATE",
  });

export const adminDeletePromotion = (id) =>
  request(`/promotions/${id}`, {
    method: "DELETE",
    tag: "PROMO_DELETE",
  });

/* ============================================================================
   UPLOADS S3 presign + helpers
============================================================================ */

// Firma para subir (PUT)
export const uploadsSign = ({
  kind,
  ids,
  contentType,
  mime,
  expiresIn = 60,
}) =>
  request("/uploads/sign", {
    method: "POST",
    body: {
      kind,
      ids,
      mime: contentType || mime,
      contentType: contentType || mime,
      expiresIn,
    },
    tag: "S3_SIGN_PUT",
  });

// Firma para lectura (GET presign)
export const uploadsSignGet = (payload) =>
  request("/uploads/sign-get", {
    method: "POST",
    body: payload,
    tag: "S3_SIGN_GET",
  });

/** Convierte un asset de RN { uri } o un File/Blob a Blob */
async function toBlobAny(fileOrAsset, fallbackMime = "application/octet-stream") {
  // Web: ya es Blob/File
  if (typeof Blob !== "undefined" && fileOrAsset instanceof Blob)
    return fileOrAsset;

  // RN: asset { uri, type?, name? }
  if (fileOrAsset && fileOrAsset.uri) {
    const uri = String(fileOrAsset.uri);
    try {
      const r = await fetch(uri);
      return await r.blob();
    } catch {
      // Fallback con expo-file-system
      try {
        const FileSystem = require("expo-file-system");
        const b64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const byteChars = atob(b64);
        const bytes = new Uint8Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++)
          bytes[i] = byteChars.charCodeAt(i);
        return new Blob([bytes], { type: fileOrAsset.type || fallbackMime });
      } catch {
        throw new Error("No se pudo leer el archivo para subir a S3.");
      }
    }
  }

  throw new Error("Archivo inválido para S3 (se esperaba File/Blob o { uri }).");
}

/**
 * Flujo completo: firmar + PUT a S3 + devolver KEY
 */
export async function s3UploadAndGetKey({ kind, file, mime, ids }) {
  if (!kind) throw new Error("Falta kind para la firma S3");
  if (!file) throw new Error("Falta archivo para subir");
  if (!mime) throw new Error("Falta mime (Content-Type)");

  // 1) Firma
  const signed = await uploadsSign({ kind, ids, contentType: mime });

  // 2) Blob desde RN/Web
  const blob = await toBlobAny(file, mime);

  // 3) PUT
  const headers = signed.requiredHeaders || { "Content-Type": mime };
  const putRes = await fetch(signed.url, {
    method: "PUT",
    headers,
    body: blob,
  });
  if (!putRes.ok) {
    const txt = await putRes.text().catch(() => "");
    throw new Error(`S3 PUT falló (${putRes.status}): ${txt.slice(0, 180)}`);
  }

  return { key: signed.key, url: signed.url };
}

/* ============================================================================
   PROVIDER/CLIENT: Servicios (S3 keys flow)
============================================================================ */

// Establecer portada por KEY
export const serviceSetCover = (serviceId, { key, thumbKey }) =>
  request(`/services/${serviceId}/cover`, {
    method: "PUT",
    body: { key, thumbKey },
    tag: "SVC_COVER",
  });

// Agregar imágenes adicionales por KEYs
export const serviceAddImages = (serviceId, items = []) =>
  request(`/services/${serviceId}/images`, {
    method: "POST",
    body: { items },
    tag: "SVC_IMAGES",
  });

/* ============================================================================
   PROVIDER: Dashboard / Métricas / Agenda con fallbacks de ruta
   (evita romper si el backend expone otras rutas)
============================================================================ */
export const providerGetMetrics = () =>
  tryPaths(
    [
      "/provider/metrics",
      "/provider/dashboard/metrics",
      "/providers/metrics",
      "/providers/dashboard/metrics",
      "/v1/provider/metrics",
      "/v1/providers/metrics",
    ],
    { tag: "PROVIDER_METRICS" }
  );

export const providerGetStats = () =>
  tryPaths(
    [
      "/provider/stats",
      "/provider/dashboard/stats",
      "/providers/stats",
      "/providers/dashboard/stats",
      "/v1/provider/stats",
      "/v1/providers/stats",
    ],
    { tag: "PROVIDER_STATS" }
  );

export const providerGetAgenda = (params = {}) =>
  tryPaths(
    [
      `/provider/agenda`,
      `/provider/dashboard/agenda`,
      `/providers/agenda`,
      `/providers/dashboard/agenda`,
      `/v1/provider/agenda`,
      `/v1/providers/agenda`,
    ],
    { tag: "PROVIDER_AGENDA", query: params }
  );

/* ============================================================================
   Back-compat
Back-compat y export default
============================================================================ */
api.login = login;
api.register = register;
api.me = me;

api.uploadsSign = uploadsSign;
api.uploadsSignGet = uploadsSignGet;
api.s3UploadAndGetKey = s3UploadAndGetKey;

api.meUpdateAvatar = meUpdateAvatar;
api.serviceSetCover = serviceSetCover;
api.serviceAddImages = serviceAddImages;

api.promotions = promotions;
api.adminCreatePromotion = adminCreatePromotion;
api.adminUpdatePromotion = adminUpdatePromotion;
api.adminDeletePromotion = adminDeletePromotion;

api.adminSetCategoryIcon = adminSetCategoryIcon;
api.adminSetCategoryCover = adminSetCategoryCover;
api.adminCreateCategoryMultipart = adminCreateCategoryMultipart;
api.adminUpdateCategoryMultipart = adminUpdateCategoryMultipart;

// Admin Users
api.adminListUsers = adminListUsers;
api.adminToggleBlockUser = adminToggleBlockUser;
api.adminSetUserRole = adminSetUserRole;

// Admin Reports
api.adminListReports = adminListReports;
api.adminResolveReport = adminResolveReport;
api.adminBlockEntity = adminBlockEntity;

// Admin Services
api.adminListServices = adminListServices;
api.adminDeleteService = adminDeleteService;

// Admin Metrics
api.adminGetMetrics = adminGetMetrics;
api.adminGetSystemStatus = adminGetSystemStatus;

// Provider
api.providerGetMetrics = providerGetMetrics;
api.providerGetStats = providerGetStats;
api.providerGetAgenda = providerGetAgenda;

// API Base
api.API_BASE = API_BASE;
api.API_URL = API_URL;

// Token utils
api.getAuthToken = getAuthToken;
api.setAuthToken = setAuthToken;
api.clearAuthToken = clearAuthToken;

// Categorías árboles
api.categoriesTree = categoriesTree;
api.categoriesRoots = categoriesRoots;
api.categoryChildren = categoryChildren;

// Service Types
api.adminCreateServiceType = adminCreateServiceType;
api.adminListServiceTypes = adminListServiceTypes;
api.adminUpdateServiceType = adminUpdateServiceType;
api.adminDeleteServiceType = adminDeleteServiceType;

// Public
api.categories = categories;
api.services = services;
api.featured = featured;

// Auth utils
api.forgotPassword = forgotPassword;
api.resetPassword = resetPassword;

// Mezclamos los métodos de `api` en el export por defecto
const defaultExport = {
  // ← esto expone get/post/put/patch/delete en el default
  ...api,

  // por compat también exponemos el objeto api completo
  api,

  // core
  request,

  // Auth
  login,
  register,
  me,
  forgotPassword,
  resetPassword,

  // S3
  uploadsSign,
  uploadsSignGet,
  s3UploadAndGetKey,

  // Perfil / Servicios
  meUpdateAvatar,
  serviceSetCover,
  serviceAddImages,

  // Promos
  promotions,
  adminCreatePromotion,
  adminUpdatePromotion,
  adminDeletePromotion,

  // Categorías (admin + árbol)
  adminSetCategoryIcon,
  adminSetCategoryCover,
  adminCreateCategoryMultipart,
  adminUpdateCategoryMultipart,
  categoriesTree,
  categoriesRoots,
  categoryChildren,
  adminCreateCategory,
  adminUpdateCategory,
  adminDeleteCategory,

  // Admin Users
  adminListUsers,
  adminToggleBlockUser,
  adminSetUserRole,

  // Admin Reports
  adminListReports,
  adminResolveReport,
  adminBlockEntity,

  // Admin Services/Dash
  adminListServices,
  adminDeleteService,
  adminGetMetrics,
  adminGetSystemStatus,

  // Provider (con fallbacks)
  providerGetMetrics,
  providerGetStats,
  providerGetAgenda,

  // Público
  categories,
  services,
  featured,

  // API Base
  API_BASE,
  API_URL,

  // Token
  getAuthToken,
  setAuthToken,
  clearAuthToken,
};

export default defaultExport;
