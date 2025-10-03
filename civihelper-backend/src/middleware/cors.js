// src/middleware/cors.js
import cors from "cors";

export function corsMiddleware() {
  const allow = new Set(
    [
      process.env.PUBLIC_APP_URL,
      "http://localhost:3000",
      "http://localhost:5173",
      "http://127.0.0.1:5173",
    ].filter(Boolean)
  );

  return cors({
    origin(origin, cb) {
      if (!origin) return cb(null, true); // Postman / curl
      try {
        const u = new URL(origin);
        if (allow.has(`${u.protocol}//${u.host}`)) return cb(null, true);
      } catch {}
      return cb(new Error("Origen no permitido por CORS"));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    maxAge: 86400,
  });
}
