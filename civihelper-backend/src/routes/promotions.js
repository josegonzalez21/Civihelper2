// src/routes/promotions.js
import express from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";
import { publicUrl, assertImageObject, deleteFromUploads } from "../lib/s3.js";

const router = express.Router();
const ensureAdmin = requireRole("ADMIN");

// Opcional: forzar una sola promoción activa a la vez
const SINGLE_ACTIVE = String(process.env.PROMO_SINGLE_ACTIVE || "0") === "1";

/* =========================
   Helpers de coerción
========================= */
const toNullIfEmpty = (v) => {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
};
const toBool = (v) => {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (["1", "true", "t", "yes", "y", "on"].includes(s)) return true;
    if (["0", "false", "f", "no", "n", "off"].includes(s)) return false;
  }
  return undefined;
};
const toDateOrNull = (v) => {
  if (v == null || v === "") return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  const d = new Date(String(v));
  return isNaN(d.getTime()) ? null : d;
};

function respondZod(res, parsed) {
  return res.status(422).json({
    message: "Datos inválidos",
    errors: parsed.error.issues.map((i) => ({
      path: i.path.join(".") || "root",
      message: i.message,
    })),
  });
}

/* =========================
   Schemas (aceptan imageKey O imageUrl como KEY S3)
========================= */
const baseSchema = z
  .object({
    title: z.string().trim().min(2, "Título requerido"),

    // Aceptamos cualquiera de los dos, luego normalizamos a 'imageKey'
    imageKey: z
      .string()
      .trim()
      .min(6)
      .regex(/^uploads\/promotions\//i, "imageKey inválido (usa uploads/promotions/...)")
      .optional(),
    imageUrl: z
      .string()
      .trim()
      .min(6)
      .regex(/^uploads\/promotions\//i, "imageUrl debe ser la KEY S3 (uploads/promotions/...)")
      .optional(),

    linkUrl: z.preprocess(toNullIfEmpty, z.string().url().nullable()).default(null),
    serviceId: z.preprocess(toNullIfEmpty, z.string().nullable()).default(null),
    categoryId: z.preprocess(toNullIfEmpty, z.string().nullable()).default(null),

    isActive: z.preprocess(toBool, z.boolean()).default(true),
    startsAt: z.preprocess(toDateOrNull, z.date().nullable()).default(null),
    endsAt: z.preprocess(toDateOrNull, z.date().nullable()).default(null),

    order: z
      .preprocess((v) => (v === undefined ? 0 : Number(v)), z.number().int().nonnegative())
      .default(0),
  })
  .superRefine((d, ctx) => {
    // Necesitamos al menos una KEY
    const key = d.imageKey || d.imageUrl;
    if (!key) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Debes enviar imageKey (o imageUrl con la KEY S3)",
        path: ["imageKey"],
      });
    }
    // Solo un destino
    const targets = [d.linkUrl, d.serviceId, d.categoryId].filter(Boolean);
    if (targets.length > 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Usa solo UN destino: linkUrl O serviceId O categoryId",
        path: ["destination"],
      });
    }
    // Rango de fechas coherente
    if (d.startsAt && d.endsAt && d.endsAt < d.startsAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "endsAt debe ser posterior a startsAt",
        path: ["endsAt"],
      });
    }
  });

const createSchema = baseSchema;
const updateSchema = baseSchema.partial();

/* =========================
   Output mapper
========================= */
function mapOut(p) {
  return {
    ...p,
    // Devolvemos la URL absoluta de la imagen para el cliente
    imageUrl: p.imageKey ? publicUrl(p.imageKey) : null,
  };
}

/* =========================
   GET /api/promotions
   ?status=ACTIVE|ALL (default ACTIVE)
   ?limit=1..50       (default 10)
========================= */
router.get("/", async (req, res, next) => {
  try {
    const { status, limit = "10" } = req.query;

    const where = {};
    if (String(status || "ACTIVE").toUpperCase() === "ACTIVE") {
      const now = new Date();
      where.isActive = true;
      where.OR = [{ startsAt: null }, { startsAt: { lte: now } }];
      where.AND = [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }];
    }

    const take = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
    const promos = await prisma.promotion.findMany({
      where,
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
      take,
      select: {
        id: true,
        title: true,
        imageKey: true,
        linkUrl: true,
        serviceId: true,
        categoryId: true,
        startsAt: true,
        endsAt: true,
        isActive: true,
        order: true,
        createdAt: true,
      },
    });

    res.json({ items: promos.map(mapOut) });
  } catch (e) {
    next(e);
  }
});

/* =========================
   GET /api/promotions/:id
========================= */
router.get("/:id", async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const p = await prisma.promotion.findUnique({ where: { id } });
    if (!p) return res.status(404).json({ message: "Promoción no encontrada" });
    res.json(mapOut(p));
  } catch (e) {
    next(e);
  }
});

/* =========================
   POST /api/promotions (ADMIN)
========================= */
router.post("/", requireAuth, ensureAdmin, async (req, res, next) => {
  try {
    const parsed = createSchema.safeParse(req.body || {});
    if (!parsed.success) return respondZod(res, parsed);
    const d = parsed.data;
    const key = d.imageKey || d.imageUrl; // normalizamos

    // Verifica que la KEY exista y sea del kind 'promotion'
    await assertImageObject(key, { expectedKind: "promotion" });

    // (Opcional) permitir sólo una activa "ahora"
    if (SINGLE_ACTIVE && d.isActive) {
      const now = new Date();
      const already = await prisma.promotion.count({
        where: {
          isActive: true,
          OR: [{ startsAt: null }, { startsAt: { lte: now } }],
          AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
        },
      });
      if (already > 0) {
        return res.status(409).json({ message: "Ya existe una promoción activa" });
      }
    }

    const created = await prisma.promotion.create({
      data: {
        title: d.title,
        imageKey: key, // guardamos SIEMPRE la KEY S3
        linkUrl: d.linkUrl,
        serviceId: d.serviceId,
        categoryId: d.categoryId,
        isActive: d.isActive,
        startsAt: d.startsAt,
        endsAt: d.endsAt,
        order: d.order,
      },
    });

    res.status(201).json(mapOut(created));
  } catch (e) {
    next(e);
  }
});

/* =========================
   PUT /api/promotions/:id (ADMIN)
========================= */
router.put("/:id", requireAuth, ensureAdmin, async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const parsed = updateSchema.safeParse(req.body || {});
    if (!parsed.success) return respondZod(res, parsed);
    const d = parsed.data;

    const data = {};
    if (d.title !== undefined) data.title = d.title;
    if (d.linkUrl !== undefined) data.linkUrl = d.linkUrl;
    if (d.serviceId !== undefined) data.serviceId = d.serviceId;
    if (d.categoryId !== undefined) data.categoryId = d.categoryId;
    if (d.isActive !== undefined) data.isActive = d.isActive;
    if (d.startsAt !== undefined) data.startsAt = d.startsAt;
    if (d.endsAt !== undefined) data.endsAt = d.endsAt;
    if (d.order !== undefined) data.order = d.order;

    // Actualizar KEY usando imageKey o imageUrl
    const newKey = d.imageKey || d.imageUrl;
    if (newKey) {
      await assertImageObject(newKey, { expectedKind: "promotion" });
      data.imageKey = newKey;
    }

    // (Opcional) regla de una sola activa
    if (SINGLE_ACTIVE && data.isActive === true) {
      const now = new Date();
      const already = await prisma.promotion.count({
        where: {
          id: { not: id },
          isActive: true,
          OR: [{ startsAt: null }, { startsAt: { lte: now } }],
          AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
        },
      });
      if (already > 0) {
        return res.status(409).json({ message: "Ya existe una promoción activa" });
      }
    }

    const updated = await prisma.promotion.update({
      where: { id },
      data,
    });

    res.json(mapOut(updated));
  } catch (e) {
    if (e?.code === "P2025") return res.status(404).json({ message: "Promoción no encontrada" });
    next(e);
  }
});

/* =========================
   PATCH /api/promotions/:id/reorder (ADMIN)
========================= */
router.patch("/:id/reorder", requireAuth, ensureAdmin, async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const order = Number(req.body?.order);
    if (!Number.isInteger(order) || order < 0) {
      return res.status(422).json({ message: "order debe ser entero >= 0" });
    }
    const updated = await prisma.promotion.update({
      where: { id },
      data: { order },
    });
    res.json(mapOut(updated));
  } catch (e) {
    if (e?.code === "P2025") return res.status(404).json({ message: "Promoción no encontrada" });
    next(e);
  }
});

/* =========================
   DELETE /api/promotions/:id (ADMIN)
========================= */
router.delete("/:id", requireAuth, ensureAdmin, async (req, res, next) => {
  try {
    const id = String(req.params.id);

    const prev = await prisma.promotion.findUnique({
      where: { id },
      select: { imageKey: true },
    });
    if (!prev) return res.status(404).json({ message: "Promoción no encontrada" });

    await prisma.promotion.delete({ where: { id } });

    if (prev.imageKey) deleteFromUploads(prev.imageKey).catch(() => {});
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default router;
