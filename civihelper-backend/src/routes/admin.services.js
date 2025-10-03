// src/routes/admin.services.js
import express from "express";
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

/* ---------------------------------------
   Helper: absolutiza portada e imágenes
--------------------------------------- */
function toAbsoluteService(svc) {
  if (!svc) return svc;
  const coverUrlAbs = svc.coverUrl ? publicUrl(svc.coverUrl) : null;
  const coverThumbUrlAbs = svc.coverThumbUrl ? publicUrl(svc.coverThumbUrl) : null; // si no usas thumbs, quedará null
  const images = (svc.images || []).map((img) => ({
    ...img,
    url: img.url ? publicUrl(img.url) : null,
    thumbUrl: img.thumbUrl ? publicUrl(img.thumbUrl) : null,
  }));
  return { ...svc, coverUrl: coverUrlAbs, coverThumbUrl: coverThumbUrlAbs, images };
}

/* ---------------------------------------
   Util: verifica que la key pertenezca al serviceId
--------------------------------------- */
function keyBelongsToService(key, serviceId, kind) {
  const sid = String(serviceId);
  if (kind === "service_cover") {
    return new RegExp(`^uploads\\/services\\/${sid}\\/cover\\/`).test(String(key));
  }
  if (kind === "service_photo") {
    return new RegExp(`^uploads\\/services\\/${sid}\\/photos\\/`).test(String(key));
  }
  return false;
}

/* =========================================================
   Crear servicio curado por ADMIN (S3 por keys)
   POST /api/admin/services
   Body JSON:
     {
       title (req),
       description?, priceFrom?, city?, serviceTypeId?,
       coverKey?,            // opcional (kind service_cover)
       photosKeys? []        // opcional (kind service_photo)
     }
========================================================= */
router.post("/", requireAuth, ensureAdmin, async (req, res, next) => {
  try {
    const { title, description, priceFrom, city, serviceTypeId, coverKey, photosKeys = [] } = req.body || {};
    if (!title) return res.status(400).json({ message: "title es requerido" });
    if (!Array.isArray(photosKeys)) return res.status(400).json({ message: "photosKeys debe ser un array" });

    // 1) Crear el servicio (sin imágenes aún)
    const created = await prisma.service.create({
      data: {
        title: String(title).trim(),
        description: description ? String(description).trim() : "",
        priceFrom: priceFrom != null && String(priceFrom) !== "" ? Number(priceFrom) : null,
        city: city ? String(city).trim() : null,
        adminCreated: true,
        serviceTypeId: serviceTypeId ? String(serviceTypeId) : null,
      },
    });

    const id = created.id; // puede ser string/uuid en tu esquema

    // 2) Si viene portada, validar y guardar
    let coverUrl = null;
    if (coverKey) {
      await assertImageObject(String(coverKey), { expectedKind: "service_cover" });
      if (!keyBelongsToService(coverKey, id, "service_cover")) {
        return res.status(400).json({ message: "coverKey no corresponde a este servicio" });
      }
      coverUrl = String(coverKey); // guardamos la KEY
    }

    // 3) Si vienen fotos, validar y crear registros
    const validPhotoKeys = [];
    for (const k of photosKeys) {
      await assertImageObject(String(k), { expectedKind: "service_photo" });
      if (!keyBelongsToService(k, id, "service_photo")) {
        return res.status(400).json({ message: `photoKey no corresponde a este servicio: ${k}` });
      }
      validPhotoKeys.push(String(k));
    }

    // 4) Persistir cambios de imágenes si hay algo que guardar
    if (coverUrl || validPhotoKeys.length) {
      await prisma.$transaction(async (tx) => {
        if (coverUrl) {
          await tx.service.update({ where: { id }, data: { coverUrl } });
        }
        if (validPhotoKeys.length) {
          await tx.serviceImage.createMany({
            data: validPhotoKeys.map((k) => ({ serviceId: id, url: k, thumbUrl: null })),
          });
        }
      });
    }

    // 5) Responder con servicio completo
    const out = await prisma.service.findUnique({
      where: { id },
      include: { serviceType: true, images: true },
    });
    return res.status(201).json(toAbsoluteService(out));
  } catch (e) {
    if (e?.code === "P2025") return res.status(400).json({ message: "serviceTypeId inválido" });
    next(e);
  }
});

/* =========================================================
   Listar curados por admin
   GET /api/admin/services
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
   Editar servicio curado (S3 por keys)
   PUT /api/admin/services/:id
   Body JSON:
     {
       title?, description?, priceFrom?, city?, serviceTypeId?,
       newCoverKey?,           // si envías, reemplaza portada
       newPhotosKeys? []       // si envías, REEMPLAZA GALERÍA COMPLETA
     }
========================================================= */
router.put("/:id", requireAuth, ensureAdmin, async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const prev = await prisma.service.findUnique({
      where: { id },
      include: { images: true },
    });
    if (!prev || !prev.adminCreated) return res.status(404).json({ message: "Servicio no encontrado" });

    const { title, description, priceFrom, city, serviceTypeId, newCoverKey, newPhotosKeys } = req.body || {};

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
      // Reemplazo de portada si corresponde
      if (newCoverKey && newCoverKey !== prev.coverUrl) {
        // borra la portada anterior (best-effort)
        if (prev.coverUrl) await deleteFromUploads(prev.coverUrl);
        if (prev.coverThumbUrl) await deleteFromUploads(prev.coverThumbUrl);
      }

      // Reemplazo total de galería si corresponde
      if (Array.isArray(newPhotosKeys)) {
        // borra archivos antiguos
        for (const p of prev.images) {
          if (p.url) await deleteFromUploads(p.url);
          if (p.thumbUrl) await deleteFromUploads(p.thumbUrl);
        }
        // borra registros
        await tx.serviceImage.deleteMany({ where: { serviceId: id } });
        // crea nuevos
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
          ...(title != null ? { title: String(title).trim() } : {}),
          ...(description != null ? { description: String(description).trim() } : {}),
          ...(priceFrom != null ? { priceFrom: String(priceFrom) === "" ? null : Number(priceFrom) } : {}),
          ...(city != null ? { city: String(city).trim() } : {}),
          ...(serviceTypeId != null ? { serviceTypeId: serviceTypeId ? String(serviceTypeId) : null } : {}),
          ...(newCoverKey ? { coverUrl: String(newCoverKey), coverThumbUrl: null } : {}), // dejamos thumbs en null
        },
        include: { serviceType: true, images: true },
      });
    });

    return res.json(toAbsoluteService(updated));
  } catch (e) {
    if (e?.code === "P2025") return res.status(404).json({ message: "Servicio no encontrado" });
    next(e);
  }
});

/* =========================================================
   Eliminar servicio curado
   DELETE /api/admin/services/:id
   - Elimina archivos S3 de portada y fotos
   - Luego elimina el servicio (ServiceImage con onDelete: Cascade o manual)
========================================================= */
router.delete("/:id", requireAuth, ensureAdmin, async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const svc = await prisma.service.findUnique({
      where: { id },
      include: { images: true },
    });
    if (!svc || !svc.adminCreated) return res.status(404).json({ message: "Servicio no encontrado" });

    // Borrar archivos de portada e imágenes
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
