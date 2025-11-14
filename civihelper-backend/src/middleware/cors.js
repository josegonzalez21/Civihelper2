// src/middleware/cors.js
import cors from "cors";

export function corsMiddleware() {
  const ENV_ORIGINS = (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  const allow = new Set([
    process.env.PUBLIC_APP_URL,
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    ...ENV_ORIGINS,
  ].filter(Boolean));

  return cors({
    origin(origin, cb) {
      if (!origin) return cb(null, true); // Postman / curl / SSR interno
      try {
        const u = new URL(origin);
        const normalized = `${u.protocol}//${u.host}`;
        if (allow.has(normalized)) return cb(null, true);
      } catch {}
      return cb(new Error("CORS bloqueado: origen no permitido"), false);
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    maxAge: 86400, // 24h
  });
}
