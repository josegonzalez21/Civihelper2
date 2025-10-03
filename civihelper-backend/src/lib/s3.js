// src/lib/s3.js
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";

// Unificamos MIME/ext desde media.js
import {
  ALLOWED_MIME,
  extFromMime,
} from "./media.js";

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

/* =========================
   KINDS soportados (tu esquema)
========================= */
const KINDS = new Set([
  "avatar",
  "category_icon",
  "category_cover",
  "service_cover",
  "service_photo",
  "promotion",
  "service_type_image",
]);

/* =========================
   Límites por kind (bytes)
   Ajusta si necesitas
========================= */
const MAX_BYTES_BY_KIND = {
  avatar: 2 * 1024 * 1024,          // 2 MB
  category_icon: 2 * 1024 * 1024,   // 2 MB
  category_cover: 2 * 1024 * 1024,  // 2 MB
  service_cover: 8 * 1024 * 1024,   // 8 MB
  service_photo: 8 * 1024 * 1024,   // 8 MB
  promotion: 4 * 1024 * 1024,       // 4 MB
  service_type_image: 4 * 1024 * 1024, // 4 MB
};

/* =========================
   URLs públicas
========================= */
export function publicUrl(key) {
  if (!key) return null;
  if (CDN_BASE) return `${CDN_BASE}/${key}`;
  return `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
}

export function publicPair({ key, thumbKey }) {
  return {
    url: key ? publicUrl(key) : null,
    thumbUrl: thumbKey ? publicUrl(thumbKey) : null,
  };
}

/* =========================
   Helpers
========================= */
function assertKind(kind) {
  if (!KINDS.has(kind)) throw new Error("kind inválido");
}

function normalizeMime(input) {
  // Permitimos contentType o mime para compatibilidad
  const mime = input?.mime || input?.contentType || input;
  if (!ALLOWED_MIME.has(mime)) throw new Error("Tipo no permitido");
  return mime;
}

/** Genera key en función del kind + ids (prefijos ordenados) */
export function keyFor({ kind, ids = {}, contentType, mime }) {
  assertKind(kind);
  const finalMime = normalizeMime({ contentType, mime });
  const ext = extFromMime(finalMime);
  const uid = crypto.randomUUID();

  switch (kind) {
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
  contentType, // compat
  mime,        // preferido
  expiresIn = 60,
  cacheControl = "public, max-age=31536000, immutable", // 1 año
}) {
  assertKind(kind);
  const finalMime = normalizeMime({ contentType, mime });

  const Key = keyFor({ kind, ids, contentType: finalMime });
  const cmd = new PutObjectCommand({
    Bucket: BUCKET,
    Key,
    ContentType: finalMime,
    CacheControl: cacheControl,
  });
  const url = await getSignedUrl(s3, cmd, { expiresIn });

  // El cliente DEBE enviar exactamente estos headers en el PUT
  const requiredHeaders = {
    "Content-Type": finalMime,
    "Cache-Control": cacheControl,
  };

  const maxBytes = MAX_BYTES_BY_KIND[kind] || null;

  return { key: Key, url, expiresIn, requiredHeaders, maxBytes };
}

/* =========================
   Firma GET (lectura temporal)
========================= */
export async function signGetUrl({ key, expiresIn = 3600 }) {
  const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  const url = await getSignedUrl(s3, cmd, { expiresIn });
  return { url, expiresIn };
}

/* =========================
   HEAD info
========================= */
export async function headObjectInfo(key) {
  const res = await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
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
  if (!key || typeof key !== "string") {
    throw new Error("[uploads] key inválida");
  }

  // Detectar kind a partir de la ruta (tu layout)
  // uploads/avatars/<userId>/...
  // uploads/categories/<categoryId>/(icon|cover)/...
  // uploads/services/<serviceId>/(cover|photos)/...
  // uploads/promotions/<promotionId>/...
  // uploads/service-types/<serviceTypeId>/...
  let inferredKind = null;
  if (/^uploads\/avatars\/[^/]+\//i.test(key)) {
    inferredKind = "avatar";
  } else if (/^uploads\/categories\/[^/]+\/icon\//i.test(key)) {
    inferredKind = "category_icon";
  } else if (/^uploads\/categories\/[^/]+\/cover\//i.test(key)) {
    inferredKind = "category_cover";
  } else if (/^uploads\/services\/[^/]+\/cover\//i.test(key)) {
    inferredKind = "service_cover";
  } else if (/^uploads\/services\/[^/]+\/photos\//i.test(key)) {
    inferredKind = "service_photo";
  } else if (/^uploads\/promotions\/[^/]+\//i.test(key)) {
    inferredKind = "promotion";
  } else if (/^uploads\/service-types\/[^/]+\//i.test(key)) {
    inferredKind = "service_type_image";
  }

  if (!inferredKind) {
    throw new Error("[uploads] key con formato inválido o kind desconocido");
  }

  if (expectedKind && expectedKind !== inferredKind) {
    throw new Error(
      `[uploads] kind inesperado: ${inferredKind} (se esperaba ${expectedKind})`
    );
  }

  // HEAD para validar existencia y Content-Type
  const head = await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
  const mime = head.ContentType || "";
  if (!ALLOWED_MIME.has(mime)) {
    throw new Error(`[uploads] MIME no permitido: ${mime}`);
  }

  const max = MAX_BYTES_BY_KIND[inferredKind];
  const size = Number(head.ContentLength || 0);
  if (max && size > max) {
    throw new Error(
      `[uploads] archivo supera el máximo de ${max} bytes para kind ${inferredKind}`
    );
  }

  return { kind: inferredKind, mime, size };
}

/* =========================
   Borrado
========================= */
export async function deleteFromUploads(key) {
  if (!key) return;
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

// Exportar algunas utilidades útiles si las necesitas en otros módulos
export { ALLOWED_MIME, KINDS, MAX_BYTES_BY_KIND };
