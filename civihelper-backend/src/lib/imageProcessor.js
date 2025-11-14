// src/lib/imageProcessor.js
// Utilidades centralizadas para procesar imágenes con Sharp.
// - Guarda original
// - Genera cover (por defecto 1280x720 aprox, WEBP q=80)
// - Genera thumb  (por defecto 320x180 aprox, WEBP q=70)
//
// Requisitos: npm i sharp
// Asegúrate de exponer los archivos estáticos:
//   app.use("/uploads", express.static(path.join(process.cwd(), "uploads")))

import path from "path";
import fs from "fs";
import crypto from "crypto";
import sharp from "sharp";
import { ALLOWED_MIME as ALLOWED_MIME_SET, MIME_TO_EXT } from "./media.js";

/** Lista de MIMEs permitidos derivada de media.js */
const ALLOWED_MIME = Object.freeze([...ALLOWED_MIME_SET]);

/** Límite de tamaño por defecto en bytes (3 MB para entradas locales) */
const DEFAULT_MAX_BYTES = 3 * 1024 * 1024;

/** Convierte mimetype a extensión segura (usa la verdad de media.js) */
function extFromMime(mime) {
  const ext = MIME_TO_EXT[mime];
  return ext ? `.${ext}` : ".bin";
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

/** Convierte una ruta absoluta dentro de uploads a URL pública /uploads/... */
function toPublicRel(absPath, uploadsRoot) {
  const rel = path.relative(uploadsRoot, absPath).replace(/\\/g, "/");
  return `/uploads/${rel}`;
}

/**
 * Procesa una imagen “de servicio”:
 * - Valida buffer/tamaño/formato (detectado por decodificación con Sharp)
 * - Guarda original con su extensión original (según MIME deducido)
 * - Genera cover y thumb en WEBP
 *
 * @param {Buffer} buffer - Imagen subida (ej. multer memoryStorage)
 * @param {Object} opts
 * @param {string} [opts.subdir='services'] - Subcarpeta dentro de /uploads (puede incluir serviceId)
 * @param {string} [opts.slug] - Prefijo para nombre de archivo (p.ej. serviceId)
 * @param {number} [opts.maxBytes=DEFAULT_MAX_BYTES] - Límite de peso de entrada
 * @param {{width:number,height:number,fit?:import('sharp').FitEnum}} [opts.coverSize={width:1280,height:720,fit:'inside'}]
 * @param {{width:number,height:number,fit?:import('sharp').FitEnum}} [opts.thumbSize={width:320,height:180,fit:'inside'}]
 * @param {{coverQ?:number,thumbQ?:number}} [opts.quality={coverQ:80,thumbQ:70}]
 * @returns {Promise<{
 *   originalAbs: string, coverAbs: string, thumbAbs: string,
 *   originalRel: string, coverRel: string, thumbRel: string,
 *   meta: { width?: number, height?: number, format?: string }
 * }>}
 */
export async function processServiceImage(buffer, opts = {}) {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new Error("Buffer de imagen inválido");
  }

  const {
    subdir = "services",
    slug,
    maxBytes = DEFAULT_MAX_BYTES,
    coverSize = { width: 1280, height: 720, fit: "inside" },
    thumbSize = { width: 320, height: 180, fit: "inside" },
    quality = { coverQ: 80, thumbQ: 70 },
  } = opts;

  if (buffer.length > maxBytes) {
    throw new Error(`La imagen excede el límite de ${maxBytes} bytes`);
  }

  // Detectar formato de entrada decodificando (más fiable que confiar en headers)
  let metadata;
  try {
    metadata = await sharp(buffer).metadata(); // lanza si no es imagen válida
  } catch {
    throw new Error("No se pudo leer la imagen (archivo corrupto o formato no soportado)");
  }

  const detectedFormat = (metadata?.format || "").toLowerCase(); // ej: 'jpeg', 'png', 'webp'
  const inputMime = detectedFormat ? `image/${detectedFormat}` : "";
  if (!ALLOWED_MIME.includes(inputMime)) {
    throw new Error(`Formato no permitido. Usa: ${ALLOWED_MIME.join(", ")}`);
  }

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

  // Cover (mantiene aspecto, no agranda)
  const coverPipeline = sharp(buffer)
    .resize({ ...coverSize, withoutEnlargement: true })
    .webp({ quality: Number(quality.coverQ ?? 80) });

  // Thumb
  const thumbPipeline = sharp(buffer)
    .resize({ ...thumbSize, withoutEnlargement: true })
    .webp({ quality: Number(quality.thumbQ ?? 70) });

  await Promise.all([coverPipeline.toFile(coverAbs), thumbPipeline.toFile(thumbAbs)]);

  return {
    originalAbs,
    coverAbs,
    thumbAbs,
    originalRel: toPublicRel(originalAbs, uploadsRoot),
    coverRel: toPublicRel(coverAbs, uploadsRoot),
    thumbRel: toPublicRel(thumbAbs, uploadsRoot),
    meta: { width: metadata.width, height: metadata.height, format: detectedFormat },
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
    const unix = String(t).replace(/\\/g, "/");
    if (unix.startsWith("/uploads/")) {
      const withoutPrefix = unix.replace(/^\/?uploads\//, "");
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
