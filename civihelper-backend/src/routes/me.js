// src/routes/me.js
import express from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { publicUrl } from "../lib/upload.js";

const router = express.Router();

function userIdFromReq(req) {
  return String(req.user?.id || req.user?.sub || "");
}

/**
 * GET /api/me
 * Devuelve el perfil del usuario autenticado (sin contraseña).
 * Nota: avatarUrl viene absolutizada si hay CDN/S3 configurado.
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
        avatarUrl: true, // KEY en DB
        createdAt: true,
        updatedAt: true,
        // nunca devolver password fields
      },
    });
    if (!user) return res.status(404).json({ message: "Usuario no encontrado" });

    return res.json({
      ...user,
      // convertir KEY → URL pública (si hay CDN/S3 config); si no, puede ser null
      avatarUrl: publicUrl(user.avatarUrl),
    });
  } catch (e) {
    next(e);
  }
});

/**
 * PUT /api/me/avatar
 * Guarda la KEY del avatar subido a S3.
 * Body: { key: "uploads/avatars/<userId>/<file>.jpg" }
 */
router.put("/avatar", requireAuth, async (req, res, next) => {
  try {
    const uid = userIdFromReq(req);
    if (!uid) return res.status(401).json({ message: "No autenticado" });

    const { key } = req.body || {};
    if (!key) return res.status(400).json({ message: "Falta 'key' de S3" });

    // Seguridad: la key debe pertenecer a ESTE usuario
    const ok = new RegExp(`^uploads\\/avatars\\/${uid}\\/`).test(String(key));
    if (!ok) return res.status(400).json({ message: "La key no corresponde a tu avatar" });

    // Persistir KEY (no URL presignada)
    const updated = await prisma.user.update({
      where: { id: uid },
      data: { avatarUrl: String(key) },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.json({
      ...updated,
      avatarUrl: publicUrl(updated.avatarUrl),
    });
  } catch (e) {
    if (e?.code === "P2025") return res.status(404).json({ message: "Usuario no encontrado" });
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
      // Ajusta nombres si tu esquema difiere (p.ej. passwordHash)
      select: { id: true, password: true, passwordHash: true, providers: true },
    });

    return res.json({
      lastLoginAt: req.user?.iat ? new Date(req.user.iat * 1000) : null,
      mfaEnabled: false, // implementar en el futuro
      activeSessions: 1, // placeholder
      hasPassword: Boolean(user?.password || user?.passwordHash),
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
    // Aquí podrías persistir la preferencia en DB en el futuro
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
  // persistir en DB si quieres
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
