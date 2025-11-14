// src/validators/password.js
import { z } from "zod";

/* Helpers */
const normalizeEmail = z
  .string()
  .trim()
  .toLowerCase()
  .email({ message: "Correo electrónico inválido" })
  .min(5, { message: "El correo es requerido" });

const tokenHex = z
  .string()
  .trim()
  .min(32, { message: "Token inválido: mínimo 32 caracteres" })
  .regex(/^[a-f0-9]+$/i, { message: "Token inválido: debe ser hex" });

export const passwordSchema = z
  .string()
  .min(8, { message: "La contraseña debe tener al menos 8 caracteres" })
  .max(128, { message: "La contraseña no puede superar 128 caracteres" })
  .regex(/[A-Za-z]/, { message: "La contraseña debe incluir letras" })
  .regex(/[0-9]/, { message: "La contraseña debe incluir números" })
  .refine((v) => !/\s/.test(v), { message: "La contraseña no debe contener espacios" });

/**
 * Solicitud de restablecimiento (olvidé mi contraseña).
 */
export const forgotSchema = z.object({
  email: normalizeEmail,
});

/**
 * Restablecimiento de contraseña con token.
 * - Acepta confirmación opcional; si viene, debe coincidir.
 */
export const resetSchema = z
  .object({
    email: normalizeEmail,
    token: tokenHex,
    newPassword: passwordSchema,
    confirmNewPassword: z.string().optional(),
  })
  .refine(
    (data) =>
      data.confirmNewPassword == null || data.newPassword === data.confirmNewPassword,
    { message: "Las contraseñas no coinciden", path: ["confirmNewPassword"] }
  );
