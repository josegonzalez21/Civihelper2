// src/lib/media.js

/* =========================
   MIME <-> EXT y permitidos
========================= */
export const MIME_TO_EXT = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",

  // Habilítalos si tu pipeline/cliente los maneja correctamente:
  "image/avif": "avif",
  "image/heic": "heic",
};

export const ALLOWED_MIME = new Set(Object.keys(MIME_TO_EXT));

/* =========================
   KINDS válidos (prefijos)
   => se usan en S3: uploads/<...>/
   ¡OJO! Estos deben coincidir con las rutas:
   - categories.js, services.js, admin.services.js, admin.serviceTypes.js
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
   Ajusta según tus necesidades reales.
========================= */
export const MAX_BYTES_BY_KIND = {
  avatar: 2 * 1024 * 1024,             // 2 MB

  category_icon: 2 * 1024 * 1024,      // 2 MB
  category_cover: 8 * 1024 * 1024,     // 8 MB

  service_cover: 8 * 1024 * 1024,      // 8 MB
  service_photo: 8 * 1024 * 1024,      // 8 MB

  service_type_image: 4 * 1024 * 1024, // 4 MB

  promotion: 8 * 1024 * 1024,          // 8 MB
};

/* =========================
   Utilidades
========================= */
export function assertKind(kind) {
  if (!KINDS.has(kind)) {
    throw new Error(`[uploads] kind no permitido: ${kind}`);
  }
}

export function assertMime(mime) {
  if (!ALLOWED_MIME.has(mime)) {
    throw new Error(`[uploads] MIME no permitido: ${mime}`);
  }
}

export function extFromMime(mime) {
  const ext = MIME_TO_EXT[mime];
  if (!ext) throw new Error(`[uploads] MIME no soportado: ${mime}`);
  return ext;
}
