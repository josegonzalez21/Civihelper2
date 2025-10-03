// src/validators/password.js
import { z } from "zod";

/**
 * Solicitud de restablecimiento (olvidé mi contraseña).
 */
export const forgotSchema = z.object({
  email: z
    .string()
    .email({ message: "Correo electrónico inválido" })
    .min(5, { message: "El correo es requerido" }),
});

/**
 * Restablecimiento de contraseña con token.
 */
export const resetSchema = z.object({
  email: z
    .string()
    .email({ message: "Correo electrónico inválido" }),
  token: z
    .string()
    .min(32, { message: "Token inválido: mínimo 32 caracteres" })
    .regex(/^[a-f0-9]+$/i, { message: "Token inválido: debe ser hex" }),
  newPassword: z
    .string()
    .min(8, { message: "La contraseña debe tener al menos 8 caracteres" })
    .regex(/[A-Za-z]/, { message: "La contraseña debe incluir letras" })
    .regex(/[0-9]/, { message: "La contraseña debe incluir números" }),
});
