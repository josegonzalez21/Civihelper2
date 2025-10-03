// src/routes/categories.js
import express from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";
import {
  publicUrl,
  deleteFromUploads,
  assertImageObject,
} from "../lib/s3.js";

const ensureAdmin = requireRole("ADMIN");
const router = express.Router();

// Enum válido (match prisma)
const SECTORS = new Set(["PUBLIC", "PRIVATE", "NGO", "EDUCATION", "HEALTH", "OTHER"]);

function parseBool(val, fallback) {
  if (typeof val === "boolean") return val;
  if (typeof val === "string") {
    if (val.toLowerCase() === "true") return true;
    if (val.toLowerCase() === "false") return false;
  }
  return fallback;
}

/* -------------------------------
   Helper: absolutiza URLs imagen
-------------------------------- */
function toAbsolute(entity) {
  if (!entity) return entity;
  return {
    ...entity,
    // En BD guardamos KEYS (imageUrl/imageThumbUrl). Aquí exponemos URLs públicas:
    imageUrl: entity.imageUrl ? publicUrl(entity.imageUrl) : null,
    imageThumbUrl: entity.imageThumbUrl ? publicUrl(entity.imageThumbUrl) : null,
  };
}

/**
 * GET /api/categories
 * Lista plana (útil para buscador).
 * Soporta ?search=&page=&pageSize=&sector=PUBLIC|...&onlyRoots=true|false&parentId=<id>
 */
router.get("/", async (req, res, next) => {
  try {
    const {
      search = "",
      page,
      pageSize,
      sector,
      onlyRoots,
      parentId,
    } = req.query;

    const where = {
      AND: [
        { isActive: true },
        search ? { name: { contains: String(search), mode: "insensitive" } } : {},
        sector && SECTORS.has(String(sector)) ? { sector: String(sector) } : {},
        parseBool(onlyRoots, false) ? { parentId: null } : {},
        parentId ? { parentId: String(parentId) } : {},
      ],
    };

    // Paginado
    if (page && pageSize) {
      const take = Math.min(Number(pageSize) || 20, 100);
      const skip = Math.max(((Number(page) || 1) - 1) * take, 0);

      const [items, total] = await Promise.all([
        prisma.category.findMany({
          where,
          orderBy: [{ parentId: "asc" }, { name: "asc" }],
          skip,
          take,
          select: {
            id: true,
            name: true,
            parentId: true,
            isActive: true,
            sector: true,
            imageUrl: true,
            imageThumbUrl: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
        prisma.category.count({ where }),
      ]);
      return res.json({
        items: items.map(toAbsolute),
        total,
        page: Number(page),
        pageSize: take,
      });
    }

    const items = await prisma.category.findMany({
      where,
      orderBy: [{ parentId: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        parentId: true,
        isActive: true,
        sector: true,
        imageUrl: true,
        imageThumbUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return res.json(items.map(toAbsolute));
  } catch (e) {
    next(e);
  }
});

/** GET /api/categories/tree : Áreas raíz con sus derivados */
router.get("/tree", async (_req, res, next) => {
  try {
    const roots = await prisma.category.findMany({
      where: { parentId: null, isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        parentId: true,
        isActive: true,
        sector: true,
        imageUrl: true,
        imageThumbUrl: true,
        createdAt: true,
        updatedAt: true,
        children: {
          where: { isActive: true },
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
            parentId: true,
            isActive: true,
            sector: true,
            imageUrl: true,
            imageThumbUrl: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });
    const toAbsTree = (cat) => ({
      ...toAbsolute(cat),
      children: (cat.children || []).map(toAbsolute),
    });
    res.json(roots.map(toAbsTree));
  } catch (e) {
    next(e);
  }
});

/** GET /api/categories/roots : solo áreas (root) */
router.get("/roots", async (_req, res, next) => {
  try {
    const roots = await prisma.category.findMany({
      where: { parentId: null, isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        parentId: true,
        isActive: true,
        sector: true,
        imageUrl: true,
        imageThumbUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    res.json(roots.map(toAbsolute));
  } catch (e) {
    next(e);
  }
});

/** GET /api/categories/:id/children : derivados de un área */
router.get("/:id/children", async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const children = await prisma.category.findMany({
      where: { parentId: id, isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        parentId: true,
        isActive: true,
        sector: true,
        imageUrl: true,
        imageThumbUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    res.json(children.map(toAbsolute));
  } catch (e) {
    next(e);
  }
});

/**
 * POST /api/categories
 * Crea Área (sin parentId) o Derivado (con parentId) [ADMIN]
 * SOLO datos. Las imágenes se suben con endpoints dedicados.
 * Body JSON: { name, parentId?, isActive?, sector? }
 */
router.post("/", requireAuth, ensureAdmin, async (req, res, next) => {
  try {
    const { name, parentId = null } = req.body || {};
    const isActive = parseBool(req.body?.isActive, true);
    const sector = SECTORS.has(String(req.body?.sector)) ? String(req.body?.sector) : "OTHER";

    if (!name || typeof name !== "string") {
      return res.status(400).json({ message: "name es requerido" });
    }

    if (parentId) {
      const parent = await prisma.category.findUnique({ where: { id: String(parentId) } });
      if (!parent) return res.status(400).json({ message: "parentId inválido" });
    }

    const created = await prisma.category.create({
      data: {
        name: name.trim(),
        parentId: parentId ? String(parentId) : null,
        isActive: Boolean(isActive),
        sector,
      },
      select: {
        id: true,
        name: true,
        parentId: true,
        isActive: true,
        sector: true,
        imageUrl: true,
        imageThumbUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.status(201).json(toAbsolute(created));
  } catch (e) {
    if (e?.code === "P2002") {
      return res.status(409).json({ message: "Ya existe una categoría con ese nombre en este nivel" });
    }
    next(e);
  }
});

/**
 * PUT /api/categories/:id
 * Edita nombre/sector/parent/isActive [ADMIN]
 * (las imágenes se actualizan con endpoints dedicados)
 * Body JSON: { name?, parentId?, isActive?, sector? }
 */
router.put("/:id", requireAuth, ensureAdmin, async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const prev = await prisma.category.findUnique({ where: { id } });
    if (!prev) return res.status(404).json({ message: "Categoría no encontrada" });

    const { name, parentId } = req.body || {};

    if (parentId === id) {
      return res.status(400).json({ message: "Una categoría no puede ser su propio padre" });
    }
    if (parentId) {
      const parent = await prisma.category.findUnique({ where: { id: String(parentId) } });
      if (!parent) return res.status(400).json({ message: "parentId inválido" });
    }

    const updates = {
      ...(typeof name === "string" ? { name: name.trim() } : {}),
      ...(parentId === undefined ? {} : { parentId: parentId ? String(parentId) : null }),
      ...(parseBool(req.body?.isActive, undefined) !== undefined
        ? { isActive: parseBool(req.body?.isActive, undefined) }
        : {}),
      ...(SECTORS.has(String(req.body?.sector)) ? { sector: String(req.body?.sector) } : {}),
    };

    const updated = await prisma.category.update({
      where: { id },
      data: updates,
      select: {
        id: true,
        name: true,
        parentId: true,
        isActive: true,
        sector: true,
        imageUrl: true,
        imageThumbUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json(toAbsolute(updated));
  } catch (e) {
    if (e?.code === "P2002") {
      return res.status(409).json({ message: "Ya existe una categoría con ese nombre en este nivel" });
    }
    if (e?.code === "P2025") {
      return res.status(404).json({ message: "Categoría no encontrada" });
    }
    next(e);
  }
});

/* =========================================================
   PUT /api/categories/:id/icon
   Body: { key: string }
   Valida que la key sea imagen y pertenezca a esta categoría.
   Guarda en imageUrl (icono “pequeño”).
========================================================= */
router.put("/:id/icon", requireAuth, ensureAdmin, async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const { key } = req.body || {};
    if (!key) return res.status(400).json({ message: "Falta 'key' de S3 para el icono" });

    const isUnder = new RegExp(`^uploads\\/categories\\/${id}\\/icon\\/`).test(String(key));
    if (!isUnder) return res.status(400).json({ message: "La key no corresponde a esta categoría" });

    const cat = await prisma.category.findUnique({
      where: { id },
      select: { id: true, name: true, imageUrl: true, imageThumbUrl: true },
    });
    if (!cat) return res.status(404).json({ message: "Categoría no existe" });

    // Valida en S3: existencia/MIME/tamaño por kind (2 MB para category_icon en lib/s3.js)
    await assertImageObject(String(key), { expectedKind: "category_icon" });

    const updated = await prisma.category.update({
      where: { id },
      data: { imageUrl: String(key) },
      select: { id: true, name: true, imageUrl: true, imageThumbUrl: true },
    });

    // Borrar anterior si cambió (best-effort)
    const prev = cat.imageUrl;
    if (prev && prev !== updated.imageUrl) {
      Promise.allSettled([deleteFromUploads(prev)]).catch(() => {});
    }

    res.json(toAbsolute(updated));
  } catch (e) {
    next(e);
  }
});

/* =========================================================
   PUT /api/categories/:id/cover
   Body: { key: string, thumbKey?: string }
   Valida imagen y pertenencia.
   Guarda en imageUrl (y opcionalmente imageThumbUrl).
========================================================= */
router.put("/:id/cover", requireAuth, ensureAdmin, async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const { key, thumbKey } = req.body || {};
    if (!key) return res.status(400).json({ message: "Falta 'key' de S3 para la portada" });

    const isUnder = new RegExp(`^uploads\\/categories\\/${id}\\/cover\\/`).test(String(key));
    if (!isUnder) return res.status(400).json({ message: "La key no corresponde a esta categoría" });

    const cat = await prisma.category.findUnique({
      where: { id },
      select: { id: true, name: true, imageUrl: true, imageThumbUrl: true },
    });
    if (!cat) return res.status(404).json({ message: "Categoría no existe" });

    // Valida: existencia/MIME/tamaño por kind (8 MB para category_cover en lib/s3.js)
    await assertImageObject(String(key), { expectedKind: "category_cover" });
    if (thumbKey) {
      // Si usas miniaturas bajo el mismo prefijo de cover, también serán category_cover
      await assertImageObject(String(thumbKey), { expectedKind: "category_cover" });
    }

    const updated = await prisma.category.update({
      where: { id },
      data: {
        imageUrl: String(key),
        ...(thumbKey ? { imageThumbUrl: String(thumbKey) } : {}),
      },
      select: { id: true, name: true, imageUrl: true, imageThumbUrl: true },
    });

    const prevs = [];
    if (cat.imageUrl && cat.imageUrl !== updated.imageUrl) prevs.push(deleteFromUploads(cat.imageUrl));
    if (thumbKey && cat.imageThumbUrl && cat.imageThumbUrl !== updated.imageThumbUrl) {
      prevs.push(deleteFromUploads(cat.imageThumbUrl));
    }
    if (prevs.length) Promise.allSettled(prevs).catch(() => {});

    res.json(toAbsolute(updated));
  } catch (e) {
    next(e);
  }
});

/** DELETE /api/categories/:id : soft-delete (isActive=false) [ADMIN] */
router.delete("/:id", requireAuth, ensureAdmin, async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const updated = await prisma.category.update({
      where: { id },
      data: { isActive: false },
      select: { id: true },
    });
    res.json({ ok: true, softDeleted: updated.id });
  } catch (e) {
    if (e?.code === "P2025") return res.status(404).json({ message: "Categoría no encontrada" });
    next(e);
  }
});

export default router;
