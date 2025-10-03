// src/routes/admin.serviceTypes.js
import express from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";
import {
  publicUrl,
  deleteFromUploads,
  assertImageObject,
} from "../lib/s3.js";

const router = express.Router();

/** Helper: absolutiza imageUrl (imageUrl guarda la KEY en BD) */
function toAbsolute(st) {
  if (!st) return st;
  return { ...st, imageUrl: st.imageUrl ? publicUrl(st.imageUrl) : null };
}

/**
 * POST /api/service-types
 * Crear tipo (solo datos). La imagen se sube con endpoint dedicado.
 * Body JSON: { name, description?, isActive?, categoryId? }
 */
router.post(
  "/",
  requireAuth,
  requireRole("ADMIN"),
  async (req, res, next) => {
    try {
      const { name, description, isActive = true, categoryId } = req.body || {};

      if (!name || typeof name !== "string" || !name.trim()) {
        return res.status(400).json({ message: "El nombre es requerido" });
      }

      // valida categoryId si viene
      if (categoryId) {
        const exists = await prisma.category.findUnique({
          where: { id: String(categoryId) },
          select: { id: true },
        });
        if (!exists) return res.status(400).json({ message: "Categoría inválida" });
      }

      const created = await prisma.serviceType.create({
        data: {
          name: String(name).trim(),
          description: description ? String(description).trim() : null,
          isActive: Boolean(isActive !== false && String(isActive) !== "false"),
          categoryId: categoryId ? String(categoryId) : null,
        },
        select: {
          id: true, name: true, description: true, isActive: true,
          categoryId: true, imageUrl: true, createdAt: true,
        },
      });

      res.status(201).json(toAbsolute(created));
    } catch (e) {
      if (e?.code === "P2002") {
        return res.status(400).json({ message: "El nombre ya existe" });
      }
      if (e?.code === "P2025") {
        return res.status(400).json({ message: "Categoría inválida" });
      }
      next(e);
    }
  }
);

/**
 * GET /api/service-types
 * Lista con filtros y paginado (ADMIN)
 * Query:
 *  - search: string
 *  - isActive: true|false
 *  - categoryId: string
 *  - page, pageSize
 */
router.get("/", requireAuth, requireRole("ADMIN"), async (req, res, next) => {
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

    const categoryId = req.query.categoryId ? String(req.query.categoryId) : undefined;

    const where = {
      AND: [
        search ? { name: { contains: search, mode: "insensitive" } } : {},
        isActive === undefined ? {} : { isActive },
        categoryId ? { categoryId } : {},
      ],
    };

    const [total, rows] = await Promise.all([
      prisma.serviceType.count({ where }),
      prisma.serviceType.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true, name: true, description: true, isActive: true,
          categoryId: true, imageUrl: true, createdAt: true,
        },
      }),
    ]);

    res.json({
      items: rows.map(toAbsolute),
      total,
      page,
      pageSize,
    });
  } catch (e) {
    next(e);
  }
});

/**
 * PUT /api/service-types/:id
 * Actualiza campos de datos. La imagen se actualiza en endpoint dedicado.
 * Body JSON: { name?, description?, isActive?, categoryId? }
 */
router.put(
  "/:id",
  requireAuth,
  requireRole("ADMIN"),
  async (req, res, next) => {
    try {
      const id = String(req.params.id);
      const prev = await prisma.serviceType.findUnique({
        where: { id },
        select: { id: true },
      });
      if (!prev) return res.status(404).json({ message: "Tipo de servicio no encontrado" });

      const { name, description, isActive, categoryId } = req.body || {};

      if (categoryId != null && categoryId !== "") {
        const exists = await prisma.category.findUnique({
          where: { id: String(categoryId) },
          select: { id: true },
        });
        if (!exists) return res.status(400).json({ message: "Categoría inválida" });
      }

      const upd = await prisma.serviceType.update({
        where: { id },
        data: {
          ...(name != null ? { name: String(name).trim() } : {}),
          ...(description != null ? { description: String(description).trim() } : {}),
          ...(isActive != null ? { isActive: String(isActive) !== "false" } : {}),
          ...(categoryId !== undefined ? { categoryId: categoryId ? String(categoryId) : null } : {}),
        },
        select: {
          id: true, name: true, description: true, isActive: true,
          categoryId: true, imageUrl: true, createdAt: true,
        },
      });

      res.json(toAbsolute(upd));
    } catch (e) {
      if (e?.code === "P2002") {
        return res.status(400).json({ message: "El nombre ya existe" });
      }
      if (e?.code === "P2025") {
        return res.status(404).json({ message: "Tipo de servicio no encontrado" });
      }
      next(e);
    }
  }
);

/* =========================================================
   PUT /api/service-types/:id/image
   Body: { key: string }
   Sube imagen por S3 key (validación de imagen, tamaño y prefijo)
========================================================= */
router.put(
  "/:id/image",
  requireAuth,
  requireRole("ADMIN"),
  async (req, res, next) => {
    try {
      const id = String(req.params.id);
      const { key } = req.body || {};
      if (!key) return res.status(400).json({ message: "Falta 'key' de S3 para la imagen" });

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

      // Valida existencia + MIME + límites (4 MB definidos en lib/s3.js)
      await assertImageObject(String(key), { expectedKind: "service_type_image" });

      const updated = await prisma.serviceType.update({
        where: { id },
        data: { imageUrl: String(key) },
        select: {
          id: true, name: true, description: true, isActive: true,
          categoryId: true, imageUrl: true, createdAt: true,
        },
      });

      // Borrar imagen anterior si cambió (best-effort)
      const prevKey = st.imageUrl;
      if (prevKey && prevKey !== updated.imageUrl) {
        Promise.allSettled([deleteFromUploads(prevKey)]).catch(() => {});
      }

      res.json(toAbsolute(updated));
    } catch (e) {
      next(e);
    }
  }
);

/**
 * DELETE /api/service-types/:id
 * Borra el registro y su imagen de S3 si existe.
 */
router.delete(
  "/:id",
  requireAuth,
  requireRole("ADMIN"),
  async (req, res, next) => {
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
  }
);

export default router;
