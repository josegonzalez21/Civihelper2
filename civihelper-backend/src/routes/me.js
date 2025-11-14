// src/routes/me.js
import express from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { publicUrl, assertImageObject, deleteFromUploads } from "../lib/s3.js";

const router = express.Router();

function userIdFromReq(req) {
  return String(req.user?.id || req.user?.sub || "");
}

const avatarBodySchema = z.object({
  key: z.string().trim().min(3, { message: "Falta 'key' de S3" }),
  thumbKey: z.string().trim().min(3).optional(),
  deletePrevious: z
    .preprocess((v) => {
      if (typeof v === "boolean") return v;
      if (typeof v === "number") return v !== 0;
      if (typeof v === "string")
        return ["1", "true", "yes", "on"].includes(v.toLowerCase());
      return undefined;
    }, z.boolean().optional())
    .default(true),
});

/**
 * GET /api/me
 * Devuelve el perfil del usuario autenticado (sin contraseña).
 * Nota: avatarUrl y avatarThumbUrl se absolutizan si hay CDN/S3 configurado.
 */
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const uid = userIdFromReq(req);
    if (!uid) return res.status(401).json({ message: "No autenticado" });

    const user = await prisma.user.findUnique({
      where: { id: uid },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarUrl: true,       // Keys en BD
        avatarThumbUrl: true,  // Key en BD (opcional)
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) return res.status(404).json({ message: "Usuario no encontrado" });

    return res.json({
      ...user,
      avatarUrl: publicUrl(user.avatarUrl),
      avatarThumbUrl: publicUrl(user.avatarThumbUrl),
    });
  } catch (e) {
    next(e);
  }
});

/**
 * PUT /api/me/avatar
 * Guarda la KEY del avatar subido a S3 (con validaciones).
 * Body: { key: "uploads/avatars/<userId>/<file>.jpg", thumbKey?: string, deletePrevious?: boolean }
 */
router.put("/avatar", requireAuth, async (req, res, next) => {
  try {
    const uid = userIdFromReq(req);
    if (!uid) return res.status(401).json({ message: "No autenticado" });

    const { key, thumbKey, deletePrevious } = avatarBodySchema.parse(req.body || {});

    // Seguridad: la key (y la miniatura, si viene) deben pertenecer a ESTE usuario por prefijo
    const belongsMain = new RegExp(`^uploads\\/avatars\\/${uid}\\/`).test(String(key));
    const belongsThumb = !thumbKey || new RegExp(`^uploads\\/avatars\\/${uid}\\/`).test(String(thumbKey));
    if (!belongsMain || !belongsThumb) {
      return res.status(400).json({ message: "La key/miniatura no corresponde a tu avatar" });
    }

    // Verifica en S3 que los objetos existen, son imágenes y matchean el kind "avatar"
    await assertImageObject(String(key), { expectedKind: "avatar" });
    if (thumbKey) {
      await assertImageObject(String(thumbKey), { expectedKind: "avatar" });
    }

    // Obtiene el avatar anterior
    const prev = await prisma.user.findUnique({
      where: { id: uid },
      select: { id: true, name: true, avatarUrl: true, avatarThumbUrl: true },
    });
    if (!prev) return res.status(404).json({ message: "Usuario no encontrado" });

    // Idempotente: si es el mismo par de keys, responde sin actualizar
    if (prev.avatarUrl === key && (thumbKey ? prev.avatarThumbUrl === thumbKey : true)) {
      return res.json({
        id: prev.id,
        name: prev.name,
        avatarUrl: publicUrl(prev.avatarUrl),
        avatarThumbUrl: publicUrl(prev.avatarThumbUrl),
        changed: false,
      });
    }

    // Actualiza primero en DB
    const updated = await prisma.user.update({
      where: { id: uid },
      data: {
        avatarUrl: String(key),
        avatarThumbUrl: thumbKey ? String(thumbKey) : null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarUrl: true,
        avatarThumbUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Luego intenta borrar los anteriores (best-effort)
    if (deletePrevious) {
      const tasks = [];
      if (prev.avatarUrl && prev.avatarUrl !== key) tasks.push(deleteFromUploads(prev.avatarUrl));
      if (prev.avatarThumbUrl && prev.avatarThumbUrl !== thumbKey) tasks.push(deleteFromUploads(prev.avatarThumbUrl));
      if (tasks.length) {
        Promise.allSettled(tasks).catch((err) =>
          console.warn("[me/avatar] No se pudo borrar avatar anterior:", err?.message || err)
        );
      }
    }

    return res.json({
      ...updated,
      avatarUrl: publicUrl(updated.avatarUrl),
      avatarThumbUrl: publicUrl(updated.avatarThumbUrl),
      changed: true,
    });
  } catch (e) {
    if (e?.name === "ZodError") {
      return res.status(400).json({ message: "Datos inválidos", details: e.flatten() });
    }
    next(e);
  }
});

/**
 * GET /api/me/security
 * Información básica de seguridad de la cuenta.
 */
router.get("/security", requireAuth, async (req, res, next) => {
  try {
    const uid = userIdFromReq(req);
    if (!uid) return res.status(401).json({ message: "No autenticado" });

    const user = await prisma.user.findUnique({
      where: { id: uid },
      select: { id: true, password: true, providers: true }, // evita campos inexistentes
    });

    return res.json({
      lastLoginAt: req.user?.iat ? new Date(req.user.iat * 1000) : null,
      mfaEnabled: false, // implementar en el futuro
      activeSessions: 1, // placeholder
      hasPassword: Boolean(user?.password),
      oauthProviders: Array.isArray(user?.providers) ? user.providers.map((p) => p.type) : [],
    });
  } catch (e) {
    next(e);
  }
});

/**
 * PATCH /api/me/security
 * Stub para activar/desactivar MFA (placeholder).
 */
router.patch("/security", requireAuth, async (req, res, next) => {
  try {
    const { mfaEnabled } = req.body || {};
    return res.json({ mfaEnabled: !!mfaEnabled });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /api/me/privacy
 * Devuelve consentimientos actuales (stub).
 */
router.get("/privacy", requireAuth, async (_req, res) => {
  res.json({ consents: { marketing: false } });
});

/**
 * PATCH /api/me/consents
 * Actualiza consentimientos (stub).
 */
router.patch("/consents", requireAuth, async (req, res) => {
  const { marketing } = req.body || {};
  res.json({ consents: { marketing: !!marketing } });
});

/**
 * POST /api/me/export
 * Exportación de datos del usuario (stub).
 */
router.post("/export", requireAuth, async (_req, res) => {
  res.json({ ok: true, message: "Export en preparación" });
});

/**
 * DELETE /api/me
 * Elimina la cuenta del usuario (y tokens de reset asociados).
 */
router.delete("/", requireAuth, async (req, res, next) => {
  try {
    const uid = userIdFromReq(req);
    if (!uid) return res.status(401).json({ message: "No autenticado" });

    await prisma.$transaction([
      prisma.passwordReset?.deleteMany
        ? prisma.passwordReset.deleteMany({ where: { userId: uid } })
        : prisma.$executeRaw`SELECT 1`,
      prisma.user.delete({ where: { id: uid } }),
    ]);

    res.json({ ok: true });
  } catch (e) {
    if (e?.code === "P2025") return res.status(404).json({ message: "Usuario no encontrado" });
    next(e);
  }
});

export default router;
