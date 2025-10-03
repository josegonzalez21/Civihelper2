// src/routes/user.avatar.js
import express from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";
import { assertImageObject, deleteFromUploads, publicUrl } from "../lib/s3.js";

const router = express.Router();
const ensureAdmin = requireRole("ADMIN");

function meId(req) {
  return String(req.user?.id ?? req.user?.sub ?? "");
}

router.put("/me/avatar", requireAuth, async (req, res, next) => {
  try {
    const { key } = req.body || {};
    if (!key) return res.status(400).json({ message: "Falta 'key' de S3 para el avatar" });

    // Valida objeto y que pertenezca al usuario
    await assertImageObject(String(key), { expectedKind: "avatar" });

    const uid = meId(req);
    const prev = await prisma.user.findUnique({ where: { id: uid }, select: { avatarKey: true } });
    if (!prev) return res.status(404).json({ message: "Usuario no encontrado" });

    if (prev.avatarKey && prev.avatarKey !== key) {
      await deleteFromUploads(prev.avatarKey);
    }

    const upd = await prisma.user.update({
      where: { id: uid },
      data: { avatarKey: String(key) },
      select: { id: true, name: true, avatarKey: true },
    });

    res.json({ ...upd, avatarUrl: upd.avatarKey ? publicUrl(upd.avatarKey) : null });
  } catch (e) {
    next(e);
  }
});

// (ADMIN) set avatar de otro usuario
router.put("/:userId/avatar", requireAuth, ensureAdmin, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { key } = req.body || {};
    if (!key) return res.status(400).json({ message: "Falta 'key' de S3 para el avatar" });

    await assertImageObject(String(key), { expectedKind: "avatar" });

    const prev = await prisma.user.findUnique({ where: { id: String(userId) }, select: { avatarKey: true } });
    if (!prev) return res.status(404).json({ message: "Usuario no encontrado" });

    if (prev.avatarKey && prev.avatarKey !== key) {
      await deleteFromUploads(prev.avatarKey);
    }

    const upd = await prisma.user.update({
      where: { id: String(userId) },
      data: { avatarKey: String(key) },
      select: { id: true, name: true, avatarKey: true },
    });

    res.json({ ...upd, avatarUrl: upd.avatarKey ? publicUrl(upd.avatarKey) : null });
  } catch (e) {
    next(e);
  }
});

export default router;
