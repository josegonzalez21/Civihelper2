// civihelper-backend/src/lib/s3.js
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";
import { ALLOWED_MIME, extFromMime } from "./media.js";

// (Opcional) evitar middleware de checksums si te dio problemas en Windows
try {
  const { flexibleChecksumsMiddlewareOptions } = await import("@aws-sdk/middleware-flexible-checksums");
  // Creamos el cliente primero para poder tocar el stack
  // Nota: si import dinámico falla, seguimos normal
} catch { /* noop */ }

/* =========================
   ENV & CLIENTE
========================= */
const REGION = process.env.AWS_REGION;
const BUCKET = process.env.S3_BUCKET;
const CDN_BASE = (process.env.CDN_BASE_URL || "").replace(/\/+$/, "");

if (!REGION || !BUCKET) {
  throw new Error("[s3] Faltan AWS_REGION y/o S3_BUCKET");
}

export const s3 = new S3Client({ region: REGION });

// Intento de remover middleware de checksums si existe (no es obligatorio)
try {
  const { flexibleChecksumsMiddlewareOptions } = await import("@aws-sdk/middleware-flexible-checksums");
  s3.middlewareStack.remove(flexibleChecksumsMiddlewareOptions.name);
  s3.middlewareStack.remove("flexibleChecksumsMiddleware");
} catch { /* noop */ }

/* =========================
   KINDS soportados (tu esquema)
========================= */
export const KINDS = new Set([
  "avatar",
  "category_icon",
  "category_cover",
  "service_cover",
  "service_photo",
  "promotion",
  "service_type_image",
  "temp", // para borradores / subida previa a tener IDs
]);

/* =========================
   Límites por kind (bytes)
========================= */
export const MAX_BYTES_BY_KIND = {
  avatar: 2 * 1024 * 1024,            // 2 MB
  category_icon: 2 * 1024 * 1024,     // 2 MB
  category_cover: 8 * 1024 * 1024,    // 8 MB
  service_cover: 8 * 1024 * 1024,     // 8 MB
  service_photo: 8 * 1024 * 1024,     // 8 MB
  promotion: 4 * 1024 * 1024,         // 4 MB
  service_type_image: 4 * 1024 * 1024,// 4 MB
  temp: 8 * 1024 * 1024,              // 8 MB
};

/* =========================
   Helpers
========================= */
function cleanKey(key) {
  return String(key || "").replace(/^\/+/, "");
}

function assertKind(kind) {
  if (!KINDS.has(kind)) {
    const err = new Error(`kind inválido: ${kind}`);
    err.code = "INVALID_KIND";
    throw err;
  }
}

function normalizeMime(input) {
  const mime = input?.mime || input?.contentType || input;
  if (!ALLOWED_MIME.has(mime)) {
    const err = new Error(`Tipo no permitido: ${mime}`);
    err.code = "INVALID_MIME";
    throw err;
  }
  return mime;
}

function clamp(n, min, max, fallback) {
  const x = Number(n);
  if (!Number.isFinite(x)) return fallback;
  return Math.max(min, Math.min(max, x));
}

/* =========================
   URLs públicas
========================= */
export function publicUrl(key) {
  const k = cleanKey(key);
  if (!k) return null;
  if (CDN_BASE) return `${CDN_BASE}/${k}`;
  return `https://${BUCKET}.s3.${REGION}.amazonaws.com/${k}`;
}

export function publicPair({ key, thumbKey }) {
  return {
    url: key ? publicUrl(key) : null,
    thumbUrl: thumbKey ? publicUrl(thumbKey) : null,
  };
}

/* =========================
   Key generator
========================= */
export function keyFor({ kind, ids = {}, contentType, mime }) {
  assertKind(kind);
  const finalMime = normalizeMime({ contentType, mime });
  const ext = extFromMime(finalMime);
  const uid = crypto.randomUUID();

  switch (kind) {
    case "temp":
      return `uploads/temp/${uid}.${ext}`;

    case "avatar": {
      const userId = String(ids.userId || "");
      if (!userId) throw new Error("ids.userId obligatorio para avatar");
      return `uploads/avatars/${userId}/${uid}.${ext}`;
    }
    case "category_icon": {
      const categoryId = String(ids.categoryId || "");
      if (!categoryId) throw new Error("ids.categoryId obligatorio");
      return `uploads/categories/${categoryId}/icon/${uid}.${ext}`;
    }
    case "category_cover": {
      const categoryId = String(ids.categoryId || "");
      if (!categoryId) throw new Error("ids.categoryId obligatorio");
      return `uploads/categories/${categoryId}/cover/${uid}.${ext}`;
    }
    case "service_cover": {
      const serviceId = String(ids.serviceId || "");
      if (!serviceId) throw new Error("ids.serviceId obligatorio");
      return `uploads/services/${serviceId}/cover/${uid}.${ext}`;
    }
    case "service_photo": {
      const serviceId = String(ids.serviceId || "");
      if (!serviceId) throw new Error("ids.serviceId obligatorio");
      return `uploads/services/${serviceId}/photos/${uid}.${ext}`;
    }
    case "promotion": {
      const promotionId = String(ids.promotionId || "");
      if (!promotionId) throw new Error("ids.promotionId obligatorio");
      return `uploads/promotions/${promotionId}/${uid}.${ext}`;
    }
    case "service_type_image": {
      const serviceTypeId = String(ids.serviceTypeId || "");
      if (!serviceTypeId) throw new Error("ids.serviceTypeId obligatorio");
      return `uploads/service-types/${serviceTypeId}/${uid}.${ext}`;
    }
    default:
      throw new Error("kind desconocido");
  }
}

/* =========================
   Firma PUT (subida directa)
========================= */
export async function signPutUrl({
  kind,
  ids = {},
  contentType,
  mime,
  expiresIn = 60,
  cacheControl = "public, max-age=31536000, immutable",
}) {
  assertKind(kind);
  if (ids == null || typeof ids !== "object") {
    const err = new Error("ids debe ser un objeto");
    err.code = "INVALID_IDS";
    throw err;
  }
  const finalMime = normalizeMime({ contentType, mime });

  const exp = clamp(expiresIn, 15, 300, 60);

  const Key = keyFor({ kind, ids, contentType: finalMime });
  const cmd = new PutObjectCommand({
    Bucket: BUCKET,
    Key,
    ContentType: finalMime,
    CacheControl: cacheControl,
  });

  const url = await getSignedUrl(s3, cmd, { expiresIn: exp });

  const requiredHeaders = {
    "Content-Type": finalMime,
    "Cache-Control": cacheControl,
  };

  const maxBytes = MAX_BYTES_BY_KIND[kind] || null;

  return { key: Key, url, expiresIn: exp, requiredHeaders, maxBytes };
}

/* =========================
   Firma GET (lectura temporal)
========================= */
export async function signGetUrl({ key, expiresIn = 3600 }) {
  const Key = cleanKey(key);
  if (!Key) {
    const err = new Error("key requerido para signGetUrl");
    err.code = "INVALID_KEY";
    throw err;
  }
  const exp = clamp(expiresIn, 60, 86400, 3600);

  const cmd = new GetObjectCommand({ Bucket: BUCKET, Key });
  const url = await getSignedUrl(s3, cmd, { expiresIn: exp });
  return { url, expiresIn: exp };
}

/* =========================
   HEAD info
========================= */
export async function headObjectInfo(key) {
  const Key = cleanKey(key);
  const res = await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key }));
  return {
    contentType: res.ContentType || "",
    contentLength: Number(res.ContentLength || 0),
    cacheControl: res.CacheControl || "",
    etag: res.ETag,
    lastModified: res.LastModified,
  };
}

/* =========================
   Validación post-upload
========================= */
export async function assertImageObject(key, { expectedKind } = {}) {
  const Key = cleanKey(key);
  if (!Key) {
    const err = new Error("[uploads] key inválida");
    err.code = "INVALID_KEY";
    throw err;
  }

  let inferredKind = null;
  if (/^uploads\/avatars\/[^/]+\//i.test(Key)) inferredKind = "avatar";
  else if (/^uploads\/categories\/[^/]+\/icon\//i.test(Key)) inferredKind = "category_icon";
  else if (/^uploads\/categories\/[^/]+\/cover\//i.test(Key)) inferredKind = "category_cover";
  else if (/^uploads\/services\/[^/]+\/cover\//i.test(Key)) inferredKind = "service_cover";
  else if (/^uploads\/services\/[^/]+\/photos\//i.test(Key)) inferredKind = "service_photo";
  else if (/^uploads\/promotions\/[^/]+\//i.test(Key)) inferredKind = "promotion";
  else if (/^uploads\/service-types\/[^/]+\//i.test(Key)) inferredKind = "service_type_image";

  if (!inferredKind) {
    const err = new Error("[uploads] key con formato inválido o kind desconocido");
    err.code = "UNKNOWN_KIND";
    throw err;
  }

  if (expectedKind && expectedKind !== inferredKind) {
    const err = new Error(`[uploads] kind inesperado: ${inferredKind} (se esperaba ${expectedKind})`);
    err.code = "UNEXPECTED_KIND";
    throw err;
  }

  const head = await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key }));
  const mime = head.ContentType || "";
  if (!ALLOWED_MIME.has(mime)) {
    const err = new Error(`[uploads] MIME no permitido: ${mime}`);
    err.code = "INVALID_MIME";
    throw err;
  }

  const max = MAX_BYTES_BY_KIND[inferredKind];
  const size = Number(head.ContentLength || 0);
  if (max && size > max) {
    const err = new Error(`[uploads] archivo supera el máximo de ${max} bytes para kind ${inferredKind}`);
    err.code = "TOO_LARGE";
    err.details = { size, max };
    throw err;
  }

  return { kind: inferredKind, mime, size };
}

/* =========================
   Borrado
========================= */
export async function deleteFromUploads(key) {
  const Key = cleanKey(key);
  if (!Key) return;
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key }));
}

// Export útiles
export { ALLOWED_MIME };
