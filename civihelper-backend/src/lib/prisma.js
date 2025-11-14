// src/lib/prisma.js
import { PrismaClient } from "@prisma/client";

/**
 * Prisma singleton seguro para evitar múltiples instancias en desarrollo
 * cuando se usa hot-reload (Nodemon, Vite, Next.js dev, etc.).
 *
 * En producción: instancia única por proceso.
 * En desarrollo: reusa desde globalThis para evitar fugas de conexiones.
 */

/* =============================
   Util: normalizar niveles de log
============================= */
const ALLOWED_LOGS = new Set(["query", "info", "warn", "error"]);
function parseLogLevels() {
  const fromEnv = (process.env.PRISMA_LOG || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (fromEnv.length) {
    return fromEnv.filter((lvl) => ALLOWED_LOGS.has(lvl));
  }
  // Por defecto: verbose en dev, mínimos en prod
  return process.env.NODE_ENV === "development"
    ? ["query", "warn", "error"]
    : ["warn", "error"];
}

/* =============================
   Detectar URL de base de datos
============================= */
function getDatabaseUrl() {
  let url = process.env.DATABASE_URL;
  
  // Si NO está en Docker y la URL usa 'db' como host, cambiar a 'localhost'
  if (!process.env.IS_DOCKER && url?.includes('@db:')) {
    console.log('[prisma] Detectado entorno NO-Docker, usando localhost en lugar de db');
    url = url.replace('@db:', '@localhost:');
  }
  
  return url;
}

/* =============================
   Crear (o reutilizar) cliente
============================= */
const logLevels = parseLogLevels();
const databaseUrl = getDatabaseUrl();

// Usamos una "bolsa" en globalThis sin colisionar nombres
const g = globalThis;
const prismaGlobalKey = "__prisma__client";

export const prisma =
  (g[prismaGlobalKey]) ||
  new PrismaClient({
    log: logLevels,
    // 'pretty' incluye stack más legible; en prod preferimos 'colorless'
    errorFormat: process.env.NODE_ENV === "development" ? "pretty" : "colorless",
    datasources: {
      db: {
        url: databaseUrl
      }
    }
  });

// Guarda en global para hot-reload only en desarrollo
if (process.env.NODE_ENV !== "production") {
  g[prismaGlobalKey] = prisma;
}

/* =============================
   Healthcheck (ping DB)
============================= */
/**
 * Realiza un ping simple a la BD.
 * Devuelve true si hay conectividad básica.
 */
export async function prismaPing() {
  try {
    // SELECT 1 funciona en la mayoría de motores soportados
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

/* =============================
   Cierre ordenado
============================= */
/**
 * Cierra la conexión de Prisma de forma segura.
 * Útil en pruebas, scripts CLI o graceful shutdown del server.
 */
export async function shutdownPrisma() {
  try {
    await prisma.$disconnect();
  } catch (e) {
    console.error("[prisma] error al desconectar:", e?.message || e);
  }
}