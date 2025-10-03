// src/services/upload.js
import { Platform } from "react-native";
import * as ImageManipulator from "expo-image-manipulator";
import api from "./api";

/**
 * Pide una URL firmada de subida. Ajusta la ruta si tu backend expone otra.
 * Espera { url, key, contentType }
 */
export async function getPresignedPut({ mime, ext }) {
  const { data } = await api.post("/uploads/presign", { mime, ext });
  // data: { url, key, contentType } (ajústalo a tu backend real)
  return data;
}

/** Lee un URI (file:// o asset) a blob/arrayBuffer para fetch PUT */
async function uriToArrayBuffer(uri) {
  const res = await fetch(uri);
  const blob = await res.blob();
  return await blob.arrayBuffer();
}

/**
 * Sube una imagen a S3 usando PUT firmado.
 * - Optimiza a WebP/JPEG si quieres bajar peso.
 * - Devuelve { key, publicUrl } si tu backend te da una base pública.
 */
export async function uploadImageWithPresign(localUri, mimeHint = "image/jpeg") {
  // Opcional: comprimir/normalizar
  const manip = await ImageManipulator.manipulateAsync(
    localUri,
    [], // sin transformaciones
    { compress: 0.9, format: mimeHint.includes("png") ? ImageManipulator.SaveFormat.PNG : ImageManipulator.SaveFormat.JPEG }
  );

  const ext = manip.uri.toLowerCase().endsWith(".png") ? "png" : "jpg";
  const { url, key, contentType } = await getPresignedPut({ mime: mimeHint, ext });

  const ab = await uriToArrayBuffer(manip.uri);
  const putRes = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": contentType || mimeHint },
    body: ab,
  });
  if (!putRes.ok) {
    const txt = await putRes.text().catch(() => "");
    throw new Error(`Fallo PUT S3: ${putRes.status} ${txt}`);
  }

  // Opcional: notificar a tu backend que ya está subida
  // await api.post("/uploads/confirm", { key });

  return { key };
}
