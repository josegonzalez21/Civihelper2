// src/validators/auth.js
import { z } from "zod";

/** Reglas comunes de contraseña (no se hace trim a password) */
const passwordRules = z
  .string()
  .min(8, { message: "La contraseña debe tener al menos 8 caracteres" })
  .regex(/[A-Za-z]/, { message: "La contraseña debe incluir letras" })
  .regex(/[0-9]/, { message: "La contraseña debe incluir números" });

/**
 * Registro de usuario
 */
export const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, { message: "El nombre debe tener al menos 2 caracteres" })
      .max(120, { message: "El nombre no puede superar 120 caracteres" }),
    email: z
      .string()
      .trim()
      .email({ message: "Correo electrónico inválido" }),
    password: passwordRules,
    role: z.preprocess(
      (v) => String(v ?? "CLIENT").toUpperCase(),
      z.enum(["CLIENT", "PROVIDER"])
    ),
  })
  .strict();

/**
 * Login tradicional
 */
export const loginSchema = z
  .object({
    email: z
      .string()
      .trim()
      .email({ message: "Correo electrónico inválido" }),
    password: z
      .string()
      .min(8, { message: "La contraseña debe tener al menos 8 caracteres" }),
  })
  .strict();

/**
 * Login social (Google, Facebook, Apple)
 * Acepta varias combinaciones, pero exige:
 * - code (Google/Facebook)  O
 * - identityToken (Apple)   O
 * - (email y oauthId) en modo demo/compat
 */
export const socialSchema = z
  .object({
    code: z.string().min(5).optional(),              // Google/Facebook (Authorization Code)
    redirectUri: z.string().url().optional(),
    identityToken: z.string().min(10).optional(),    // Apple
    fullName: z.string().trim().max(120).optional(),
    email: z.string().trim().email().optional(),
    oauthId: z.string().trim().optional(),           // ID único del provider
  })
  .refine(
    (data) =>
      !!data.code ||
      !!data.identityToken ||
      (!!data.email && !!data.oauthId),
    {
      message: "Faltan credenciales sociales válidas",
      path: ["code"], // campo genérico para el error
    }
  )
  .strict();
