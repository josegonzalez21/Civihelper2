// src/routes/provider.js
import express from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";

const router = express.Router();

// GET /api/provider/agenda - Obtener agenda del proveedor
router.get("/agenda", requireAuth, requireRole(["PROVIDER", "ADMIN"]), async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const providerId = req.user.sub;

    // Por ahora devuelve un array vacío hasta ajustar según tu Prisma schema
    const agenda = [];

    res.json({
      success: true,
      data: agenda,
    });
  } catch (error) {
    console.error("Error obteniendo agenda:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener la agenda",
    });
  }
});

// GET /api/provider/stats - Estadísticas del proveedor
router.get("/stats", requireAuth, requireRole(["PROVIDER", "ADMIN"]), async (req, res) => {
  try {
    const providerId = req.user.sub;

    // Por ahora devuelve stats vacías hasta ajustar según tu Prisma schema
    res.json({
      success: true,
      stats: {
        totalBookings: 0,
        todayBookings: 0,
        completedBookings: 0,
        totalRevenue: 0,
      },
    });
  } catch (error) {
    console.error("Error obteniendo estadísticas:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener estadísticas",
    });
  }
});

// GET /api/provider/metrics - Métricas del proveedor
router.get("/metrics", requireAuth, requireRole(["PROVIDER", "ADMIN"]), async (req, res) => {
  try {
    const providerId = req.user.sub;

    // Por ahora devuelve métricas vacías hasta ajustar según tu Prisma schema
    res.json({
      success: true,
      metrics: {
        totalServices: 0,
        activeServices: 0,
        totalViews: 0,
        totalClients: 0,
        averageRating: 0,
        totalReviews: 0,
      },
    });
  } catch (error) {
    console.error("Error obteniendo métricas:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener métricas",
    });
  }
});

export default router;