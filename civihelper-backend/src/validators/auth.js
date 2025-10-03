// src/validators/auth.js
import { z } from "zod";

/**
 * Registro de usuario
 */
export const registerSchema = z.object({
  name: z.string()
    .min(2, { message: "El nombre debe tener al menos 2 caracteres" })
    .max(120, { message: "El nombre no puede superar 120 caracteres" }),
  email: z.string()
    .email({ message: "Correo electrónico inválido" }),
  password: z.string()
    .min(8, { message: "La contraseña debe tener al menos 8 caracteres" })
    .regex(/[A-Za-z]/, { message: "La contraseña debe incluir letras" })
    .regex(/[0-9]/, { message: "La contraseña debe incluir números" }),
  role: z.enum(["CLIENT", "PROVIDER"])
    .default("CLIENT")
    .transform((r) => r.toUpperCase()),
});

/**
 * Login tradicional
 */
export const loginSchema = z.object({
  email: z.string()
    .email({ message: "Correo electrónico inválido" }),
  password: z.string()
    .min(8, { message: "La contraseña debe tener al menos 8 caracteres" }),
});

/**
 * Login social (Google, Facebook, Apple).
 * Nota: cada provider valida distintos campos.
 */
export const socialSchema = z.object({
  code: z.string().min(5).optional(),           // Google/Facebook (Authorization Code)
  redirectUri: z.string().url().optional(),
  identityToken: z.string().min(10).optional(), // Apple
  fullName: z.string().max(120).optional(),
  email: z.string().email().optional(),
  oauthId: z.string().optional(),               // ID único en provider
}).refine(
  (data) => data.code || data.identityToken || (data.email && data.oauthId),
  {
    message: "Faltan credenciales sociales válidas",
    path: ["code"], // apunta al campo genérico
  }
);

