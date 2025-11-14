// src/routes/admin.serviceTypes.js
import express from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";
import {
  publicUrl,
  deleteFromUploads,
  assertImageObject,
} from "../lib/s3.js";

const router = express.Router();
const ensureAdmin = requireRole("ADMIN");

/* ===========================================
   Helpers / Schemas
=========================================== */
const booleanish = (def) =>
  z
    .preprocess((v) => {
      if (typeof v === "boolean") return v;
      if (typeof v === "number") return v !== 0;
      if (typeof v === "string")
        return ["1", "true", "yes", "on"].includes(v.toLowerCase());
      return undefined;
    }, z.boolean().optional())
    .default(def);

const toAbsolute = (st) =>
  st ? { ...st, imageUrl: st.imageUrl ? publicUrl(st.imageUrl) : null } : st;

const createBodySchema = z.object({
  name: z.string().trim().min(1, "El nombre es requerido").max(120),
  description: z
    .string()
    .trim()
    .max(1000, "La descripción no puede superar 1000 caracteres")
    .optional()
    .nullable(),
  isActive: booleanish(true),
  categoryId: z.string().trim().min(1).optional().nullable(),
});

const listQuerySchema = z.object({
  search: z.string().trim().optional(),
  isActive: booleanish(undefined).optional(),
  categoryId: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

const updateBodySchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(1000).optional().nullable(),
  isActive: booleanish(undefined).optional(),
  categoryId: z.string().trim().optional().nullable(),
});

const imageBodySchema = z.object({
  key: z.string().trim().min(3, "Falta 'key' de S3 para la imagen"),
});

/* ===========================================
   POST /api/service-types  [ADMIN]
   Crear tipo (solo datos)
=========================================== */
router.post("/", requireAuth, ensureAdmin, async (req, res, next) => {
  try {
    const data = createBodySchema.parse(req.body ?? {});
    if (data.categoryId) {
      const exists = await prisma.category.findUnique({
        where: { id: String(data.categoryId) },
        select: { id: true },
      });
      if (!exists) return res.status(400).json({ message: "Categoría inválida" });
    }

    const created = await prisma.serviceType.create({
      data: {
        name: data.name,
        description: data.description ? String(data.description) : null,
        isActive: Boolean(data.isActive),
        categoryId: data.categoryId ? String(data.categoryId) : null,
      },
      select: {
        id: true,
        name: true,
        description: true,
        isActive: true,
        categoryId: true,
        imageUrl: true,
        createdAt: true,
      },
    });

    res.status(201).json(toAbsolute(created));
  } catch (e) {
    if (e?.name === "ZodError")
      return res.status(400).json({ message: "Datos inválidos", details: e.flatten() });
    if (e?.code === "P2002")
      return res.status(400).json({ message: "El nombre ya existe" });
    if (e?.code === "P2025")
      return res.status(400).json({ message: "Categoría inválida" });
    next(e);
  }
});

/* ===========================================
   GET /api/service-types  [ADMIN]
   Lista + filtros + paginado
=========================================== */
router.get("/", requireAuth, ensureAdmin, async (req, res, next) => {
  try {
    const q = listQuerySchema.parse(req.query ?? {});
    const where = {
      AND: [
        q.search ? { name: { contains: q.search, mode: "insensitive" } } : {},
        q.isActive === undefined ? {} : { isActive: q.isActive },
        q.categoryId ? { categoryId: q.categoryId } : {},
      ],
    };

    const [total, rows] = await Promise.all([
      prisma.serviceType.count({ where }),
      prisma.serviceType.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        select: {
          id: true,
          name: true,
          description: true,
          isActive: true,
          categoryId: true,
          imageUrl: true,
          createdAt: true,
        },
      }),
    ]);

    res.json({
      items: rows.map(toAbsolute),
      total,
      page: q.page,
      pageSize: q.pageSize,
    });
  } catch (e) {
    if (e?.name === "ZodError")
      return res.status(400).json({ message: "Parámetros inválidos", details: e.flatten() });
    next(e);
  }
});

/* ===========================================
   PUT /api/service-types/:id  [ADMIN]
   Actualiza campos de datos
=========================================== */
router.put("/:id", requireAuth, ensureAdmin, async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const prev = await prisma.serviceType.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!prev) return res.status(404).json({ message: "Tipo de servicio no encontrado" });

    const body = updateBodySchema.parse(req.body ?? {});
    if (body.categoryId != null && body.categoryId !== "") {
      const exists = await prisma.category.findUnique({
        where: { id: String(body.categoryId) },
        select: { id: true },
      });
      if (!exists) return res.status(400).json({ message: "Categoría inválida" });
    }

    const upd = await prisma.serviceType.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
        ...(body.categoryId !== undefined
          ? { categoryId: body.categoryId ? String(body.categoryId) : null }
          : {}),
      },
      select: {
        id: true,
        name: true,
        description: true,
        isActive: true,
        categoryId: true,
        imageUrl: true,
        createdAt: true,
      },
    });

    res.json(toAbsolute(upd));
  } catch (e) {
    if (e?.name === "ZodError")
      return res.status(400).json({ message: "Datos inválidos", details: e.flatten() });
    if (e?.code === "P2002")
      return res.status(400).json({ message: "El nombre ya existe" });
    if (e?.code === "P2025")
      return res.status(404).json({ message: "Tipo de servicio no encontrado" });
    next(e);
  }
});

/* ===========================================
   PUT /api/service-types/:id/image  [ADMIN]
   Guarda imagen por S3 key (validación de prefijo/kind)
=========================================== */
router.put("/:id/image", requireAuth, ensureAdmin, async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const { key } = imageBodySchema.parse(req.body ?? {});

    const st = await prisma.serviceType.findUnique({
      where: { id },
      select: { id: true, imageUrl: true, name: true },
    });
    if (!st) return res.status(404).json({ message: "Tipo de servicio no encontrado" });

    // Prefijo esperado: uploads/service-types/:id/...
    const isUnder = new RegExp(`^uploads\\/service-types\\/${id}\\/`).test(String(key));
    if (!isUnder) {
      return res.status(400).json({ message: "La key no corresponde a este tipo de servicio" });
    }

    // Valida existencia + MIME + límites (4 MB para service_type_image en lib/s3.js)
    await assertImageObject(String(key), { expectedKind: "service_type_image" });

    const updated = await prisma.serviceType.update({
      where: { id },
      data: { imageUrl: String(key) },
      select: {
        id: true,
        name: true,
        description: true,
        isActive: true,
        categoryId: true,
        imageUrl: true,
        createdAt: true,
      },
    });

    // Borrar imagen anterior si cambió (best-effort)
    const prevKey = st.imageUrl;
    if (prevKey && prevKey !== updated.imageUrl) {
      Promise.allSettled([deleteFromUploads(prevKey)]).catch(() => {});
    }

    res.json(toAbsolute(updated));
  } catch (e) {
    if (e?.name === "ZodError")
      return res.status(400).json({ message: "Datos inválidos", details: e.flatten() });
    next(e);
  }
});

/* ===========================================
   DELETE /api/service-types/:id  [ADMIN]
   Borra el registro + imagen S3 si existe
=========================================== */
router.delete("/:id", requireAuth, ensureAdmin, async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const prev = await prisma.serviceType.findUnique({
      where: { id },
      select: { imageUrl: true },
    });
    if (!prev) return res.status(404).json({ message: "Tipo de servicio no encontrado" });

    if (prev.imageUrl) await deleteFromUploads(prev.imageUrl);
    await prisma.serviceType.delete({ where: { id } });

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default router;
