// src/routes/categories.js
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

const ensureAdmin = requireRole("ADMIN");
const router = express.Router();

/* =========================
   Helpers / Schemas
========================= */
const SectorEnum = z.enum(["PUBLIC", "PRIVATE", "NGO", "EDUCATION", "HEALTH", "OTHER"]);
const booleanish = (def) =>
  z
    .preprocess((v) => {
      if (typeof v === "boolean") return v;
      if (typeof v === "number") return v !== 0;
      if (typeof v === "string") return ["1", "true", "yes", "on"].includes(v.toLowerCase());
      return undefined;
    }, z.boolean().optional())
    .default(def);

const toAbsolute = (entity) => {
  if (!entity) return entity;
  return {
    ...entity,
    imageUrl: entity.imageUrl ? publicUrl(entity.imageUrl) : null,
    imageThumbUrl: entity.imageThumbUrl ? publicUrl(entity.imageThumbUrl) : null,
  };
};

const listQuerySchema = z.object({
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  sector: SectorEnum.optional(),
  onlyRoots: booleanish(false),
  parentId: z.string().trim().optional(),
});

const createBodySchema = z.object({
  name: z.string().trim().min(1, "name es requerido").max(120),
  parentId: z.string().trim().optional().nullable(),
  isActive: booleanish(true),
  sector: SectorEnum.default("OTHER"),
});

const updateBodySchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  parentId: z.string().trim().optional().nullable(),
  isActive: booleanish(undefined).optional(),
  sector: SectorEnum.optional(),
});

const iconBodySchema = z.object({
  key: z.string().trim().min(3, "Falta 'key' de S3 para el icono"),
});

const coverBodySchema = z.object({
  key: z.string().trim().min(3, "Falta 'key' de S3 para la portada"),
  thumbKey: z.string().trim().min(3).optional(),
});

/* =========================
   GET /api/categories
   Lista plana (buscador)
========================= */
router.get("/", async (req, res, next) => {
  try {
    const q = listQuerySchema.parse(req.query ?? {});

    const where = {
      AND: [
        { isActive: true },
        q.search ? { name: { contains: q.search, mode: "insensitive" } } : {},
        q.sector ? { sector: q.sector } : {},
        q.onlyRoots ? { parentId: null } : {},
        q.parentId ? { parentId: q.parentId } : {},
      ],
    };

    // Paginado opcional
    if (q.page && q.pageSize) {
      const take = q.pageSize;
      const skip = (q.page - 1) * take;

      const [items, total] = await Promise.all([
        prisma.category.findMany({
          where,
          orderBy: [{ parentId: "asc" }, { name: "asc" }],
          skip,
          take,
          select: {
            id: true,
            name: true,
            parentId: true,
            isActive: true,
            sector: true,
            imageUrl: true,
            imageThumbUrl: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
        prisma.category.count({ where }),
      ]);

      return res.json({
        items: items.map(toAbsolute),
        total,
        page: q.page,
        pageSize: take,
      });
    }

    const items = await prisma.category.findMany({
      where,
      orderBy: [{ parentId: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        parentId: true,
        isActive: true,
        sector: true,
        imageUrl: true,
        imageThumbUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return res.json(items.map(toAbsolute));
  } catch (e) {
    if (e?.name === "ZodError")
      return res.status(400).json({ message: "Parámetros inválidos", details: e.flatten() });
    next(e);
  }
});

/* =========================
   GET /api/categories/tree
   Áreas raíz con hijos activos
========================= */
router.get("/tree", async (_req, res, next) => {
  try {
    const roots = await prisma.category.findMany({
      where: { parentId: null, isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        parentId: true,
        isActive: true,
        sector: true,
        imageUrl: true,
        imageThumbUrl: true,
        createdAt: true,
        updatedAt: true,
        children: {
          where: { isActive: true },
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
            parentId: true,
            isActive: true,
            sector: true,
            imageUrl: true,
            imageThumbUrl: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });
    const toAbsTree = (cat) => ({
      ...toAbsolute(cat),
      children: (cat.children || []).map(toAbsolute),
    });
    res.json(roots.map(toAbsTree));
  } catch (e) {
    next(e);
  }
});

/* =========================
   GET /api/categories/roots
========================= */
router.get("/roots", async (_req, res, next) => {
  try {
    const roots = await prisma.category.findMany({
      where: { parentId: null, isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        parentId: true,
        isActive: true,
        sector: true,
        imageUrl: true,
        imageThumbUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    res.json(roots.map(toAbsolute));
  } catch (e) {
    next(e);
  }
});

/* =========================
   GET /api/categories/:id/children
========================= */
router.get("/:id/children", async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const children = await prisma.category.findMany({
      where: { parentId: id, isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        parentId: true,
        isActive: true,
        sector: true,
        imageUrl: true,
        imageThumbUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    res.json(children.map(toAbsolute));
  } catch (e) {
    next(e);
  }
});

/* =========================
   POST /api/categories  [ADMIN]
   Crea área o derivado
========================= */
router.post("/", requireAuth, ensureAdmin, async (req, res, next) => {
  try {
    const body = createBodySchema.parse(req.body ?? {});

    if (body.parentId) {
      const parent = await prisma.category.findUnique({ where: { id: String(body.parentId) } });
      if (!parent) return res.status(400).json({ message: "parentId inválido" });
    }

    const created = await prisma.category.create({
      data: {
        name: body.name.trim(),
        parentId: body.parentId ? String(body.parentId) : null,
        isActive: Boolean(body.isActive),
        sector: body.sector,
      },
      select: {
        id: true,
        name: true,
        parentId: true,
        isActive: true,
        sector: true,
        imageUrl: true,
        imageThumbUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.status(201).json(toAbsolute(created));
  } catch (e) {
    if (e?.name === "ZodError")
      return res.status(400).json({ message: "Datos inválidos", details: e.flatten() });
    if (e?.code === "P2002")
      return res.status(409).json({ message: "Ya existe una categoría con ese nombre en este nivel" });
    next(e);
  }
});

/* =========================
   PUT /api/categories/:id  [ADMIN]
   Edita nombre/sector/parent/isActive
========================= */
router.put("/:id", requireAuth, ensureAdmin, async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const prev = await prisma.category.findUnique({ where: { id } });
    if (!prev) return res.status(404).json({ message: "Categoría no encontrada" });

    const body = updateBodySchema.parse(req.body ?? {});
    if (body.parentId === id) {
      return res.status(400).json({ message: "Una categoría no puede ser su propio padre" });
    }
    if (body.parentId) {
      const parent = await prisma.category.findUnique({ where: { id: String(body.parentId) } });
      if (!parent) return res.status(400).json({ message: "parentId inválido" });
    }

    const updates = {
      ...(body.name !== undefined ? { name: body.name.trim() } : {}),
      ...(body.parentId !== undefined ? { parentId: body.parentId ? String(body.parentId) : null } : {}),
      ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      ...(body.sector !== undefined ? { sector: body.sector } : {}),
    };

    const updated = await prisma.category.update({
      where: { id },
      data: updates,
      select: {
        id: true,
        name: true,
        parentId: true,
        isActive: true,
        sector: true,
        imageUrl: true,
        imageThumbUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json(toAbsolute(updated));
  } catch (e) {
    if (e?.name === "ZodError")
      return res.status(400).json({ message: "Datos inválidos", details: e.flatten() });
    if (e?.code === "P2002")
      return res.status(409).json({ message: "Ya existe una categoría con ese nombre en este nivel" });
    if (e?.code === "P2025")
      return res.status(404).json({ message: "Categoría no encontrada" });
    next(e);
  }
});

/* =========================
   PUT /api/categories/:id/icon  [ADMIN]
   Guarda icono (imageUrl)
========================= */
router.put("/:id/icon", requireAuth, ensureAdmin, async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const { key } = iconBodySchema.parse(req.body ?? {});

    const isUnder = new RegExp(`^uploads\\/categories\\/${id}\\/icon\\/`).test(String(key));
    if (!isUnder) return res.status(400).json({ message: "La key no corresponde a esta categoría" });

    const cat = await prisma.category.findUnique({
      where: { id },
      select: { id: true, name: true, imageUrl: true, imageThumbUrl: true },
    });
    if (!cat) return res.status(404).json({ message: "Categoría no existe" });

    await assertImageObject(String(key), { expectedKind: "category_icon" });

    const updated = await prisma.category.update({
      where: { id },
      data: { imageUrl: String(key) },
      select: { id: true, name: true, imageUrl: true, imageThumbUrl: true },
    });

    if (cat.imageUrl && cat.imageUrl !== updated.imageUrl) {
      Promise.allSettled([deleteFromUploads(cat.imageUrl)]).catch(() => {});
    }

    res.json(toAbsolute(updated));
  } catch (e) {
    if (e?.name === "ZodError")
      return res.status(400).json({ message: "Datos inválidos", details: e.flatten() });
    next(e);
  }
});

/* =========================
   PUT /api/categories/:id/cover  [ADMIN]
   Guarda portada (imageUrl + imageThumbUrl?)
========================= */
router.put("/:id/cover", requireAuth, ensureAdmin, async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const { key, thumbKey } = coverBodySchema.parse(req.body ?? {});

    const isUnder = new RegExp(`^uploads\\/categories\\/${id}\\/cover\\/`).test(String(key));
    if (!isUnder) return res.status(400).json({ message: "La key no corresponde a esta categoría" });

    const cat = await prisma.category.findUnique({
      where: { id },
      select: { id: true, name: true, imageUrl: true, imageThumbUrl: true },
    });
    if (!cat) return res.status(404).json({ message: "Categoría no existe" });

    await assertImageObject(String(key), { expectedKind: "category_cover" });
    if (thumbKey) {
      await assertImageObject(String(thumbKey), { expectedKind: "category_cover" });
    }

    const updated = await prisma.category.update({
      where: { id },
      data: {
        imageUrl: String(key),
        ...(thumbKey ? { imageThumbUrl: String(thumbKey) } : {}),
      },
      select: { id: true, name: true, imageUrl: true, imageThumbUrl: true },
    });

    const deletions = [];
    if (cat.imageUrl && cat.imageUrl !== updated.imageUrl) deletions.push(deleteFromUploads(cat.imageUrl));
    if (thumbKey && cat.imageThumbUrl && cat.imageThumbUrl !== updated.imageThumbUrl) {
      deletions.push(deleteFromUploads(cat.imageThumbUrl));
    }
    if (deletions.length) Promise.allSettled(deletions).catch(() => {});

    res.json(toAbsolute(updated));
  } catch (e) {
    if (e?.name === "ZodError")
      return res.status(400).json({ message: "Datos inválidos", details: e.flatten() });
    next(e);
  }
});

/* =========================
   DELETE /api/categories/:id  [ADMIN]
   Soft-delete (isActive=false)
========================= */
router.delete("/:id", requireAuth, ensureAdmin, async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const updated = await prisma.category.update({
      where: { id },
      data: { isActive: false },
      select: { id: true },
    });
    res.json({ ok: true, softDeleted: updated.id });
  } catch (e) {
    if (e?.code === "P2025") return res.status(404).json({ message: "Categoría no encontrada" });
    next(e);
  }
});

export default router;
