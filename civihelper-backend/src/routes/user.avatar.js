// src/routes/user.avatar.js
import express from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";
import { assertImageObject, deleteFromUploads, publicUrl } from "../lib/s3.js";

const router = express.Router();
const ensureAdmin = requireRole("ADMIN");

function meId(req) {
  return String(req.user?.id ?? req.user?.sub ?? "");
}

const bodySchema = z.object({
  key: z.string().trim().min(3, { message: "Falta 'key' de S3 para el avatar" }),
  thumbKey: z.string().trim().min(3).optional(),
  // Permite controlar si se borra el avatar anterior (por defecto sí)
  deletePrevious: z
    .preprocess((v) => {
      if (typeof v === "boolean") return v;
      if (typeof v === "number") return v !== 0;
      if (typeof v === "string") return ["1", "true", "yes", "on"].includes(v.toLowerCase());
      return undefined;
    }, z.boolean().optional())
    .default(true),
});

/* ============================================================================
   Helper para setear avatar (reutilizable en /me y /:userId)
   - Valida prefijo: uploads/avatars/<userId>/...
   - Valida en S3: existencia + MIME + tamaño (kind "avatar")
   - Actualiza avatarUrl y avatarThumbUrl (keys) en DB
   - Borra anteriores (best-effort)
============================================================================ */
async function setAvatarForUser(userId, key, thumbKey, deletePrevious = true) {
  const uid = String(userId);
  const belongsMain = new RegExp(`^uploads\\/avatars\\/${uid}\\/`).test(String(key));
  const belongsThumb = !thumbKey || new RegExp(`^uploads\\/avatars\\/${uid}\\/`).test(String(thumbKey));
  if (!belongsMain || !belongsThumb) {
    const err = new Error("La key/miniatura no corresponde a este usuario");
    err.status = 400;
    throw err;
  }

  // Verifica que sean imágenes permitidas (kind avatar)
  const metaMain = await assertImageObject(String(key), { expectedKind: "avatar" });
  let metaThumb = null;
  if (thumbKey) metaThumb = await assertImageObject(String(thumbKey), { expectedKind: "avatar" });

  // Busca al usuario y su avatar actual
  const prev = await prisma.user.findUnique({
    where: { id: uid },
    select: { id: true, name: true, avatarUrl: true, avatarThumbUrl: true },
  });
  if (!prev) {
    const err = new Error("Usuario no encontrado");
    err.status = 404;
    throw err;
  }

  // Idempotencia
  if (prev.avatarUrl === key && (thumbKey ? prev.avatarThumbUrl === thumbKey : !prev.avatarThumbUrl)) {
    return {
      id: prev.id,
      name: prev.name,
      avatarUrl: publicUrl(prev.avatarUrl),
      avatarThumbUrl: publicUrl(prev.avatarThumbUrl),
      changed: false,
      meta: { main: metaMain, thumb: metaThumb },
    };
  }

  // Actualiza en DB
  const updated = await prisma.user.update({
    where: { id: uid },
    data: {
      avatarUrl: String(key),
      avatarThumbUrl: thumbKey ? String(thumbKey) : null,
    },
    select: { id: true, name: true, avatarUrl: true, avatarThumbUrl: true },
  });

  // Borra anteriores (best-effort)
  if (deletePrevious) {
    const tasks = [];
    if (prev.avatarUrl && prev.avatarUrl !== key) tasks.push(deleteFromUploads(prev.avatarUrl));
    if (prev.avatarThumbUrl && prev.avatarThumbUrl !== thumbKey) tasks.push(deleteFromUploads(prev.avatarThumbUrl));
    if (tasks.length) {
      Promise.allSettled(tasks).catch((e) =>
        console.warn("[avatar] No se pudo borrar avatar anterior:", e?.message || e)
      );
    }
  }

  return {
    ...updated,
    avatarUrl: publicUrl(updated.avatarUrl),
    avatarThumbUrl: publicUrl(updated.avatarThumbUrl),
    changed: true,
    meta: { main: metaMain, thumb: metaThumb },
  };
}

/* ============================================================================
   PUT /me/avatar  (usuario actual)
============================================================================ */
router.put("/me/avatar", requireAuth, async (req, res, next) => {
  try {
    const { key, thumbKey, deletePrevious } = bodySchema.parse(req.body ?? {});
    const uid = meId(req);
    const result = await setAvatarForUser(uid, key, thumbKey, deletePrevious);
    res.json(result);
  } catch (e) {
    if (e?.name === "ZodError") {
      return res.status(400).json({ message: "Datos inválidos", details: e.flatten() });
    }
    next(e);
  }
});

/* ============================================================================
   PUT /:userId/avatar  (ADMIN: set avatar de otro usuario)
============================================================================ */
router.put("/:userId/avatar", requireAuth, ensureAdmin, async (req, res, next) => {
  try {
    const { key, thumbKey, deletePrevious } = bodySchema.parse(req.body ?? {});
    const { userId } = req.params;
    const result = await setAvatarForUser(String(userId), key, thumbKey, deletePrevious);
    res.json(result);
  } catch (e) {
    if (e?.name === "ZodError") {
      return res.status(400).json({ message: "Datos inválidos", details: e.flatten() });
    }
    next(e);
  }
});

export default router;
