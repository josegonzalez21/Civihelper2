// src/routes/admin.promotions.js
import express from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";
import { assertImageObject, deleteFromUploads, publicUrl } from "../lib/s3.js";

const router = express.Router();
const ensureAdmin = requireRole("ADMIN");

const baseSchema = z.object({
  title: z.string().trim().min(2),
  linkUrl: z.string().trim().url().optional().or(z.literal("").transform(() => undefined)),
  order: z.coerce.number().int().min(0).default(0),
  isActive: z.coerce.boolean().optional(),
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().optional(),
  serviceId: z.string().trim().optional(),
  categoryId: z.string().trim().optional(),
});

/** Crear promo (sin imagen) */
router.post("/", requireAuth, ensureAdmin, async (req, res, next) => {
  try {
    const data = baseSchema.parse(req.body || {});
    const created = await prisma.promotion.create({ data });
    res.status(201).json(created);
  } catch (e) {
    next(e);
  }
});

/** Listado admin (filtros opcionales) */
router.get("/", requireAuth, ensureAdmin, async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page ?? "1", 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize ?? "20", 10) || 20));
    const search = String(req.query.search || "").trim();
    const isActive =
      typeof req.query.isActive === "string"
        ? req.query.isActive.toLowerCase() === "true"
          ? true
          : req.query.isActive.toLowerCase() === "false"
          ? false
          : undefined
        : undefined;

    const where = {
      AND: [
        search ? { title: { contains: search, mode: "insensitive" } } : {},
        isActive === undefined ? {} : { isActive },
      ],
    };

    const [total, rows] = await Promise.all([
      prisma.promotion.count({ where }),
      prisma.promotion.findMany({
        where,
        orderBy: [{ order: "asc" }, { createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    res.json({
      items: rows.map((p) => ({ ...p, imageUrl: p.imageUrl ? publicUrl(p.imageUrl) : null })),
      total,
      page,
      pageSize,
    });
  } catch (e) {
    next(e);
  }
});

/** Actualizar datos (no imagen) */
router.put("/:id", requireAuth, ensureAdmin, async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const exists = await prisma.promotion.findUnique({ where: { id } });
    if (!exists) return res.status(404).json({ message: "Promoción no encontrada" });

    const data = baseSchema.partial().parse(req.body || {});
    const updated = await prisma.promotion.update({ where: { id }, data });
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

/** Subir/registrar imagen (KEY de S3) */
router.put("/:id/image", requireAuth, ensureAdmin, async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const { key } = z.object({ key: z.string().min(5) }).parse(req.body || {});
    const prev = await prisma.promotion.findUnique({ where: { id }, select: { imageUrl: true } });
    if (!prev) return res.status(404).json({ message: "Promoción no encontrada" });

    // Prefijo esperado: uploads/promotions/:id/...
    const isUnder = new RegExp(`^uploads\\/promotions\\/${id}\\/`).test(String(key));
    if (!isUnder) return res.status(400).json({ message: "La key no corresponde a esta promoción" });

    // Valida en S3
    await assertImageObject(String(key), { expectedKind: "promotion" });

    const updated = await prisma.promotion.update({
      where: { id },
      data: { imageUrl: String(key) },
    });

    // Borrar anterior (best-effort)
    if (prev.imageUrl && prev.imageUrl !== key) {
      deleteFromUploads(prev.imageUrl).catch(() => {});
    }

    res.json({ ...updated, imageUrl: updated.imageUrl ? publicUrl(updated.imageUrl) : null });
  } catch (e) {
    next(e);
  }
});

/** Eliminar promo (+ imagen S3 si existe) */
router.delete("/:id", requireAuth, ensureAdmin, async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const prev = await prisma.promotion.findUnique({ where: { id } });
    if (!prev) return res.status(404).json({ message: "Promoción no encontrada" });

    if (prev.imageUrl) await deleteFromUploads(prev.imageUrl);
    await prisma.promotion.delete({ where: { id } });

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default router;
