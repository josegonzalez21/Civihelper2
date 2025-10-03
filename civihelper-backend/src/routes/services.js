// src/routes/services.js
import express from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, optionalAuth } from "../middleware/auth.js";
import {
  publicUrl,
  deleteFromUploads,
  assertImageObject,
} from "../lib/s3.js";

const router = express.Router();

/* --------------------------------
   Util: mapea provider -> user
--------------------------------- */
function mapProviderToUser(obj) {
  if (!obj) return obj;
  const { provider, ...rest } = obj;
  return { ...rest, user: provider };
}

/* --------------------------------
   Util: absolutizar portada/images (de keys → URLs)
--------------------------------- */
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

/* Helpers de pertenencia por prefijo */
function keyBelongsToServiceCover(key, serviceId) {
  return new RegExp(`^uploads\\/services\\/${String(serviceId)}\\/cover\\/`).test(String(key));
}
function keyBelongsToServicePhoto(key, serviceId) {
  return new RegExp(`^uploads\\/services\\/${String(serviceId)}\\/photos\\/`).test(String(key));
}

/**
 * GET /api/services?search=&page=1&pageSize=20&order=desc&sort=createdAt&categoryId=&userId=&city=
 */
router.get("/", optionalAuth, async (req, res, next) => {
  try {
    const {
      search = "",
      page = "1",
      pageSize = "20",
      sort = "createdAt",
      order = "desc",
      categoryId,
      userId, // alias antiguo; si llega, filtramos por providerId
      city,
    } = req.query;

    const p = Math.max(1, parseInt(String(page), 10) || 1);
    const size = Math.min(50, Math.max(1, parseInt(String(pageSize), 10) || 20));

    const where = {};
    const q = String(search || "").trim();
    if (q.length >= 2) {
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { city: { contains: q, mode: "insensitive" } },
      ];
    }
    if (categoryId) where.categoryId = String(categoryId);
    if (userId) where.providerId = String(userId);
    if (city) where.city = { contains: String(city), mode: "insensitive" };

    const allowedSort = new Set(["createdAt", "ratingAvg", "priceFrom", "title"]);
    const orderBy = {
      [allowedSort.has(String(sort)) ? String(sort) : "createdAt"]:
        String(order).toLowerCase() === "asc" ? "asc" : "desc",
    };

    const [total, rawItems] = await Promise.all([
      prisma.service.count({ where }),
      prisma.service.findMany({
        where,
        orderBy,
        skip: (p - 1) * size,
        take: size,
        select: {
          id: true,
          title: true,
          description: true,
          priceFrom: true,
          city: true,
          ratingAvg: true,
          createdAt: true,
          coverUrl: true,       // guardamos KEY S3
          coverThumbUrl: true,  // guardamos KEY S3
          category: { select: { id: true, name: true } },
          provider: { select: { id: true, name: true } },
        },
      }),
    ]);

    const items = rawItems.map(toAbsoluteService);
    res.json({ items, total, page: p, pageSize: size });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /api/services/:id
 */
router.get("/:id", optionalAuth, async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const svc = await prisma.service.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true } },
        provider: { select: { id: true, name: true } },
        reviews: { select: { id: true, rating: true, comment: true, createdAt: true } },
        images:  { select: { id: true, url: true, thumbUrl: true, createdAt: true } }, // keys S3
      },
    });
    if (!svc) return res.status(404).json({ message: "Servicio no encontrado" });
    res.json(toAbsoluteService(svc));
  } catch (e) {
    next(e);
  }
});

/**
 * POST /api/services  (proveedor autenticado)
 * Body: { title, description, priceFrom?, categoryId, city? }
 */
router.post("/", requireAuth, async (req, res, next) => {
  try {
    const { title, description, priceFrom, categoryId, city } = req.body || {};
    if (!title || !categoryId || !description) {
      return res.status(400).json({ message: "Faltan datos" });
    }

    const created = await prisma.service.create({
      data: {
        title: String(title).trim(),
        description: String(description || ""),
        priceFrom: priceFrom == null || priceFrom === "" ? null : Number(priceFrom),
        city: city ? String(city) : null,
        category: { connect: { id: String(categoryId) } },
        provider: { connect: { id: String(req.user.sub) } },
      },
      include: {
        category: { select: { id: true, name: true} },
        provider: { select: { id: true, name: true} },
      },
    });

    res.status(201).json(toAbsoluteService(created));
  } catch (e) {
    if (e?.code === "P2025") {
      return res.status(400).json({ message: "Categoría inválida" });
    }
    next(e);
  }
});

/**
 * PATCH /api/services/:id  (dueño/admin)
 * Permite cambiar campos simples y/o la categoría.
 */
router.patch("/:id", requireAuth, async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const svc = await prisma.service.findUnique({
      where: { id },
      select: { id: true, providerId: true },
    });
    if (!svc) return res.status(404).json({ message: "No existe" });

    // Solo dueño o admin
    if (svc.providerId !== req.user.sub && req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Prohibido" });
    }

    const { title, description, priceFrom, categoryId, city } = req.body || {};

    const data = {
      ...(title != null ? { title: String(title).trim() } : {}),
      ...(description != null ? { description: String(description) } : {}),
      ...(priceFrom !== undefined ? { priceFrom: priceFrom === "" ? null : Number(priceFrom) } : {}),
      ...(city != null ? { city: String(city) } : {}),
      ...(categoryId != null ? { category: { connect: { id: String(categoryId) } } } : {}),
    };

    const updated = await prisma.service.update({
      where: { id },
      data,
      include: {
        category: { select: { id: true, name: true } },
        provider: { select: { id: true, name: true } },
        images:  { select: { id: true, url: true, thumbUrl: true, createdAt: true } },
      },
    });

    res.json(toAbsoluteService(updated));
  } catch (e) {
    if (e?.code === "P2025") {
      return res.status(400).json({ message: "Categoría inválida" });
    }
    next(e);
  }
});

/* =========================================================
   Actualizar portada (cover) vía S3 keys (con validación S3)
   PUT /api/services/:id/cover
   Body JSON: { key: string, thumbKey?: string }
========================================================= */
router.put("/:id/cover", requireAuth, async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const { key, thumbKey } = req.body || {};
    if (!key) return res.status(400).json({ message: "Falta 'key' de S3 para la portada" });

    // La cover DEBE estar bajo .../cover/
    if (!keyBelongsToServiceCover(key, id) || (thumbKey && !keyBelongsToServiceCover(thumbKey, id))) {
      return res.status(400).json({ message: "La key no corresponde a este servicio (cover)" });
    }

    const svc = await prisma.service.findUnique({
      where: { id },
      select: { id: true, providerId: true, coverUrl: true, coverThumbUrl: true, title: true },
    });
    if (!svc) return res.status(404).json({ message: "No existe" });
    if (svc.providerId !== req.user.sub && req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Prohibido" });
    }

    // Validar objeto en S3 por kind
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

    // Borrar anteriores (best-effort)
    const tasks = [];
    if (svc.coverUrl && svc.coverUrl !== updated.coverUrl) tasks.push(deleteFromUploads(svc.coverUrl));
    if (svc.coverThumbUrl && svc.coverThumbUrl !== updated.coverThumbUrl) tasks.push(deleteFromUploads(svc.coverThumbUrl));
    if (tasks.length) Promise.allSettled(tasks).catch(() => {});

    res.json({
      ...updated,
      coverUrl: publicUrl(updated.coverUrl),
      coverThumbUrl: publicUrl(updated.coverThumbUrl),
    });
  } catch (e) {
    next(e);
  }
});

/* =========================================================
   Subir imágenes adicionales (vía S3 keys) con validación S3
   POST /api/services/:id/images
   Body JSON: { items: [{ key: string, thumbKey?: string }, ...] }
========================================================= */
router.post("/:id/images", requireAuth, async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const { items } = req.body || {};
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Envía 'items' con al menos una { key, thumbKey? }" });
    }

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

    // Validación de pertenencia por prefijo
    const clean = [];
    const seen = new Set();
    for (const it of items) {
      const k = it?.key ? String(it.key) : null;
      const tk = it?.thumbKey ? String(it.thumbKey) : null;
      if (!k) continue;
      if (!keyBelongsToServicePhoto(k, id) || (tk && !keyBelongsToServicePhoto(tk, id))) {
        return res.status(400).json({ message: "Alguna key no corresponde a este servicio (photos)" });
      }
      if (seen.has(k)) continue;
      seen.add(k);
      clean.push({ key: k, thumbKey: tk || null });
    }
    if (!clean.length) return res.status(400).json({ message: "Sin claves válidas para procesar" });

    // Validar en S3 (por kind)
    await Promise.all(
      clean.map(async ({ key, thumbKey }) => {
        await assertImageObject(String(key), { expectedKind: "service_photo" });
        if (thumbKey) await assertImageObject(String(thumbKey), { expectedKind: "service_photo" });
      })
    );

    // Crear en transacción
    const created = await prisma.$transaction(
      clean.map(({ key, thumbKey }) =>
        prisma.serviceImage.create({
          data: { serviceId: id, url: key, thumbUrl: thumbKey },
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
    next(e);
  }
});

/* =========================================================
   Eliminar imagen adicional
   DELETE /api/services/:id/images/:imageId  (dueño/admin)
========================================================= */
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

    // borrar objetos en S3
    if (img.url) await deleteFromUploads(img.url);
    if (img.thumbUrl) await deleteFromUploads(img.thumbUrl);

    await prisma.serviceImage.delete({ where: { id: imageId } });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

/**
 * DELETE /api/services/:id  (dueño/admin)
 * Elimina el servicio y sus imágenes (borra keys S3)
 */
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

    // borrar portada + imágenes en S3
    if (svc.coverUrl) await deleteFromUploads(svc.coverUrl);
    if (svc.coverThumbUrl) await deleteFromUploads(svc.coverThumbUrl);
    for (const img of svc.images) {
      if (img.url) await deleteFromUploads(img.url);
      if (img.thumbUrl) await deleteFromUploads(img.thumbUrl);
    }

    await prisma.service.delete({ where: { id } });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default router;
