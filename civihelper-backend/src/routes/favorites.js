// src/routes/favorites.js
import express from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

/**
 * GET /api/favorites?page=1&pageSize=20
 * Devuelve la lista de favoritos del usuario autenticado.
 *
 * Si tu schema tiene:
 * model Favorite {
 *   id        String   @id @default(cuid())
 *   userId    String
 *   serviceId String
 *   createdAt DateTime @default(now())
 *   user      User     @relation(fields: [userId], references: [id])
 *   service   Service  @relation(fields: [serviceId], references: [id])
 *   @@unique([userId, serviceId])
 * }
 *
 * Entonces este endpoint ya funcionará.
 */
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page ?? "1", 10) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize ?? "20", 10) || 20));

    // Si no tienes el modelo Favorite todavía, puedes dejar esto comentado
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
              coverUrl: true,
              coverThumbUrl: true,
              category: { select: { id: true, name: true } },
            },
          },
        },
      }),
    ]);

    const items = rows.map((fav) => ({
      id: fav.id,
      createdAt: fav.createdAt,
      service: fav.service,
    }));

    res.json({ items, total, page, pageSize });
  } catch (e) {
    next(e);
  }
});

/**
 * POST /api/favorites/:serviceId
 * Marca un servicio como favorito del usuario.
 */
router.post("/:serviceId", requireAuth, async (req, res, next) => {
  try {
    if (!prisma.favorite) {
      return res.status(501).json({ message: "Modelo Favorite no implementado aún" });
    }
    const serviceId = String(req.params.serviceId);
    const fav = await prisma.favorite.upsert({
      where: { userId_serviceId: { userId: req.user.sub, serviceId } },
      update: {},
      create: { userId: req.user.sub, serviceId },
    });
    res.json({ ok: true, favoriteId: fav.id });
  } catch (e) {
    next(e);
  }
});

/**
 * DELETE /api/favorites/:serviceId
 * Quita un servicio de los favoritos del usuario.
 */
router.delete("/:serviceId", requireAuth, async (req, res, next) => {
  try {
    if (!prisma.favorite) {
      return res.status(501).json({ message: "Modelo Favorite no implementado aún" });
    }
    const serviceId = String(req.params.serviceId);
    await prisma.favorite.delete({
      where: { userId_serviceId: { userId: req.user.sub, serviceId } },
    });
    res.json({ ok: true });
  } catch (e) {
    if (e?.code === "P2025") {
      return res.status(404).json({ message: "No estaba en favoritos" });
    }
    next(e);
  }
});

export default router;
