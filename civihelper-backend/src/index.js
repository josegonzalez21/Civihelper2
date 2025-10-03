// src/index.js
import "dotenv/config";
import fs from "fs";
import path from "path";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import cookieParser from "cookie-parser";

// Rate limiters existentes (tuyos)
import {
  authLimiter as _authLimiter,
  generalLimiter as _generalLimiter,
} from "./middleware/rateLimit.js";

// Rate limiters nuevos (uploads)
import {
  uploadSignLimiter,
  uploadGetLimiter,
} from "./middleware/limits.js";

// Rutas app (públicas/usuario)
import authRoutes from "./routes/auth.js";
import passwordRoutes from "./routes/auth.password.js";
import meRoutes from "./routes/me.js";
import servicesRoutes from "./routes/services.js";
import categoriesRoutes from "./routes/categories.js";
import favoritesRoutes from "./routes/favorites.js";

// ADMIN + Destacados
import adminServiceTypes from "./routes/admin.serviceTypes.js";
import adminServices from "./routes/admin.services.js";
import featuredRoutes from "./routes/featured.js";

// Prisma shutdown
import { shutdownPrisma } from "./lib/prisma.js";

// ➕ S3 presigned uploads
import uploadsRouter from "./routes/uploads.js";

const app = express();
const isProd = process.env.NODE_ENV === "production";

/* ============================================================================
   Parsers (JSON/URLENCODED)
============================================================================ */
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Desactiva cabecera que filtra tecnología
app.disable("x-powered-by");

// Si estás detrás de proxy (Vercel/Render/Nginx), habilita IP real para rate-limit y logs
app.set("trust proxy", Number(process.env.TRUST_PROXY || 1));

/* ============================================================================
   CORS
============================================================================ */
function parseCorsOrigin() {
  const raw = process.env.CORS_ORIGIN;
  if (!raw || raw === "*") return true; // permite todo (desarrollo)
  const list = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return list.length === 1 ? list[0] : list;
}
app.use(
  cors({
    origin: parseCorsOrigin(),
    credentials: true,
    optionsSuccessStatus: 204,
  })
);

/* ============================================================================
   Seguridad y perf (Helmet + Compression)
   — añadimos fuentes permitidas dinámicas para CDN/S3 en CSP
============================================================================ */
function cspWithCdn() {
  const CDN = (process.env.CDN_BASE_URL || "").replace(/\/+$/, "");
  const extraImg = [];
  const extraConnect = [];

  if (CDN) {
    extraImg.push(CDN);
    extraConnect.push(CDN);
  }
  // Fallbacks comunes si aún sirves directo desde S3/CloudFront
  extraImg.push("https://*.amazonaws.com", "https://*.cloudfront.net");
  extraConnect.push("https://*.amazonaws.com", "https://*.cloudfront.net");

  return {
    useDefaults: true,
    directives: {
      "default-src": ["'self'"],
      "img-src": ["'self'", "data:", "blob:", ...extraImg],
      "media-src": ["'self'", "data:", "blob:"],
      "script-src": ["'self'", "'unsafe-inline'"],
      "style-src": ["'self'", "'unsafe-inline'"],
      "connect-src": ["'self'", "*", ...extraConnect], // móvil puede llamar a tu API por IP
    },
  };
}

app.use(
  helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: isProd ? cspWithCdn() : false,
  })
);

app.use(compression());

/* ============================================================================
   Cookies
============================================================================ */
app.use(cookieParser());

/* ============================================================================
   Logs
============================================================================ */
app.use(morgan(isProd ? "combined" : "dev"));

/* ============================================================================
   Healthchecks & raíz
============================================================================ */
app.get("/", (_req, res) => res.status(200).send("CiviHelper API"));
app.get("/health", (_req, res) => res.json({ ok: true, ts: Date.now() }));
app.get("/livez", (_req, res) => res.status(200).end());
app.get("/readyz", (_req, res) => res.status(200).end());

/* ============================================================================
   Archivos estáticos locales (solo si pides servirlos)
   - .env: SERVE_LOCAL_UPLOADS=1 y UPLOAD_DIR=./uploads
============================================================================ */
const SERVE_LOCAL_UPLOADS = String(process.env.SERVE_LOCAL_UPLOADS || "0") === "1";
if (SERVE_LOCAL_UPLOADS) {
  const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");
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
   Rate limit (desactivable en dev)
   - .env: DEV_RATE_LIMIT_OFF=1 para desactivar
============================================================================ */
const useRateLimit = String(process.env.DEV_RATE_LIMIT_OFF || "0") !== "1";
const pass = (_req, _res, next) => next();
const authLimiter = useRateLimit ? _authLimiter : pass;
const generalLimiter = useRateLimit ? _generalLimiter : pass;
const _uploadSignLimiter = useRateLimit ? uploadSignLimiter : pass;
const _uploadGetLimiter = useRateLimit ? uploadGetLimiter : pass;

/* ============================================================================
   Montaje de rutas
============================================================================ */
// 1) Auth con su limiter específico
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/auth/password", authLimiter, passwordRoutes);

// 2) Limiter general para el resto de /api
app.use("/api", generalLimiter);

// 3) Rutas reales
app.use("/api/me", meRoutes);
app.use("/api/services", servicesRoutes);
app.use("/api/categories", categoriesRoutes);
app.use("/api/favorites", favoritesRoutes);

// ADMIN
app.use("/api/admin/service-types", adminServiceTypes);
app.use("/api/admin/services", adminServices);

// Públicos: destacados del Home (adminCreated=true)
app.use("/api/featured", featuredRoutes);

// ➕ Firma para subidas S3 (aplica límites por endpoint)
app.use("/api/uploads/sign", _uploadSignLimiter);
app.use("/api/uploads/sign-get", _uploadGetLimiter);
app.use("/api/uploads", uploadsRouter);

/* ============================================================================
   404
============================================================================ */
app.use((_req, res) => res.status(404).json({ message: "Not Found" }));

/* ============================================================================
   Manejo de errores
============================================================================ */
app.use((err, _req, res, _next) => {
  if (!isProd) console.error(err);

  const isMulter =
    err?.name === "MulterError" ||
    /multipart|multer|File too large|Unexpected field/i.test(err?.message || "");

  if (isMulter) {
    return res
      .status(400)
      .json({ message: err?.message || "Error al procesar el archivo subido" });
  }

  const status = err.status || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ message });
});

/* ============================================================================
   Server
============================================================================ */
const PORT = Number(process.env.PORT || 4000);
const HOST = process.env.HOST || "0.0.0.0";
const LOCAL_URL = `http://${HOST === "0.0.0.0" ? "localhost" : HOST}:${PORT}`;
// Prioriza BACKEND_URL para móviles; si no, PUBLIC_APP_URL; si no, local
const PUBLIC_URL = process.env.BACKEND_URL || process.env.PUBLIC_APP_URL || LOCAL_URL;

const server = app.listen(PORT, HOST, () => {
  console.log(`[server] Listening on http://${HOST}:${PORT}`);
  console.log(`[server] Local:  ${LOCAL_URL}`);
  console.log(`[server] Public: ${PUBLIC_URL}`);
  if (!useRateLimit) console.log("[server] DEV_RATE_LIMIT_OFF=1 → rate limit desactivado");
  if (process.env.CDN_BASE_URL) console.log(`[CSP] CDN_BASE_URL: ${process.env.CDN_BASE_URL}`);
});

/* ============================================================================
   Graceful shutdown
============================================================================ */
const shutdown = async (signal) => {
  try {
    console.log(`\n[server] ${signal} recibido. Cerrando...`);
    server.close(async () => {
      await shutdownPrisma();
      console.log("[server] Cerrado limpio. Bye! 👋");
      process.exit(0);
    });
    // Failsafe: forzar salida si algo cuelga
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
