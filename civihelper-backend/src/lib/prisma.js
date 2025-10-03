// src/lib/prisma.js
import { PrismaClient } from "@prisma/client";

/**
 * Prisma singleton seguro para evitar múltiples instancias en desarrollo
 * cuando se usa hot-reload (Next.js, Nodemon, etc.).
 *
 * Usa globalThis en dev; en producción simplemente crea una instancia nueva.
 */

const globalForPrisma = globalThis;

/** Configuración de logs dinámica por env */
const logLevels =
  (process.env.PRISMA_LOG?.split(",").map((s) => s.trim()).filter(Boolean)) ||
  (process.env.NODE_ENV === "development"
    ? ["query", "error", "warn"]
    : ["error", "warn"]);

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: logLevels,
    errorFormat: process.env.NODE_ENV === "development" ? "pretty" : "colorless",
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/**
 * Cierra la conexión de Prisma de forma segura.
 * Útil en tests o en scripts CLI.
 */
export async function shutdownPrisma() {
  try {
    await prisma.$disconnect();
  } catch (e) {
    console.error("[prisma] error al desconectar:", e);
  }
}
