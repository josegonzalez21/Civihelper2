// src/config/env.js
import "dotenv/config";

const toStr = (v, fallback) => {
  if (v === undefined || v === null) return fallback;
  const s = String(v).trim();
  return s.length ? s : fallback;
};

export const ENV = {
  NODE_ENV: toStr(process.env.NODE_ENV, "development"),

  // Server
  HOST: toStr(process.env.HOST, "0.0.0.0"),
  PORT: Number(process.env.PORT ?? 4000),

  // JWT
  JWT_ALG: toStr(process.env.JWT_ALG, "HS256"), // HS256 (dev) | RS256 (prod)
  JWT_SECRET: toStr(process.env.JWT_SECRET, ""), // requerido si HS256
  JWT_PRIVATE_KEY: process.env.JWT_PRIVATE_KEY, // requerido si RS256
  JWT_PUBLIC_KEY: process.env.JWT_PUBLIC_KEY,
  JWT_EXPIRES_IN: toStr(process.env.JWT_EXPIRES_IN, "7d"),
  JWT_ISSUER: toStr(process.env.JWT_ISSUER, "civihelper.api"),
  JWT_AUDIENCE: toStr(process.env.JWT_AUDIENCE, "civihelper.app"),
  JWT_CLOCK_TOLERANCE: Number(process.env.JWT_CLOCK_TOLERANCE ?? 5),
  JWT_KEY_ID: (() => {
    const kid = process.env.JWT_KEY_ID;
    if (kid === undefined || kid === null) return null;
    const s = String(kid).trim();
    return s.length ? s : null; // si viene vacío, NO usamos kid
  })(),
};
