// src/routes/uploads.js
import express from "express";
import {
  signPutUrl,
  signGetUrl,
  ALLOWED_MIME,
  KINDS,
  MAX_BYTES_BY_KIND,
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

/* ============================================================
   IDs requeridos por kind
============================================================ */
const REQUIRED_IDS = {
  avatar: ["userId"],
  category_icon: ["categoryId"],
  category_cover: ["categoryId"],
  service_cover: ["serviceId"],
  service_photo: ["serviceId"],
  promotion: ["promotionId"],
  service_type_image: ["serviceTypeId"], // NUEVO
};

/* ============================================================
   POST /api/uploads/sign  → firma PUT para subir a S3
   body: { kind, ids, mime?, contentType?, expiresIn? }
============================================================ */
router.post("/sign", requireAuth, async (req, res, next) => {
  try {
    const { kind, ids = {}, mime, contentType, expiresIn } = req.body || {};
    const finalMime = mime || contentType;

    // Validaciones básicas
    if (!kind || !finalMime) {
      return res
        .status(400)
        .json({ message: "kind y mime (o contentType) son obligatorios" });
    }
    if (!KINDS.has(kind)) {
      return res.status(400).json({ message: `kind desconocido: ${kind}` });
    }
    if (!ALLOWED_MIME.has(finalMime)) {
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
        return res
          .status(400)
          .json({ message: `ids.${k} es obligatorio para kind='${kind}'` });
      }
    }

    // Autorización por tipo
    if (kind === "promotion" || kind.startsWith("category_")) {
      // Solo ADMIN
      if (!hasRole(req, "ADMIN")) {
        return res.status(403).json({ message: "Solo ADMIN puede subir promos/categorías" });
      }
    } else if (kind.startsWith("service_")) {
      // PROVIDER o ADMIN
      if (!hasRole(req, ["PROVIDER", "ADMIN"])) {
        return res.status(403).json({ message: "Solo PROVIDER o ADMIN" });
      }
    } else if (kind === "avatar") {
      // Dueño del avatar o ADMIN
      const ownerOk = String(ids.userId) === meId(req);
      if (!ownerOk && !hasRole(req, "ADMIN")) {
        return res.status(403).json({ message: "No autorizado para este avatar" });
      }
    }

    // Expiración (segundos, 15–300; por defecto 60)
    const exp = clamp(expiresIn, 15, 300, 60);

    // Firma PUT
    const data = await signPutUrl({
      kind,
      ids,
      mime: finalMime, // preferido por lib/s3.js (también acepta contentType)
      expiresIn: exp,
    });

    // Adjunta info útil al cliente
    const maxBytes = MAX_BYTES_BY_KIND[kind] || null;

    return res.json({
      ...data,
      expiresIn: exp,
      allowedMime: [...ALLOWED_MIME],
      maxBytes,
    });
  } catch (e) {
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
    const { key, keys, expiresIn } = req.body || {};
    const list = Array.isArray(keys) ? keys : key ? [key] : [];
    if (!list.length) return res.status(400).json({ message: "key o keys requerido(s)" });

    // Expiración lectura (60s – 24h, default 1h)
    const exp = clamp(expiresIn, 60, 86400, 3600);

    const out = [];
    for (const k of list) {
      // Avatares: sólo dueño o ADMIN
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

      const signed = await signGetUrl({ key: String(k), expiresIn: exp });
      out.push({ key: k, url: signed.url, expiresIn: signed.expiresIn });
    }

    return res.json(Array.isArray(keys) ? out : out[0]);
  } catch (e) {
    return next(e);
  }
});

export default router;
