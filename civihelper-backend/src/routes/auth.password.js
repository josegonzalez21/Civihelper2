// src/routes/auth.password.js
import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "../lib/prisma.js";
import { forgotSchema, resetSchema } from "../validators/password.js";
import { sendPasswordResetEmail } from "../lib/mailer.js";

const router = Router();

const BCRYPT_ROUNDS_PASSWORD = Number(process.env.BCRYPT_ROUNDS || 12);
const BCRYPT_ROUNDS_TOKEN = 10;

function appBaseUrl() {
  const base =
    process.env.PUBLIC_APP_URL ||
    process.env.BACKEND_URL || // fallback razonable
    "";
  return String(base).replace(/\/+$/, "");
}

/**
 * POST /api/auth/password/forgot
 * Crea/actualiza un token de reset y envía email (si existe el usuario).
 * Responde siempre { ok: true } para no filtrar existencia.
 */
router.post("/forgot", async (req, res) => {
  try {
    const { email } = forgotSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      // Genera token aleatorio y guarda hash + expiración
      const rawToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = await bcrypt.hash(rawToken, BCRYPT_ROUNDS_TOKEN);
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15min

      // Limpia tokens expirados del usuario (opcional, higiene)
      await prisma.passwordReset.deleteMany({
        where: { userId: user.id, expiresAt: { lt: new Date() } },
      });

      // Mantén un único token vigente por usuario (upsert por userId)
      await prisma.passwordReset.upsert({
        where: { userId: user.id },
        update: { tokenHash, expiresAt, usedAt: null },
        create: { userId: user.id, tokenHash, expiresAt },
      });

      const base = appBaseUrl();
      const resetUrl = `${base}/reset-password?token=${rawToken}&email=${encodeURIComponent(
        email
      )}`;

      // Envía email (no reveles si el user existe o no)
      await sendPasswordResetEmail({ to: email, resetUrl });

      // En dev, opcionalmente retorna el link y token para testing
      if (process.env.DEV_RETURN_RESET_URL === "1") {
        return res.json({
          ok: true,
          dev: { resetUrl, token: rawToken, expiresAt: expiresAt.toISOString() },
        });
      }
    }

    return res.json({ ok: true });
  } catch (e) {
    // Errores de validación: 400 con detalles
    if (e?.name === "ZodError") {
      return res
        .status(400)
        .json({ message: "Datos inválidos", details: e.flatten() });
    }
    // No filtrar nada al cliente
    console.error("[forgot]", e);
    return res.json({ ok: true });
  }
});

/**
 * POST /api/auth/password/reset
 * Valida token + email y setea nueva contraseña.
 */
router.post("/reset", async (req, res) => {
  try {
    const { email, token, newPassword } = resetSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(400).json({ message: "Token inválido o expirado" });

    // Busca el token más reciente vigente y no usado
    const pr = await prisma.passwordReset.findFirst({
      where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });
    if (!pr) return res.status(400).json({ message: "Token inválido o expirado" });

    const match = await bcrypt.compare(token, pr.tokenHash);
    if (!match) return res.status(400).json({ message: "Token inválido o expirado" });

    const hashed = await bcrypt.hash(newPassword, BCRYPT_ROUNDS_PASSWORD);

    // Actualiza contraseña y marca el token como usado de forma atómica
    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { password: hashed } }),
      prisma.passwordReset.update({ where: { id: pr.id }, data: { usedAt: new Date() } }),
      // opcional: invalida otros tokens vigentes del mismo usuario
      prisma.passwordReset.updateMany({
        where: { userId: user.id, id: { not: pr.id }, usedAt: null },
        data: { usedAt: new Date() },
      }),
    ]);

    return res.json({ ok: true, message: "Contraseña actualizada correctamente." });
  } catch (e) {
    if (e?.name === "ZodError") {
      return res
        .status(400)
        .json({ message: "Datos inválidos", details: e.flatten() });
    }
    return res.status(400).json({ message: e?.message || "Bad Request" });
  }
});

export default router;
