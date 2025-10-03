import express from "express";
import { prisma } from "../lib/prisma.js";
import { publicPair, publicUrl } from "../lib/upload.js";

const router = express.Router();

// GET /api/featured?page=1&pageSize=12
router.get("/", async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page ?? "1", 10) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize ?? "12", 10) || 12));

    // Curados por admins
    const where = { adminCreated: true };

    const [total, rows] = await Promise.all([
      prisma.service.count({ where }),
      prisma.service.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          title: true,
          description: true,
          priceFrom: true,
          city: true,
          ratingAvg: true,
          createdAt: true,
          coverUrl: true,
          coverThumbUrl: true,
          category: { select: { id: true, name: true } },
          provider: { select: { id: true, name: true } },
          serviceType: { select: { id: true, name: true, imageUrl: true } },
        },
      }),
    ]);

    // Absolutizar URLs de portada y de serviceType.imageUrl
    const items = rows.map((s) => {
      const cover = publicPair({ path: s.coverUrl || null, thumbPath: s.coverThumbUrl || null });
      const stImg = s.serviceType?.imageUrl ? publicUrl(s.serviceType.imageUrl) : null;

      return {
        ...s,
        coverUrl: cover?.path || s.coverUrl,
        coverThumbUrl: cover?.thumbPath || s.coverThumbUrl,
        serviceType: s.serviceType
          ? { ...s.serviceType, imageUrl: stImg || s.serviceType.imageUrl }
          : null,
      };
    });

    res.json({ items, total, page, pageSize });
  } catch (e) {
    next(e);
  }
});

export default router;
