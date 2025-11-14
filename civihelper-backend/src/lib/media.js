// src/lib/media.js

/* =========================
   MIME <-> EXT y permitidos
   (mantén esta lista alineada con tu app y el cliente)
========================= */
export const MIME_TO_EXT = Object.freeze({
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
});

// Set de MIMEs permitidos (rápido para membership checks)
export const ALLOWED_MIME = new Set(Object.keys(MIME_TO_EXT));

/* =========================
   KINDS válidos (prefijos)
   => se usan en S3: uploads/<...>/
   Debe coincidir con rutas/controladores:
   - categories.js, services.js, admin.services.js, admin.serviceTypes.js, uploads.js
========================= */
export const KINDS = new Set([
  // Usuarios
  "avatar",                // uploads/avatars/<userId>/...

  // Categorías
  "category_icon",         // uploads/categories/<categoryId>/icon/...
  "category_cover",        // uploads/categories/<categoryId>/cover/...

  // Servicios
  "service_cover",         // uploads/services/<serviceId>/cover/...
  "service_photo",         // uploads/services/<serviceId>/photos/...

  // Tipos de servicio
  "service_type_image",    // uploads/service-types/<serviceTypeId>/...

  // Promociones (si las usas)
  "promotion",             // uploads/promotions/<promotionId>/...
]);

/* =========================
   Límites por kind (bytes)
   (coherente con src/lib/s3.js)
========================= */
export const MAX_BYTES_BY_KIND = Object.freeze({
  avatar: 2 * 1024 * 1024,             // 2 MB

  category_icon: 2 * 1024 * 1024,      // 2 MB
  category_cover: 8 * 1024 * 1024,     // 8 MB

  service_cover: 8 * 1024 * 1024,      // 8 MB
  service_photo: 8 * 1024 * 1024,      // 8 MB

  service_type_image: 4 * 1024 * 1024, // 4 MB

  promotion: 8 * 1024 * 1024,          // 8 MB
});

/* =========================
   Utilidades de validación
========================= */
export function assertKind(kind) {
  if (!KINDS.has(kind)) {
    const err = new Error(`[uploads] kind no permitido: ${kind}`);
    err.code = "INVALID_KIND";
    throw err;
  }
}

export function assertMime(mime) {
  if (!ALLOWED_MIME.has(mime)) {
    const err = new Error(`[uploads] MIME no permitido: ${mime}`);
    err.code = "INVALID_MIME";
    throw err;
  }
}

export function extFromMime(mime) {
  const ext = MIME_TO_EXT[mime];
  if (!ext) {
    const err = new Error(`[uploads] MIME no soportado: ${mime}`);
    err.code = "UNSUPPORTED_MIME";
    throw err;
  }
  return ext;
}

/* =========================
   Helpers opcionales (por si te sirven)
========================= */
/** Devuelve true si el MIME parece de imagen (sin garantizar que esté permitido). */
export function isImageMime(mime) {
  return typeof mime === "string" && mime.toLowerCase().startsWith("image/");
}

/**
 * Normaliza un input que puede venir como { mime } o { contentType } o string.
 * Valida contra ALLOWED_MIME y devuelve el MIME si es válido.
 */
export function normalizeMime(input) {
  const value = input?.mime || input?.contentType || input;
  const mime = typeof value === "string" ? value.trim() : "";
  assertMime(mime);
  return mime;
}
