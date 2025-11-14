import express from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";

const router = express.Router();
const ensureAdmin = requireRole("ADMIN");

/**
 * GET /api/admin/metrics
 * Devuelve métricas básicas. Si algún modelo no existe, devuelve 0 para esa métrica.
 */
router.get("/", requireAuth, ensureAdmin, async (_req, res, next) => {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    const safeCount = async (modelName, args = {}) => {
      if (!prisma[modelName]) return 0;
      return prisma[modelName].count(args);
    };

    const users = await safeCount("user");
    const providers = await safeCount("user", { where: { role: "PROVIDER" } }).catch(() => 0);
    const services = await safeCount("service");
    const bookingsToday = await safeCount("booking", {
      where: {
        createdAt: { gte: startOfToday, lt: endOfToday },
      },
    });
    const pendingReports = await safeCount("report", { where: { status: "PENDING" } });

    // revenue30d: intentar sumar pagos si existe modelo 'payment' o devolver 0
    let revenue30d = 0;
    if (prisma.payment) {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const agg = await prisma.payment.aggregate({
        where: { createdAt: { gte: since } },
        _sum: { amount: true },
      });
      revenue30d = Number(agg._sum?.amount ?? 0);
    }

    res.json({
      users,
      providers,
      services,
      bookingsToday,
      pendingReports,
      revenue30d,
    });
  } catch (e) {
    next(e);
  }
});

export default router;