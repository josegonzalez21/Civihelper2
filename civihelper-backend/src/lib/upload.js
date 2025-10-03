// src/lib/upload.js
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
export { signPutUrl, signGetUrl, keyFor, ALLOWED_MIME } from "./s3.js";
import { headObjectInfo } from "./s3.js";

/**
 * Config
 * - Solo usamos S3 para imágenes (según tu arquitectura actual).
 * - Si defines CDN_BASE_URL, las URLs públicas saldrán por ese dominio.
 */
const REGION   = process.env.AWS_REGION || "";
const BUCKET   = process.env.S3_BUCKET || "";
const CDN_BASE = (process.env.CDN_BASE_URL || "").replace(/\/+$/, "");
export const s3 = REGION ? new S3Client({ region: REGION }) : null;

/** Construye URL pública a partir de una key S3 ("uploads/..."). */
export function publicUrl(key) {
  if (!key) return null;
  const clean = String(key).replace(/^\/+/, "");

  // Prioriza CDN si está configurado
  if (CDN_BASE) return `${CDN_BASE}/${clean}`;

  // Fallback: S3 directo (útil en pruebas). En prod, mejor usar CloudFront/CDN.
  if (BUCKET && REGION) {
    return `https://${BUCKET}.s3.${REGION}.amazonaws.com/${clean}`;
  }

  // Si no hay bucket/config pública, no devolvemos nada (backend debería firmar GET).
  return null;
}

/**
 * Devuelve par de URLs públicas para una imagen y su miniatura.
 * Compatibilidad:
 * - Entrada acepta { key, thumbKey } o { path, thumbPath }.
 * - Salida expone tanto { path, thumbPath } como { url, thumbUrl }.
 */
export function publicPair({ key, thumbKey, path, thumbPath } = {}) {
  const main  = key ?? path ?? null;
  const thumb = thumbKey ?? thumbPath ?? null;

  const mainUrl  = publicUrl(main);
  const thumbUrl = publicUrl(thumb);

  // Devolvemos ambos nombres para no romper rutas existentes
  return {
    // nombres nuevos
    url: mainUrl,
    thumbUrl,
    // nombres legacy usados en varias rutas
    path: mainUrl,
    thumbPath: thumbUrl,
  };
}

/**
 * Elimina un objeto de S3 dado su key ("uploads/...").
 * Silencioso si no hay config de S3 o si el objeto no existe.
 */
export async function deleteFromUploads(key) {
  if (!key || !s3 || !BUCKET) return;
  const clean = String(key).replace(/^\/+/, "");
  try {
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: clean }));
  } catch (e) {
    // No interrumpir el flujo por un borrado; log suave en dev
    if (process.env.NODE_ENV !== "production") {
      console.warn("[deleteFromUploads] S3 delete warning:", e?.name || e?.message || e);
    }
  }
}

/**
 * Verifica en S3 que la key corresponda a una imagen y que no exceda maxBytes.
 * Lanza Error con .code = "INVALID_MIME" | "TOO_LARGE" en caso de fallo.
 */
export async function assertImageObject({ key, maxBytes = 8 * 1024 * 1024 }) {
  const clean = String(key || "").replace(/^\/+/, "");
  const h = await headObjectInfo(clean);

  const ct = String(h.contentType || "").toLowerCase();
  if (!ct.startsWith("image/")) {
    const err = new Error("El objeto en S3 no es una imagen");
    err.code = "INVALID_MIME";
    err.details = h;
    throw err;
  }
  if (Number(h.contentLength || 0) > maxBytes) {
    const err = new Error(`Imagen demasiado grande (${h.contentLength} B > ${maxBytes} B)`);
    err.code = "TOO_LARGE";
    err.details = h;
    throw err;
  }
  return h;
}

/* =========================
   Stubs legacy (compat)
   — Mantienen las importaciones antiguas sin romper el build.
   — En tu arquitectura actual, las subidas reales van por S3 presignado.
========================= */
function noopMiddleware() {
  return (_req, _res, next) => next();
}

export const upload = {
  single: () => noopMiddleware(),
  array: () => noopMiddleware(),
  fields: () => noopMiddleware(),
  none: () => noopMiddleware(),
};

// Si aún hay algún flujo que intente guardar buffers locales,
// puedes lanzar un error para detectarlo en desarrollo.
export async function saveBufferWithThumb() {
  return { key: null, thumbKey: null, url: null, thumbUrl: null, path: null, thumbPath: null };
}

export async function saveBufferToUploads() {
  return { key: null, url: null, path: null };
}
