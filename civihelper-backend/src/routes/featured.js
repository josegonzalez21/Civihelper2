// src/routes/featured.js
import express from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { publicUrl } from "../lib/s3.js";

const router = express.Router();

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
});

// GET /api/featured?page=1&pageSize=12
router.get("/", async (req, res, next) => {
  try {
    const { page, pageSize } = querySchema.parse(req.query ?? {});
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
          coverUrl: true,       // KEY S3
          coverThumbUrl: true,  // KEY S3
          category: { select: { id: true, name: true } },
          provider: { select: { id: true, name: true } },
          serviceType: { select: { id: true, name: true, imageUrl: true } }, // imageUrl = KEY S3
        },
      }),
    ]);

    const items = rows.map((s) => ({
      ...s,
      coverUrl: s.coverUrl ? publicUrl(s.coverUrl) : null,
      coverThumbUrl: s.coverThumbUrl ? publicUrl(s.coverThumbUrl) : null,
      serviceType: s.serviceType
        ? {
            ...s.serviceType,
            imageUrl: s.serviceType.imageUrl ? publicUrl(s.serviceType.imageUrl) : null,
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

export default router;
