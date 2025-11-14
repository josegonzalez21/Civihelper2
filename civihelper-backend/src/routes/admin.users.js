import express from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";

const router = express.Router();
const ensureAdmin = requireRole("ADMIN");

// Campos seguros para listados (evita password/passwordHash)
const userSafeSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  avatarKey: true,
  avatarUrl: true,
  avatarThumbUrl: true,
  blocked: true,
  tokenVersion: true,
  createdAt: true,
  updatedAt: true,
};

/**
 * GET /api/admin/users?limit=10&page=1&sort=createdAt:desc
 */
router.get("/", requireAuth, ensureAdmin, async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? req.query.pageSize ?? "10"), 10) || 10));

    const [sortField, sortDir] = String(req.query.sort ?? "createdAt:desc").split(":");
    const orderBy = { [sortField || "createdAt"]: sortDir === "asc" ? "asc" : "desc" };

    // filtros opcionales (role, q por nombre/email, etc.)
    const where = {};
    if (req.query.role) where.role = String(req.query.role).toUpperCase();
    if (req.query.q) {
      const q = String(req.query.q).trim();
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
      ];
    }

    const skip = (page - 1) * pageSize;

    // ❗ OJO: count SIN skip/take
    const [total, items] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: userSafeSelect,    // ✅ solo campos seguros
        orderBy,
        skip,
        take: pageSize,
      }),
    ]);

    res.set("Cache-Control", "no-store");
    return res.status(200).json({
      items,
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      sort: { field: Object.keys(orderBy)[0], dir: orderBy[Object.keys(orderBy)[0]] },
    });
  } catch (e) {
    next(e);
  }
});

export default router;
