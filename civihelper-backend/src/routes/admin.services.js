// src/routes/admin.services.js
import express from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";
import {
  assertImageObject,
  deleteFromUploads,
  publicUrl,
} from "../lib/s3.js";

const router = express.Router();
const ensureAdmin = requireRole("ADMIN");

/* ===========================================
   Helpers
=========================================== */
function toAbsoluteService(svc) {
  if (!svc) return svc;
  const coverUrlAbs = svc.coverUrl ? publicUrl(svc.coverUrl) : null;
  const coverThumbUrlAbs = svc.coverThumbUrl ? publicUrl(svc.coverThumbUrl) : null;
  const images = (svc.images || []).map((img) => ({
    ...img,
    url: img.url ? publicUrl(img.url) : null,
    thumbUrl: img.thumbUrl ? publicUrl(img.thumbUrl) : null,
  }));
  return { ...svc, coverUrl: coverUrlAbs, coverThumbUrl: coverThumbUrlAbs, images };
}

function keyBelongsToService(key, serviceId, kind) {
  const sid = String(serviceId);
  const s = String(key);
  if (kind === "service_cover") {
    return new RegExp(`^uploads\\/services\\/${sid}\\/cover\\/`).test(s);
  }
  if (kind === "service_photo") {
    return new RegExp(`^uploads\\/services\\/${sid}\\/photos\\/`).test(s);
  }
  return false;
}

/* ===========================================
   Schemas (Zod)
=========================================== */
const priceFromSchema = z
  .preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().int().min(1).nullable().optional());

const createBodySchema = z.object({
  title: z.string().trim().min(3, "title es requerido (≥3)").max(120),
  description: z.string().trim().max(2000).optional(),
  priceFrom: priceFromSchema,
  city: z.string().trim().min(2).max(100).optional(),
  serviceTypeId: z.string().trim().min(1).optional(),
  coverKey: z.string().trim().min(3).optional(),
  photosKeys: z.array(z.string().trim().min(3)).max(24).optional().default([]),
});

const updateBodySchema = z.object({
  title: z.string().trim().min(3).max(120).optional(),
  description: z.string().trim().max(2000).optional(),
  priceFrom: priceFromSchema,
  city: z.string().trim().min(2).max(100).optional().nullable(),
  serviceTypeId: z.string().trim().optional().nullable(),
  newCoverKey: z.string().trim().min(3).optional(),
  newPhotosKeys: z.array(z.string().trim().min(3)).max(30).optional(), // REEMPLAZA galería si se envía
});

/* =========================================================
   POST /api/admin/services  [ADMIN]
   Crea servicio curado por admin usando S3 keys
========================================================= */
router.post("/", requireAuth, ensureAdmin, async (req, res, next) => {
  try {
    const { title, description, priceFrom, city, serviceTypeId, coverKey, photosKeys } =
      createBodySchema.parse(req.body ?? {});
    if (!Array.isArray(photosKeys)) {
      return res.status(400).json({ message: "photosKeys debe ser un array" });
    }

    // 1) Crear el servicio (sin imágenes aún)
    const created = await prisma.service.create({
      data: {
        title: title.trim(),
        description: description ? String(description).trim() : "",
        priceFrom: priceFrom ?? null,
        city: city ? String(city).trim() : null,
        adminCreated: true,
        serviceTypeId: serviceTypeId ? String(serviceTypeId) : null,
      },
    });

    const id = created.id;

    // 2) Validar portada si viene
    let coverUrl = null;
    if (coverKey) {
      await assertImageObject(String(coverKey), { expectedKind: "service_cover" });
      if (!keyBelongsToService(coverKey, id, "service_cover")) {
        return res.status(400).json({ message: "coverKey no corresponde a este servicio" });
      }
      coverUrl = String(coverKey); // guardar KEY
    }

    // 3) Validar fotos si vienen
    const validPhotoKeys = [];
    for (const k of photosKeys) {
      await assertImageObject(String(k), { expectedKind: "service_photo" });
      if (!keyBelongsToService(k, id, "service_photo")) {
        return res.status(400).json({ message: `photoKey no corresponde a este servicio: ${k}` });
      }
      validPhotoKeys.push(String(k));
    }

    // 4) Persistir claves de imágenes
    if (coverUrl || validPhotoKeys.length) {
      await prisma.$transaction(async (tx) => {
        if (coverUrl) {
          await tx.service.update({ where: { id }, data: { coverUrl, coverThumbUrl: null } });
        }
        if (validPhotoKeys.length) {
          await tx.serviceImage.createMany({
            data: validPhotoKeys.map((k) => ({ serviceId: id, url: k, thumbUrl: null })),
          });
        }
      });
    }

    // 5) Responder completo
    const out = await prisma.service.findUnique({
      where: { id },
      include: { serviceType: true, images: true },
    });
    return res.status(201).json(toAbsoluteService(out));
  } catch (e) {
    if (e?.name === "ZodError") {
      return res.status(400).json({ message: "Datos inválidos", details: e.flatten() });
    }
    if (e?.code === "P2025") return res.status(400).json({ message: "serviceTypeId inválido" });
    next(e);
  }
});

/* =========================================================
   GET /api/admin/services  [ADMIN]
   Lista todos los curados por admin (sin paginación)
========================================================= */
router.get("/", requireAuth, ensureAdmin, async (_req, res, next) => {
  try {
    const items = await prisma.service.findMany({
      where: { adminCreated: true },
      orderBy: { createdAt: "desc" },
      include: { serviceType: true, images: true },
    });
    res.json(items.map(toAbsoluteService));
  } catch (e) {
    next(e);
  }
});

/* =========================================================
   PUT /api/admin/services/:id  [ADMIN]
   Edita datos y reemplaza portada/galería si se envían keys
========================================================= */
router.put("/:id", requireAuth, ensureAdmin, async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const body = updateBodySchema.parse(req.body ?? {});

    const prev = await prisma.service.findUnique({
      where: { id },
      include: { images: true },
    });
    if (!prev || !prev.adminCreated) return res.status(404).json({ message: "Servicio no encontrado" });

    const { title, description, priceFrom, city, serviceTypeId, newCoverKey, newPhotosKeys } = body;

    // Validaciones de keys (si vienen)
    if (newCoverKey) {
      await assertImageObject(String(newCoverKey), { expectedKind: "service_cover" });
      if (!keyBelongsToService(newCoverKey, id, "service_cover")) {
        return res.status(400).json({ message: "newCoverKey no corresponde a este servicio" });
      }
    }
    if (newPhotosKeys != null) {
      if (!Array.isArray(newPhotosKeys)) {
        return res.status(400).json({ message: "newPhotosKeys debe ser un array" });
      }
      for (const k of newPhotosKeys) {
        await assertImageObject(String(k), { expectedKind: "service_photo" });
        if (!keyBelongsToService(k, id, "service_photo")) {
          return res.status(400).json({ message: `photoKey no corresponde a este servicio: ${k}` });
        }
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Reemplazo de portada si corresponde (y borrado best-effort del anterior)
      if (newCoverKey && newCoverKey !== prev.coverUrl) {
        if (prev.coverUrl) await deleteFromUploads(prev.coverUrl);
        if (prev.coverThumbUrl) await deleteFromUploads(prev.coverThumbUrl);
      }

      // Reemplazo total de galería si corresponde
      if (Array.isArray(newPhotosKeys)) {
        for (const p of prev.images) {
          if (p.url) await deleteFromUploads(p.url);
          if (p.thumbUrl) await deleteFromUploads(p.thumbUrl);
        }
        await tx.serviceImage.deleteMany({ where: { serviceId: id } });
        if (newPhotosKeys.length) {
          await tx.serviceImage.createMany({
            data: newPhotosKeys.map((k) => ({ serviceId: id, url: String(k), thumbUrl: null })),
          });
        }
      }

      // Actualiza datos base
      return tx.service.update({
        where: { id },
        data: {
          ...(title !== undefined ? { title: String(title).trim() } : {}),
          ...(description !== undefined ? { description: String(description).trim() } : {}),
          ...(priceFrom !== undefined ? { priceFrom: priceFrom } : {}),
          ...(city !== undefined ? { city: city ? String(city).trim() : null } : {}),
          ...(serviceTypeId !== undefined ? { serviceTypeId: serviceTypeId ? String(serviceTypeId) : null } : {}),
          ...(newCoverKey ? { coverUrl: String(newCoverKey), coverThumbUrl: null } : {}),
        },
        include: { serviceType: true, images: true },
      });
    });

    return res.json(toAbsoluteService(updated));
  } catch (e) {
    if (e?.name === "ZodError") {
      return res.status(400).json({ message: "Datos inválidos", details: e.flatten() });
    }
    if (e?.code === "P2025") return res.status(404).json({ message: "Servicio no encontrado" });
    next(e);
  }
});

/* =========================================================
   DELETE /api/admin/services/:id  [ADMIN]
   Elimina servicio + assets S3
========================================================= */
router.delete("/:id", requireAuth, ensureAdmin, async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const svc = await prisma.service.findUnique({
      where: { id },
      include: { images: true },
    });
    if (!svc || !svc.adminCreated) return res.status(404).json({ message: "Servicio no encontrado" });

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
