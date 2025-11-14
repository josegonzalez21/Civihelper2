// src/routes/services.js
import express from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, optionalAuth } from "../middleware/auth.js";
import {
  publicUrl,
  deleteFromUploads,
  assertImageObject,
} from "../lib/s3.js";
import {
  serviceCreateSchema,
  serviceUpdateSchema,
  serviceListQuerySchema,
} from "../validators/service.js";

const router = express.Router();

/* --------------------------------
   Utils
--------------------------------- */
function mapProviderToUser(obj) {
  if (!obj) return obj;
  const { provider, ...rest } = obj;
  return { ...rest, user: provider };
}

function toAbsoluteService(svc) {
  if (!svc) return svc;

  const coverUrlAbs = svc.coverUrl ? publicUrl(svc.coverUrl) : null;
  const coverThumbUrlAbs = svc.coverThumbUrl ? publicUrl(svc.coverThumbUrl) : null;

  const images = (svc.images || []).map((img) => ({
    ...img,
    url: img.url ? publicUrl(img.url) : null,
    thumbUrl: img.thumbUrl ? publicUrl(img.thumbUrl) : null,
  }));

  return {
    ...mapProviderToUser(svc),
    coverUrl: coverUrlAbs,
    coverThumbUrl: coverThumbUrlAbs,
    images,
  };
}

/* --------------------------------
   Helpers de pertenencia por prefijo
--------------------------------- */
function keyBelongsToServiceCover(key, serviceId) {
  return new RegExp(`^uploads\\/services\\/${String(serviceId)}\\/cover\\/`).test(
    String(key)
  );
}
function keyBelongsToServicePhoto(key, serviceId) {
  return new RegExp(`^uploads\\/services\\/${String(serviceId)}\\/photos\\/`).test(
    String(key)
  );
}

/* ============================================================================
   GET /api/services
   Query validada por serviceListQuerySchema
============================================================================ */
router.get("/", optionalAuth, async (req, res, next) => {
  try {
    const q = serviceListQuerySchema.parse(req.query ?? {});

    // where dinámico según filtros
    const where = {};

    if (q.search) {
      where.OR = [
        { title: { contains: q.search, mode: "insensitive" } },
        { description: { contains: q.search, mode: "insensitive" } },
        { city: { contains: q.search, mode: "insensitive" } },
      ];
    }
    if (q.categoryId) where.categoryId = String(q.categoryId);
    if (q.serviceTypeId) where.serviceTypeId = String(q.serviceTypeId);
    if (q.userId) where.providerId = String(q.userId);
    if (q.city) where.city = { contains: String(q.city), mode: "insensitive" };
    if (q.sector) where.sector = { equals: String(q.sector), mode: "insensitive" }; // si tu modelo tiene sector
    if (q.adminCreated !== undefined) where.adminCreated = q.adminCreated;
    if (q.featured !== undefined) where.featured = q.featured;
    if (q.onlyWithCover) where.coverUrl = { not: null };
    if (q.minPrice != null || q.maxPrice != null) {
      where.priceFrom = {};
      if (q.minPrice != null) where.priceFrom.gte = q.minPrice;
      if (q.maxPrice != null) where.priceFrom.lte = q.maxPrice;
    }
    if (q.hasImages !== undefined) {
      // true: tiene al menos 1 imagen | false: no tiene imágenes
      where.images = q.hasImages ? { some: {} } : { none: {} };
    }

    const allowedSort = new Set(["createdAt", "ratingAvg", "priceFrom", "title"]);
    const sortField = allowedSort.has(String(q.sort)) ? String(q.sort) : "createdAt";
    const orderBy = { [sortField]: q.order || "desc" };

    // Paginación: cursor o page/pageSize (mutuamente excluyentes por schema)
    const selectBase = {
      id: true,
      title: true,
      description: true,
      priceFrom: true,
      city: true,
      ratingAvg: true,
      createdAt: true,
      coverUrl: true, // keys S3
      coverThumbUrl: true, // keys S3
      category: { select: { id: true, name: true } },
      provider: { select: { id: true, name: true } },
    };

    if (q.cursor) {
      const take = q.pageSize ?? 10;
      const rawItems = await prisma.service.findMany({
        where,
        orderBy,
        take,
        skip: q.cursor ? 1 : 0,
        cursor: q.cursor ? { id: String(q.cursor) } : undefined,
        select: selectBase,
      });
      const items = rawItems.map(toAbsoluteService);
      const nextCursor = items.length === take ? items[items.length - 1].id : null;
      return res.json({ items, nextCursor, pageSize: take });
    }

    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 10;

    const [total, rawItems] = await Promise.all([
      prisma.service.count({ where }),
      prisma.service.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: selectBase,
      }),
    ]);

    const items = rawItems.map(toAbsoluteService);
    res.json({ items, total, page, pageSize });
  } catch (e) {
    if (e?.name === "ZodError") {
      return res.status(400).json({ message: "Query inválida", details: e.flatten() });
    }
    next(e);
  }
});

/* ============================================================================
   GET /api/services/:id
============================================================================ */
router.get("/:id", optionalAuth, async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const svc = await prisma.service.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true } },
        provider: { select: { id: true, name: true } },
        reviews: { select: { id: true, rating: true, comment: true, createdAt: true } },
        images: { select: { id: true, url: true, thumbUrl: true, createdAt: true } }, // keys S3
      },
    });
    if (!svc) return res.status(404).json({ message: "Servicio no encontrado" });
    res.json(toAbsoluteService(svc));
  } catch (e) {
    next(e);
  }
});

/* ============================================================================
   POST /api/services  (PROVIDER/ADMIN)
   Body validada por serviceCreateSchema
============================================================================ */
router.post("/", requireAuth, async (req, res, next) => {
  try {
    const data = serviceCreateSchema.parse(req.body ?? {});
    // Nota: si tu backend usa sector/lat/lng/tags, agrega los campos al create
    const created = await prisma.service.create({
      data: {
        title: data.title,
        description: data.description,
        priceFrom: data.priceFrom ?? null,
        city: data.city ?? null,
        category: { connect: { id: String(data.categoryId) } },
        serviceType: data.serviceTypeId
          ? { connect: { id: String(data.serviceTypeId) } }
          : undefined,
        provider: { connect: { id: String(req.user.sub) } },
        // sector: data.sector ?? undefined,
        // lat: data.lat ?? undefined,
        // lng: data.lng ?? undefined,
        // tags: data.tags ?? undefined, // según tu modelo
      },
      include: {
        category: { select: { id: true, name: true } },
        provider: { select: { id: true, name: true } },
      },
    });

    res.status(201).json(toAbsoluteService(created));
  } catch (e) {
    if (e?.name === "ZodError") {
      return res.status(422).json({ message: "Datos inválidos", details: e.flatten() });
    }
    if (e?.code === "P2025") {
      return res.status(400).json({ message: "Categoría o ServiceType inválido" });
    }
    next(e);
  }
});

/* ============================================================================
   PATCH /api/services/:id  (dueño/admin)
   Body validada por serviceUpdateSchema
============================================================================ */
router.patch("/:id", requireAuth, async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const svc = await prisma.service.findUnique({
      where: { id },
      select: { id: true, providerId: true },
    });
    if (!svc) return res.status(404).json({ message: "No existe" });
    if (svc.providerId !== req.user.sub && req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Prohibido" });
    }

    const body = serviceUpdateSchema.parse(req.body ?? {});
    const data = {
      ...(body.title != null ? { title: body.title } : {}),
      ...(body.description != null ? { description: body.description } : {}),
      ...(body.priceFrom !== undefined ? { priceFrom: body.priceFrom } : {}),
      ...(body.city != null ? { city: body.city } : {}),
      ...(body.categoryId != null ? { category: { connect: { id: String(body.categoryId) } } } : {}),
      ...(body.serviceTypeId != null
        ? { serviceType: { connect: { id: String(body.serviceTypeId) } } }
        : {}),
      // ...(body.status ? { status: body.status } : {}),
      // ...(body.tags ? { tags: body.tags } : {}),
      // ...(body.lat != null ? { lat: body.lat } : {}),
      // ...(body.lng != null ? { lng: body.lng } : {}),
    };

    const updated = await prisma.service.update({
      where: { id },
      data,
      include: {
        category: { select: { id: true, name: true } },
        provider: { select: { id: true, name: true } },
        images: { select: { id: true, url: true, thumbUrl: true, createdAt: true } },
      },
    });

    res.json(toAbsoluteService(updated));
  } catch (e) {
    if (e?.name === "ZodError") {
      return res.status(422).json({ message: "Datos inválidos", details: e.flatten() });
    }
    if (e?.code === "P2025") {
      return res.status(400).json({ message: "Categoría/ServiceType inválido" });
    }
    next(e);
  }
});

/* ============================================================================
   PUT /api/services/:id/cover  (dueño/admin)
   Body: { key: string, thumbKey?: string }
============================================================================ */
const coverBodySchema = z.object({
  key: z.string().trim().min(3, { message: "Falta 'key' de S3 para la portada" }),
  thumbKey: z.string().trim().min(3).optional(),
});

router.put("/:id/cover", requireAuth, async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const { key, thumbKey } = coverBodySchema.parse(req.body ?? {});

    if (!keyBelongsToServiceCover(key, id) || (thumbKey && !keyBelongsToServiceCover(thumbKey, id))) {
      return res.status(400).json({ message: "La key no corresponde a este servicio (cover)" });
    }

    const svc = await prisma.service.findUnique({
      where: { id },
      select: { id: true, providerId: true, coverUrl: true, coverThumbUrl: true },
    });
    if (!svc) return res.status(404).json({ message: "No existe" });
    if (svc.providerId !== req.user.sub && req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Prohibido" });
    }

    await assertImageObject(String(key), { expectedKind: "service_cover" });
    if (thumbKey) await assertImageObject(String(thumbKey), { expectedKind: "service_cover" });

    const updated = await prisma.service.update({
      where: { id },
      data: {
        coverUrl: String(key),
        coverThumbUrl: thumbKey ? String(thumbKey) : null,
      },
      select: { id: true, title: true, coverUrl: true, coverThumbUrl: true },
    });

    // Borrado best-effort
    const deletions = [];
    if (svc.coverUrl && svc.coverUrl !== updated.coverUrl)
      deletions.push(deleteFromUploads(svc.coverUrl));
    if (svc.coverThumbUrl && svc.coverThumbUrl !== updated.coverThumbUrl)
      deletions.push(deleteFromUploads(svc.coverThumbUrl));
    if (deletions.length) Promise.allSettled(deletions).catch(() => {});

    res.json({
      ...updated,
      coverUrl: publicUrl(updated.coverUrl),
      coverThumbUrl: publicUrl(updated.coverThumbUrl),
    });
  } catch (e) {
    if (e?.name === "ZodError") {
      return res.status(400).json({ message: "Datos inválidos", details: e.flatten() });
    }
    next(e);
  }
});

/* ============================================================================
   POST /api/services/:id/images  (dueño/admin)
   Body: { items: [{ key, thumbKey? }, ...] }  — máx 12 por request
============================================================================ */
const imagesBodySchema = z.object({
  items: z
    .array(
      z.object({
        key: z.string().trim().min(3),
        thumbKey: z.string().trim().min(3).optional(),
      })
    )
    .min(1),
});

router.post("/:id/images", requireAuth, async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const { items } = imagesBodySchema.parse(req.body ?? {});
    const MAX_BATCH = 12;
    if (items.length > MAX_BATCH) {
      return res.status(400).json({ message: `Máximo ${MAX_BATCH} imágenes por solicitud` });
    }

    const svc = await prisma.service.findUnique({
      where: { id },
      select: { id: true, providerId: true },
    });
    if (!svc) return res.status(404).json({ message: "No existe" });
    if (svc.providerId !== req.user.sub && req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Prohibido" });
    }

    // Validación de pertenencia por prefijo + deduplicación
    const clean = [];
    const seen = new Set();
    for (const it of items) {
      const k = String(it.key);
      const tk = it.thumbKey ? String(it.thumbKey) : null;
      if (!keyBelongsToServicePhoto(k, id) || (tk && !keyBelongsToServicePhoto(tk, id))) {
        return res.status(400).json({ message: "Alguna key no corresponde a este servicio (photos)" });
      }
      if (seen.has(k)) continue;
      seen.add(k);
      clean.push({ key: k, thumbKey: tk });
    }
    if (!clean.length) return res.status(400).json({ message: "Sin claves válidas para procesar" });

    // Validación S3 (kind)
    await Promise.all(
      clean.map(async ({ key, thumbKey }) => {
        await assertImageObject(key, { expectedKind: "service_photo" });
        if (thumbKey) await assertImageObject(thumbKey, { expectedKind: "service_photo" });
      })
    );

    // Crear en transacción
    const created = await prisma.$transaction(
      clean.map(({ key, thumbKey }) =>
        prisma.serviceImage.create({
          data: { serviceId: id, url: key, thumbUrl: thumbKey || null },
          select: { id: true, url: true, thumbUrl: true, createdAt: true },
        })
      )
    );

    const out = created.map((img) => ({
      ...img,
      url: publicUrl(img.url),
      thumbUrl: publicUrl(img.thumbUrl),
    }));

    res.status(201).json({ images: out });
  } catch (e) {
    if (e?.name === "ZodError") {
      return res.status(400).json({ message: "Datos inválidos", details: e.flatten() });
    }
    next(e);
  }
});

/* ============================================================================
   DELETE /api/services/:id/images/:imageId  (dueño/admin)
============================================================================ */
router.delete("/:id/images/:imageId", requireAuth, async (req, res, next) => {
  try {
    const serviceId = String(req.params.id);
    const imageId = String(req.params.imageId);

    const svc = await prisma.service.findUnique({
      where: { id: serviceId },
      select: { id: true, providerId: true },
    });
    if (!svc) return res.status(404).json({ message: "Servicio no encontrado" });
    if (svc.providerId !== req.user.sub && req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Prohibido" });
    }

    const img = await prisma.serviceImage.findUnique({
      where: { id: imageId },
      select: { id: true, serviceId: true, url: true, thumbUrl: true },
    });
    if (!img || img.serviceId !== serviceId) {
      return res.status(404).json({ message: "Imagen no encontrada" });
    }

    // Borrar primero en DB para no perder consistencia si deleteFromUploads falla
    await prisma.serviceImage.delete({ where: { id: imageId } });

    // Borrado best-effort en S3 (no interrumpe la respuesta)
    const tasks = [];
    if (img.url) tasks.push(deleteFromUploads(img.url));
    if (img.thumbUrl) tasks.push(deleteFromUploads(img.thumbUrl));
    if (tasks.length) Promise.allSettled(tasks).catch(() => {});

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

/* ============================================================================
   DELETE /api/services/:id  (dueño/admin)
   Elimina el servicio y SUS imágenes (borra keys S3 best-effort)
============================================================================ */
router.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const svc = await prisma.service.findUnique({
      where: { id },
      include: { images: true },
    });
    if (!svc) return res.status(404).json({ message: "No existe" });
    if (svc.providerId !== req.user.sub && req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Prohibido" });
    }

    // Elimina en DB (cascade si está definido en Prisma; si no, manual)
    await prisma.$transaction([
      prisma.serviceImage.deleteMany({ where: { serviceId: id } }),
      prisma.service.delete({ where: { id } }),
    ]);

    // Borrado best-effort en S3
    const tasks = [];
    if (svc.coverUrl) tasks.push(deleteFromUploads(svc.coverUrl));
    if (svc.coverThumbUrl) tasks.push(deleteFromUploads(svc.coverThumbUrl));
    for (const img of svc.images) {
      if (img.url) tasks.push(deleteFromUploads(img.url));
      if (img.thumbUrl) tasks.push(deleteFromUploads(img.thumbUrl));
    }
    if (tasks.length) Promise.allSettled(tasks).catch(() => {});

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default router;
