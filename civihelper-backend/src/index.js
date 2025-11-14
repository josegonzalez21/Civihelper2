// src/index.js
import "dotenv/config";
import fs from "fs";
import path from "path";
import express from "express";
import cors from "cors";
import compression from "compression";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { createServer } from "http";

// Socket.io
import { initializeSocket, closeSocket } from "./lib/socket.js";

// Seguridad centralizada
import { securityMiddleware } from "./middleware/security.js";

// Rate limiters
import {
  authLimiter as _authLimiter,
  generalLimiter as _generalLimiter,
} from "./middleware/rateLimit.js";
import {
  uploadSignLimiter,
  uploadGetLimiter,
} from "./middleware/limits.js";

// Rutas (mantén todas las existentes)
import authRoutes from "./routes/auth.js";
import passwordRoutes from "./routes/auth.password.js";
import meRoutes from "./routes/me.js";
import servicesRoutes from "./routes/services.js";
import categoriesRoutes from "./routes/categories.js";
import favoritesRoutes from "./routes/favorites.js";
import promotionsPublic from "./routes/promotions.js";

// ADMIN
import adminServiceTypes from "./routes/admin.serviceTypes.js";
import adminServices from "./routes/admin.services.js";
import featuredRoutes from "./routes/featured.js";
import promotionsAdmin from "./routes/admin.promotions.js";
import adminReports from "./routes/admin.reports.js";
import adminMetrics from "./routes/admin.metrics.js";
import adminUsers from "./routes/admin.users.js";

// Provider
import providerRoutes from "./routes/provider.js";

// Uploads
import uploadsRouter from "./routes/uploads.js";

// Chat routes (nuevo)
import chatRoutes from "./routes/chat.js";

// Prisma
import { prisma, shutdownPrisma } from "./lib/prisma.js";

const app = express();
const httpServer = createServer(app);
const isProd = process.env.NODE_ENV === "production";

/* ============================================================================
   Socket.io Initialization
============================================================================ */
initializeSocket(httpServer);

/* ============================================================================
   Parsers
============================================================================ */
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.disable("x-powered-by");
app.set("etag", false);
app.set("trust proxy", Number(process.env.TRUST_PROXY || 1));

/* ============================================================================
   CORS
============================================================================ */
function parseCorsOrigin() {
  const raw = process.env.CORS_ORIGIN;
  if (!raw || raw === "*") return true;
  const list = raw.split(",").map((s) => s.trim()).filter(Boolean);
  return list.length === 1 ? list[0] : list;
}
app.use(
  cors({
    origin: parseCorsOrigin(),
    credentials: true,
  })
);

/* ============================================================================
   Seguridad (Helmet)
============================================================================ */
app.use(securityMiddleware());

/* ============================================================================
   Cookies
============================================================================ */
app.use(cookieParser());

/* ============================================================================
   Logs
============================================================================ */
app.use(
  morgan(isProd ? "combined" : "dev", {
    skip: (req) =>
      req.path === "/healthz" ||
      req.path === "/livez" ||
      req.path === "/readyz",
  })
);

/* ============================================================================
   Healthchecks
============================================================================ */
app.get("/", (_req, res) => res.status(200).send("CiviHelper API"));
app.get("/healthz", (_req, res) => res.json({ ok: true }));
app.get("/livez", (_req, res) => res.status(200).end());
app.get("/readyz", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true });
  } catch {
    res.status(500).json({ ok: false });
  }
});

/* ============================================================================
   Archivos estáticos
============================================================================ */
if (String(process.env.SERVE_UPLOADS || "1") === "1") {
  const UPLOAD_DIR =
    process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");
  try {
    if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  } catch (e) {
    if (!isProd) console.warn("[uploads] no se pudo crear la carpeta:", e?.message || e);
  }
  app.use(
    "/uploads",
    express.static(UPLOAD_DIR, {
      etag: true,
      maxAge: "365d",
      immutable: true,
      setHeaders(res) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      },
    })
  );
}

/* ============================================================================
   Compresión
============================================================================ */
app.use(compression());

/* ============================================================================
   No-cache en la API
============================================================================ */
app.use((req, res, next) => {
  if (req.path.startsWith("/api")) {
    res.setHeader("Cache-Control", "no-store");
    res.removeHeader("ETag");
    res.removeHeader("Last-Modified");
  }
  next();
});

/* ============================================================================
   Rate limit
============================================================================ */
const useRateLimit = String(process.env.DEV_RATE_LIMIT_OFF || "0") !== "1";
const pass = (_req, _res, next) => next();
const authLimiter = useRateLimit ? _authLimiter : pass;
const generalLimiter = useRateLimit ? _generalLimiter : pass;
const _uploadSignLimiter = useRateLimit ? uploadSignLimiter : pass;
const _uploadGetLimiter = useRateLimit ? uploadGetLimiter : pass;

/* ============================================================================
   Rutas
============================================================================ */
// Auth
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/auth/password", authLimiter, passwordRoutes);

// General limiter
app.use("/api", generalLimiter);

// Rutas principales
app.use("/api/me", meRoutes);
app.use("/api/provider", providerRoutes);
app.use("/api/services", servicesRoutes);
app.use("/api/categories", categoriesRoutes);
app.use("/api/favorites", favoritesRoutes);

// Chat (nuevo)
app.use("/api/chat", chatRoutes);

// ADMIN
app.use("/api/admin/promotions", promotionsAdmin);
app.use("/api/admin/reports", adminReports);
app.use("/api/admin/services", adminServices);
app.use("/api/admin/service-types", adminServiceTypes);
app.use("/api/admin/users", adminUsers);
app.use("/api/admin/metrics", adminMetrics);

// Públicos
app.use("/api/featured", featuredRoutes);
app.use("/api/promotions", promotionsPublic);

// Uploads
app.use("/api/uploads/sign", _uploadSignLimiter);
app.use("/api/uploads/sign-get", _uploadGetLimiter);
app.use("/api/uploads", uploadsRouter);

/* ============================================================================
   Manejo de errores
============================================================================ */
app.use((err, _req, res, _next) => {
  if (err?.name === "ZodError") {
    return res.status(422).json({ message: "Datos inválidos", details: err.flatten() });
  }
  const status = err?.status || 500;
  const code = err?.code || "INTERNAL_ERROR";
  if (status >= 500) console.error(err);
  res.set("Cache-Control", "no-store");
  return res.status(status).json({ message: err?.message || "Error interno", code });
});

/* ============================================================================
   Server (Cambio importante: usar httpServer en lugar de app.listen)
============================================================================ */
const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || "0.0.0.0";

httpServer.listen(PORT, HOST, () => {
  console.log(`Server listening on http://${HOST}:${PORT}`);
  console.log(`Socket.io ready on ws://${HOST}:${PORT}`);
});

/* ============================================================================
   Graceful shutdown
============================================================================ */
const shutdown = async (signal) => {
  try {
    console.log(`\n[server] ${signal} recibido. Cerrando...`);
    
    // Cerrar Socket.io
    await closeSocket();
    
    setTimeout(async () => {
      await shutdownPrisma();
      process.exit(0);
    }, 10_000).unref();
  } catch {
    process.exit(1);
  }
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

export default app;