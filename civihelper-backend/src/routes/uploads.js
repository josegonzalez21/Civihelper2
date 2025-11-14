// src/routes/uploads.js
import express from "express";
import { z } from "zod";
import {
  signPutUrl,
  signGetUrl,
  ALLOWED_MIME,
  KINDS,
  MAX_BYTES_BY_KIND,
  assertImageObject,
} from "../lib/s3.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

/* ============================================================
   Helpers
============================================================ */
function clamp(n, min, max, fallback) {
  const x = Number(n);
  if (!Number.isFinite(x)) return fallback;
  return Math.max(min, Math.min(max, x));
}

function meId(req) {
  return String(req.user?.id ?? req.user?.sub ?? "");
}

function hasRole(req, roles) {
  const r = String(req.user?.role || "");
  return Array.isArray(roles) ? roles.includes(r) : r === roles;
}

const REQUIRED_IDS = {
  avatar: ["userId"],
  category_icon: ["categoryId"],
  category_cover: ["categoryId"],
  service_cover: ["serviceId"],
  service_photo: ["serviceId"],
  promotion: ["promotionId"],
  service_type_image: ["serviceTypeId"],
  temp: [],
};

/* ============================================================
   Schemas
============================================================ */
const idsSchema = z.record(z.string(), z.union([z.string(), z.number()])).default({});

const signPutSchema = z.object({
  kind: z.string().trim().toLowerCase(),
  ids: idsSchema,
  mime: z.string().trim().optional(),
  contentType: z.string().trim().optional(), // alias de mime
  // Tamaño opcional (en bytes) que el cliente planea subir (para validación adicional)
  size: z
    .preprocess((v) => (v === "" || v == null ? undefined : Number(v)), z.number().int().positive().optional()),
  // Nombre de archivo opcional (para Content-Disposition en el cliente, si deseas)
  filename: z.string().trim().max(200).optional(),
  // Expiración de la firma PUT: 15–300 seg (default 60)
  expiresIn: z
    .preprocess((v) => (v === "" || v == null ? undefined : Number(v)), z.number().int().optional())
    .transform((v) => clamp(v, 15, 300, 60)),
});

const signGetSchema = z.object({
  key: z.string().trim().optional(),
  keys: z.array(z.string().trim()).optional(),
  // Expiración de lectura: 60s – 24h (default 1h)
  expiresIn: z
    .preprocess((v) => (v === "" || v == null ? undefined : Number(v)), z.number().int().optional())
    .transform((v) => clamp(v, 60, 86400, 3600)),
});

const confirmSchema = z.object({
  key: z.string().trim().min(3, "key inválido"),
  kind: z.string().trim().toLowerCase().optional(), // si se envía, se valida contra expectedKind
});

/* ============================================================
   POST /api/uploads/sign  → firma PUT para subir a S3
   body: { kind, ids, mime?, contentType?, size?, filename?, expiresIn? }
============================================================ */
router.post("/sign", requireAuth, async (req, res, next) => {
  try {
    const body = signPutSchema.parse(req.body || {});
    const { kind, ids, size, filename } = body;
    const finalMime = body.mime || body.contentType;
    const expiresIn = body.expiresIn;

    // Validaciones de dominio
    if (!KINDS.has(kind)) {
      return res.status(400).json({ message: `kind desconocido: ${kind}` });
    }
    if (!finalMime || !ALLOWED_MIME.has(finalMime)) {
      return res.status(400).json({
        message: `Tipo no permitido. Usa uno de: ${[...ALLOWED_MIME].join(", ")}`,
      });
    }
    if (ids == null || typeof ids !== "object") {
      return res.status(400).json({ message: "ids debe ser un objeto" });
    }
    const reqIds = REQUIRED_IDS[kind] || [];
    for (const k of reqIds) {
      if (ids[k] == null || ids[k] === "") {
        return res.status(400).json({ message: `ids.${k} es obligatorio para kind='${kind}'` });
      }
    }

    // Autorización por tipo
    if (kind === "promotion" || kind.startsWith("category_")) {
      if (!hasRole(req, "ADMIN")) {
        return res.status(403).json({ message: "Solo ADMIN puede subir promos/categorías" });
      }
    } else if (kind.startsWith("service_")) {
      if (!hasRole(req, ["PROVIDER", "ADMIN"])) {
        return res.status(403).json({ message: "Solo PROVIDER o ADMIN" });
      }
    } else if (kind === "avatar") {
      const ownerOk = String(ids.userId) === meId(req);
      if (!ownerOk && !hasRole(req, "ADMIN")) {
        return res.status(403).json({ message: "No autorizado para este avatar" });
      }
    }

    // Límite por tipo (si el cliente envía size, lo validamos antes)
    const maxBytes = MAX_BYTES_BY_KIND[kind] || null;
    if (maxBytes && size && size > maxBytes) {
      return res.status(400).json({ message: `El archivo excede el máximo permitido (${maxBytes} bytes)` });
    }

    // Firma PUT ─ la lib puede usar mime/size/filename para setear ContentType/ContentDisposition/metadatos
    const data = await signPutUrl({
      kind,
      ids,
      mime: finalMime,
      expiresIn,
      // parámetros opcionales, según tu implementación de lib/s3.js
      size,
      filename,
    });

    return res.json({
      ...data,
      expiresIn,
      allowedMime: [...ALLOWED_MIME],
      maxBytes,
    });
  } catch (e) {
    // Errores de validación (Zod)
    if (e?.name === "ZodError") {
      return res.status(400).json({ message: "Datos inválidos", details: e.flatten() });
    }
    const msg = String(e?.message || "");
    if (/Tipo no permitido|kind inválido|kind desconocido|obligatorio/i.test(msg)) {
      return res.status(400).json({ message: msg });
    }
    return next(e);
  }
});

/* ============================================================
   POST /api/uploads/sign-get  → firma GET (lectura) S3
   body: { key?: string, keys?: string[], expiresIn?: number }
   - Devuelve 1 o N URLs presignadas para lectura.
   - Regla: avatares → sólo dueño o ADMIN.
============================================================ */
router.post("/sign-get", requireAuth, async (req, res, next) => {
  try {
    const { key, keys, expiresIn } = signGetSchema.parse(req.body || {});
    const list = Array.isArray(keys) ? keys : key ? [key] : [];
    if (!list.length) return res.status(400).json({ message: "key o keys requerido(s)" });

    const out = [];
    for (const k of list) {
      // Avatares: sólo dueño o ADMIN (asumiendo prefijo uploads/avatars/{userId}/...)
      const m = /^uploads\/avatars\/([^/]+)\//.exec(String(k));
      if (m) {
        const userIdInKey = m[1];
        const isOwner = meId(req) === String(userIdInKey);
        const isAdmin = hasRole(req, "ADMIN");
        if (!isOwner && !isAdmin) {
          out.push({ key: k, error: "forbidden" });
          continue;
        }
      }
      const signed = await signGetUrl({ key: String(k), expiresIn });
      out.push({ key: k, url: signed.url, expiresIn: signed.expiresIn });
    }

    return res.json(Array.isArray(keys) ? out : out[0]);
  } catch (e) {
    if (e?.name === "ZodError") {
      return res.status(400).json({ message: "Datos inválidos", details: e.flatten() });
    }
    return next(e);
  }
});

/* ============================================================
   POST /api/uploads/confirm  → valida objeto ya subido
   body: { key, kind? }
   - Realiza HeadObject y valida límites/MIME dentro de assertImageObject.
   - No persiste: cada módulo (avatar, services, categorías) hace su propio update.
============================================================ */
router.post("/confirm", requireAuth, async (req, res, next) => {
  try {
    const { key, kind } = confirmSchema.parse(req.body || {});
    const meta = await assertImageObject(String(key), {
      expectedKind: kind, // si viene, validará prefijo/ubicación por tipo
    });
    // meta puede incluir ContentLength, ContentType, ETag, LastModified, etc.
    return res.json({ ok: true, key, meta });
  } catch (e) {
    if (e?.name === "ZodError") {
      return res.status(400).json({ message: "Datos inválidos", details: e.flatten() });
    }
    // Si assertImageObject lanza por tamaño/MIME/prefijo, devolvemos 400
    if (e?.status === 400) {
      return res.status(400).json({ message: e.message });
    }
    return next(e);
  }
});

export default router;
