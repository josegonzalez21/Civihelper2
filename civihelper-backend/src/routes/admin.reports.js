import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";

const router = express.Router();
const ensureAdmin = requireRole("ADMIN");

/**
 * GET /api/admin/reports
 * Placeholder: devuelve lista vacía hasta implementar cola real
 */
router.get("/", requireAuth, ensureAdmin, async (_req, res, _next) => {
  res.json({ items: [], total: 0, page: 1, pageSize: 10 });
});

export default router;