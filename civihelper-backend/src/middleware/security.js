// src/middleware/security.js
import helmet from "helmet";

function toOrigin(url = "") {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host}`; // origen (sin path)
  } catch {
    return null;
  }
}

export function securityMiddleware() {
  const CDN_BASE_URL = (process.env.CDN_BASE_URL || "").trim();
  const cdnOrigin = toOrigin(CDN_BASE_URL);

  // Dominios típicos de S3/CloudFront (cubre presigned URLs)
  const s3Wildcards = [
    "*.s3.amazonaws.com",
    "*.s3.*.amazonaws.com",
    "*.amazonaws.com",
    "*.cloudfront.net",
  ];

  // Si tienes panel web que golpea el backend desde otro origen:
  // agrega ese origen a cors, no aquí (CSP aplica si sirves HTML).
  const csp = helmet.contentSecurityPolicy({
    useDefaults: false,
    directives: {
      "default-src": ["'none'"],
      "base-uri": ["'self'"],
      "frame-ancestors": ["'none'"],
      "object-src": ["'none'"],
      "script-src": ["'self'"],
      "style-src": ["'self'", "'unsafe-inline'"], // si devuelves HTML con estilos inline
      "img-src": ["'self'", "data:", "blob:", "https:", ...s3Wildcards, ...(cdnOrigin ? [cdnOrigin] : [])],
      "media-src": ["'self'", "https:", ...s3Wildcards, ...(cdnOrigin ? [cdnOrigin] : [])],
      "font-src": ["'self'", "https:"],
      "connect-src": ["'self'", "https:", ...s3Wildcards, ...(cdnOrigin ? [cdnOrigin] : [])],
      "upgrade-insecure-requests": [],
    },
  });

  return [
    helmet.dnsPrefetchControl({ allow: true }),
    helmet.frameguard({ action: "deny" }),
    helmet.hsts({ maxAge: 15552000 }), // 180 días/2 = 15552000
    helmet.noSniff(),
    helmet.referrerPolicy({ policy: "no-referrer" }),
    csp,
  ];
}
