// src/routes/favorites.js
import express from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { publicUrl } from "../lib/s3.js";

const router = express.Router();

/* =========================
   Schemas
========================= */
const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

const serviceIdParamSchema = z.object({
  serviceId: z.string().trim().min(1, "serviceId es requerido"),
});

/* =========================
   GET /api/favorites?page=1&pageSize=20
   Lista de favoritos del usuario autenticado
========================= */
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const { page, pageSize } = listQuerySchema.parse(req.query ?? {});

    // Si no existe el modelo Favorite en tu prisma (entorno temporal), devuelve vacío
    if (!prisma.favorite) {
      return res.json({ items: [], total: 0, page, pageSize });
    }

    const where = { userId: req.user.sub };

    const [total, rows] = await Promise.all([
      prisma.favorite.count({ where }),
      prisma.favorite.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          service: {
            select: {
              id: true,
              title: true,
              description: true,
              priceFrom: true,
              city: true,
              ratingAvg: true,
              createdAt: true,
              coverUrl: true,       // KEY S3
              coverThumbUrl: true,  // KEY S3
              category: { select: { id: true, name: true } },
              provider: { select: { id: true, name: true } },
            },
          },
          createdAt: true,
          id: true,
        },
      }),
    ]);

    const items = rows.map((fav) => ({
      id: fav.id,
      createdAt: fav.createdAt,
      service: fav.service
        ? {
            ...fav.service,
            coverUrl: fav.service.coverUrl ? publicUrl(fav.service.coverUrl) : null,
            coverThumbUrl: fav.service.coverThumbUrl ? publicUrl(fav.service.coverThumbUrl) : null,
          }
        : null,
    }));

    res.json({ items, total, page, pageSize });
  } catch (e) {
    if (e?.name === "ZodError") {
      return res.status(400).json({ message: "Parámetros inválidos", details: e.flatten() });
    }
    next(e);
  }
});

/* =========================
   POST /api/favorites/:serviceId
   Marca un servicio como favorito (idempotente)
========================= */
router.post("/:serviceId", requireAuth, async (req, res, next) => {
  try {
    if (!prisma.favorite) {
      return res.status(501).json({ message: "Modelo Favorite no implementado aún" });
    }
    const { serviceId } = serviceIdParamSchema.parse(req.params);

    const fav = await prisma.favorite.upsert({
      where: { userId_serviceId: { userId: req.user.sub, serviceId } },
      update: {}, // idempotente
      create: { userId: req.user.sub, serviceId },
      select: { id: true, userId: true, serviceId: true, createdAt: true },
    });

    res.json({ ok: true, favoriteId: fav.id });
  } catch (e) {
    if (e?.name === "ZodError") {
      return res.status(400).json({ message: "Parámetros inválidos", details: e.flatten() });
    }
    // Si el serviceId no existe, Prisma puede lanzar P2003 (FK)
    if (e?.code === "P2003") {
      return res.status(404).json({ message: "Servicio no encontrado" });
    }
    next(e);
  }
});

/* =========================
   DELETE /api/favorites/:serviceId
   Quita un servicio de favoritos
========================= */
router.delete("/:serviceId", requireAuth, async (req, res, next) => {
  try {
    if (!prisma.favorite) {
      return res.status(501).json({ message: "Modelo Favorite no implementado aún" });
    }
    const { serviceId } = serviceIdParamSchema.parse(req.params);

    await prisma.favorite.delete({
      where: { userId_serviceId: { userId: req.user.sub, serviceId } },
    });

    res.json({ ok: true });
  } catch (e) {
    if (e?.name === "ZodError") {
      return res.status(400).json({ message: "Parámetros inválidos", details: e.flatten() });
    }
    if (e?.code === "P2025") {
      return res.status(404).json({ message: "No estaba en favoritos" });
    }
    next(e);
  }
});

export default router;
