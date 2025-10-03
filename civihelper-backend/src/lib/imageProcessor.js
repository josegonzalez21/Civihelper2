// src/lib/imageProcessor.js
// Utilidades centralizadas para procesar imágenes con Sharp.
// - Guarda original
// - Genera cover (1280x720 aprox, WEBP q=80)
// - Genera thumb  (320x180 aprox, WEBP q=70)
//
// Requisitos: npm i sharp
// Asegúrate de exponer los archivos estáticos:
//   app.use("/uploads", express.static(path.join(process.cwd(), "uploads")))

import path from "path";
import fs from "fs";
import crypto from "crypto";
import sharp from "sharp";

/** Tipos permitidos (SVG excluido deliberadamente) */
export const ALLOWED_MIME = ["image/png", "image/jpeg", "image/webp"];

/** Límite de tamaño en bytes (3 MB) */
export const MAX_BYTES = 3 * 1024 * 1024;

/** Convierte mimetype a extensión segura */
function extFromMime(m) {
  switch (m) {
    case "image/png":
      return ".png";
    case "image/jpeg":
      return ".jpg";
    case "image/webp":
      return ".webp";
    default:
      return ".bin";
  }
}

/** Directorio raíz de uploads (configurable por env) */
export function getUploadsRoot() {
  return process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");
}

/** Une rutas evitando traversal y normalizando separadores */
function safeJoin(root, subdir) {
  const clean = String(subdir || "")
    .replace(/^(\.+[\\/])+/, "") // corta prefijos como ../../
    .replace(/[\0]/g, ""); // null bytes
  const abs = path.normalize(path.join(root, clean));
  if (!abs.startsWith(path.normalize(root))) {
    throw new Error("Ruta de subida inválida");
  }
  return abs;
}

/**
 * Procesa una imagen para "Service":
 * - Valida buffer/tamaño/formato
 * - Guarda original
 * - Genera cover (WEBP q=80) y thumb (WEBP q=70)
 *
 * @param {Buffer} buffer - Buffer de imagen subido (multer memoryStorage)
 * @param {Object} opts
 * @param {string} [opts.subdir='services'] - Subcarpeta dentro de /uploads
 * @param {string} [opts.slug] - Prefijo opcional para el nombre (p.ej. serviceId)
 * @returns {Promise<{
 *   originalAbs: string, coverAbs: string, thumbAbs: string,
 *   originalRel: string, coverRel: string, thumbRel: string
 * }>}
 */
export async function processServiceImage(buffer, opts = {}) {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new Error("Buffer de imagen inválido");
  }
  if (buffer.length > MAX_BYTES) {
    throw new Error("La imagen excede el límite de 3MB");
  }

  // Detectar formato de entrada
  const metadata = await sharp(buffer).metadata();
  if (!metadata || !metadata.format) {
    throw new Error("No se pudo leer la imagen");
  }
  const inputMime = `image/${metadata.format}`.toLowerCase();
  if (!ALLOWED_MIME.includes(inputMime)) {
    throw new Error("Formato no permitido. Use PNG, JPG o WEBP");
  }

  const { subdir = "services", slug } = opts;

  const uploadsRoot = getUploadsRoot();
  const targetDir = safeJoin(uploadsRoot, subdir);
  await fs.promises.mkdir(targetDir, { recursive: true });

  // Base de nombre aleatoria + slug opcional
  const rand = crypto.randomBytes(8).toString("hex");
  const base = slug ? `${slug}-${rand}` : rand;

  const originalName = `${base}${extFromMime(inputMime)}`;
  const coverName = `${base}-cover.webp`;
  const thumbName = `${base}-thumb.webp`;

  const originalAbs = path.join(targetDir, originalName);
  const coverAbs = path.join(targetDir, coverName);
  const thumbAbs = path.join(targetDir, thumbName);

  // Guardar original “tal cual”
  await fs.promises.writeFile(originalAbs, buffer);

  // Cover 1280x720 aprox (manteniendo aspecto, sin agrandar demasiado)
  const coverPipeline = sharp(buffer)
    .resize({ width: 1280, height: 720, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 });

  // Thumb 320x180 aprox
  const thumbPipeline = sharp(buffer)
    .resize({ width: 320, height: 180, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 70 });

  await Promise.all([coverPipeline.toFile(coverAbs), thumbPipeline.toFile(thumbAbs)]);

  // Convierte absoluta → relativa pública (/uploads/...)
  const toPublicRel = (abs) => {
    const root = path.normalize(uploadsRoot);
    const norm = path.normalize(abs);
    return norm.replace(root, "").replace(/^[/\\]?/, "/uploads/");
  };

  return {
    originalAbs,
    coverAbs,
    thumbAbs,
    originalRel: toPublicRel(originalAbs),
    coverRel: toPublicRel(coverAbs),
    thumbRel: toPublicRel(thumbAbs),
  };
}

/**
 * Elimina un archivo dentro de /uploads de forma segura.
 * Acepta rutas relativas tipo "/uploads/..." o absolutas ya dentro del root.
 * @param {string} target
 * @returns {Promise<boolean>} true si eliminó, false si no existía/no permitido
 */
export async function safeUnlinkUpload(target) {
  const uploadsRoot = getUploadsRoot();
  if (!target) return false;

  // Normaliza cuando viene como /uploads/...
  const normalizeTarget = (t) => {
    if (t.startsWith("/uploads/")) {
      const withoutPrefix = t.replace(/^\/?uploads[\\/]/, "");
      return path.join(uploadsRoot, withoutPrefix);
    }
    return t;
  };

  const abs = normalizeTarget(target);
  const root = path.normalize(uploadsRoot);
  const file = path.normalize(abs);

  // No permitir fuera de /uploads
  if (!file.startsWith(root)) return false;

  try {
    await fs.promises.unlink(file);
    return true;
  } catch {
    return false; // no existe o permiso denegado
  }
}
