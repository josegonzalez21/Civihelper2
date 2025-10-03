// src/validators/service.js
import { z } from "zod";

/* Helpers */
const trimmed = (msg = "Texto requerido") =>
  z.string().trim().min(1, { message: msg });

const optionalTrimmed = () =>
  z
    .string()
    .trim()
    .transform((v) => (v === "" ? undefined : v))
    .optional();

const optionalInt = (min, msg) =>
  z
    .preprocess(
      (v) => (v === "" || v == null ? undefined : Number(v)),
      z.number({ invalid_type_error: msg })
        .int({ message: "Debe ser entero" })
        .min(min, { message: `Debe ser ≥ ${min}` })
        .optional()
    );

/* =========================
   Crear servicio
========================= */
export const serviceCreateSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, { message: "El título debe tener al menos 3 caracteres" })
    .max(120, { message: "El título no puede superar 120 caracteres" }),
  description: z
    .string()
    .trim()
    .min(10, { message: "La descripción debe tener al menos 10 caracteres" })
    .max(2000, { message: "La descripción no puede superar 2000 caracteres" }),
  priceFrom: optionalInt(1, "Precio inválido"),
  city: optionalTrimmed().refine((v) => (v ? v.length >= 2 && v.length <= 100 : true), {
    message: "Ciudad debe tener entre 2 y 100 caracteres",
  }),
  categoryId: trimmed("categoryId es requerido"),
  // opcional si usas catálogo curado:
  serviceTypeId: optionalTrimmed(),
});

/* =========================
   Actualizar servicio (PATCH)
   Todos los campos opcionales
========================= */
export const serviceUpdateSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, { message: "El título debe tener al menos 3 caracteres" })
    .max(120, { message: "El título no puede superar 120 caracteres" })
    .optional(),
  description: z
    .string()
    .trim()
    .min(10, { message: "La descripción debe tener al menos 10 caracteres" })
    .max(2000, { message: "La descripción no puede superar 2000 caracteres" })
    .optional(),
  priceFrom: z.preprocess(
    (v) => (v === "" || v == null ? null : Number(v)),
    z.number().int().min(1).nullable().optional()
  ),
  city: optionalTrimmed().refine((v) => (v ? v.length >= 2 && v.length <= 100 : true), {
    message: "Ciudad debe tener entre 2 y 100 caracteres",
  }),
  categoryId: optionalTrimmed(),
  serviceTypeId: optionalTrimmed(),
});

/* =========================
   Crear reseña
========================= */
export const reviewCreateSchema = z.object({
  rating: z
    .preprocess((v) => Number(v), z.number().int().min(1).max(5))
    .refine((n) => Number.isInteger(n), { message: "Rating debe ser entero 1..5" }),
  comment: z
    .string()
    .trim()
    .max(1000, { message: "El comentario no puede superar 1000 caracteres" })
    .optional(),
});

/* =========================
   Listado de servicios (query)
========================= */
export const serviceListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(50).default(10),
    search: z
      .string()
      .trim()
      .transform((v) => (v === "" ? undefined : v))
      .optional(),
    categoryId: optionalTrimmed(),
    serviceTypeId: optionalTrimmed(),
    userId: optionalTrimmed(), // alias para providerId en tu backend
    city: optionalTrimmed(),
    sort: z
      .enum(["createdAt", "priceFrom", "ratingAvg", "title"])
      .default("createdAt")
      .optional(),
    order: z.enum(["asc", "desc"]).default("desc").optional(),
    adminCreated: z
      .preprocess((v) => {
        if (typeof v === "string") return v.toLowerCase() === "true";
        return v;
      }, z.boolean().optional())
      .optional(),
  })
  .refine(
    (q) => !q.search || q.search.length >= 2,
    { message: "search debe tener al menos 2 caracteres", path: ["search"] }
  );
