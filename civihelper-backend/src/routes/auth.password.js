// src/routes/auth.password.js
import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "../lib/prisma.js";
import { forgotSchema, resetSchema } from "../validators/password.js";
import { sendPasswordResetEmail } from "../lib/mailer.js";

const router = Router();

/**
 * POST /api/auth/password/forgot
 */
router.post("/forgot", async (req, res) => {
  try {
    const { email } = forgotSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      const rawToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = await bcrypt.hash(rawToken, 10);
      const expiresAt = new Date(Date.now() + 1000 * 60 * 15); // 15 min

      await prisma.passwordReset.upsert({
        where: { userId: user.id },
        update: { tokenHash, expiresAt, usedAt: null },
        create: { userId: user.id, tokenHash, expiresAt },
      });

      const resetUrl = `${process.env.PUBLIC_APP_URL}/reset-password?token=${rawToken}&email=${encodeURIComponent(email)}`;
      await sendPasswordResetEmail({ to: email, resetUrl });

      if (process.env.DEV_RETURN_RESET_URL === "1") {
        return res.json({ ok: true, dev: { resetUrl, token: rawToken } });
      }
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error("[forgot]", err);
    return res.json({ ok: true });
  }
});

/**
 * POST /api/auth/password/reset
 */
router.post("/reset", async (req, res) => {
  try {
    const { email, token, newPassword } = resetSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(400).json({ message: "Token inválido o expirado" });

    const pr = await prisma.passwordReset.findFirst({
      where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });
    if (!pr) return res.status(400).json({ message: "Token inválido o expirado" });

    const match = await bcrypt.compare(token, pr.tokenHash);
    if (!match) return res.status(400).json({ message: "Token inválido o expirado" });

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { password: hashed } }),
      prisma.passwordReset.update({ where: { id: pr.id }, data: { usedAt: new Date() } }),
    ]);

    return res.json({ ok: true, message: "Contraseña actualizada correctamente." });
  } catch (e) {
    return res.status(400).json({ message: e?.message || "Bad Request" });
  }
});

export default router;
