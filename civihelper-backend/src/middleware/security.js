// src/middleware/security.js
import helmet from "helmet";

/**
 * Normaliza un URL a su "origin" (schema+host+puerto).
 * Devuelve null si no es un URL válido.
 */
function toOrigin(url = "") {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host}`;
  } catch {
    return null;
  }
}

/**
 * Convierte una cadena coma-separada a array (limpiando espacios y vacíos).
 */
function csvToList(str = "") {
  return String(str)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function addIf(arr, v) {
  if (v) arr.push(v);
  return arr;
}

/**
 * Middleware de seguridad centralizado.
 *
 * ENV soportadas:
 * - NODE_ENV=production|development
 * - ENABLE_CSP=1
 * - CSP_REPORT_ONLY=1
 * - CSP_REPORT_URI=https://tu-endpoint/report
 * - CSP_REPORT_TO=csp-endpoint (usa header/report-to y directiva report-to)
 * - ENABLE_HSTS=1
 * - ENABLE_WORKERS=1 (permite worker-src 'self')
 * - CDN_BASE_URL=https://dxxx.cloudfront.net
 * - EXTRA_CONNECT_ORIGINS=https://api.terceros.com,wss://ws.terceros.com
 * - EXTRA_IMG_ORIGINS=https://img.ejemplo.com
 * - EXTRA_MEDIA_ORIGINS=https://media.ejemplo.com
 * - EXTRA_FONT_ORIGINS=https://fonts.gstatic.com
 * - EXTRA_SCRIPT_ORIGINS=https://cdn.ejemplo.com
 * - EXTRA_STYLE_ORIGINS=https://fonts.googleapis.com
 */
export function securityMiddleware() {
  const {
    NODE_ENV = "development",
    ENABLE_CSP = "0",
    CSP_REPORT_ONLY = "0",
    CSP_REPORT_URI = "",
    CSP_REPORT_TO = "", // nombre del endpoint report-to (debes definir also header Report-To fuera de CSP si quieres usarlo)
    ENABLE_HSTS = "0",
    ENABLE_WORKERS = "0",
    CDN_BASE_URL = "",
    EXTRA_CONNECT_ORIGINS = "",
    EXTRA_IMG_ORIGINS = "",
    EXTRA_MEDIA_ORIGINS = "",
    EXTRA_FONT_ORIGINS = "",
    EXTRA_SCRIPT_ORIGINS = "",
    EXTRA_STYLE_ORIGINS = "",
  } = process.env;

  const isProd = NODE_ENV === "production";
  const enableCsp = ENABLE_CSP === "1";
  const cspReportOnly = CSP_REPORT_ONLY === "1";
  const enableHsts = ENABLE_HSTS === "1";
  const enableWorkers = ENABLE_WORKERS === "1";

  const cdnOrigin = toOrigin(CDN_BASE_URL);

  // Dominios típicos de S3/CloudFront (presigned URLs incluidas)
  const s3Wildcards = [
    "*.s3.amazonaws.com",
    "*.s3.*.amazonaws.com",
    "*.amazonaws.com",
    "*.cloudfront.net",
  ];

  // Orígenes adicionales por env
  const extraConnect = csvToList(EXTRA_CONNECT_ORIGINS);
  const extraImg = csvToList(EXTRA_IMG_ORIGINS);
  const extraMedia = csvToList(EXTRA_MEDIA_ORIGINS);
  const extraFont = csvToList(EXTRA_FONT_ORIGINS);
  const extraScript = csvToList(EXTRA_SCRIPT_ORIGINS);
  const extraStyle = csvToList(EXTRA_STYLE_ORIGINS);

  // Directivas CSP base (pensadas para API)
  const baseDirectives = {
    "default-src": ["'none'"],
    "base-uri": ["'self'"],
    "frame-ancestors": ["'none'"],
    "object-src": ["'none'"],

    // Si alguna vez sirves HTML, script/style siguen bloqueados salvo 'self' y estilos inline.
    "script-src": ["'self'", ...extraScript],
    "style-src": ["'self'", "'unsafe-inline'", ...extraStyle],

    // Fuentes: HTTPS por defecto + extras
    "font-src": ["'self'", "https:", ...extraFont],

    // Imágenes/medios: self + data/blob + https + S3/CF + CDN + extras
    "img-src": addIf(
      [
        "'self'",
        "data:",
        "blob:",
        "https:",
        ...s3Wildcards,
        ...extraImg,
      ],
      cdnOrigin
    ),
    "media-src": addIf(
      ["'self'", "https:", ...s3Wildcards, ...extraMedia],
      cdnOrigin
    ),

    // Conexiones: self + https + wss + S3/CF + CDN + extras
    "connect-src": addIf(
      ["'self'", "https:", "wss:", ...s3Wildcards, ...extraConnect],
      cdnOrigin
    ),

    // Workers: por defecto bloqueados en API; habilítalos con ENABLE_WORKERS=1
    "worker-src": enableWorkers ? ["'self'"] : ["'none'"],

    "frame-src": ["'none'"],
    "form-action": ["'self'"],
    "upgrade-insecure-requests": [],
  };

  if (CSP_REPORT_URI) {
    baseDirectives["report-uri"] = [CSP_REPORT_URI];
  }
  if (CSP_REPORT_TO) {
    // Solo tendrá efecto si también configuras el header Report-To correspondiente desde tu app/proxy.
    baseDirectives["report-to"] = [CSP_REPORT_TO];
  }

  // Middlewares Helmet (orden sugerido)
  const middlewares = [
    helmet.dnsPrefetchControl({ allow: true }),
    helmet.frameguard({ action: "deny" }),
    helmet.crossOriginResourcePolicy({ policy: "cross-origin" }),
    helmet.crossOriginOpenerPolicy({ policy: "same-origin" }), // COOP seguro por defecto
    helmet.noSniff(),
    helmet.referrerPolicy({ policy: "no-referrer" }),
    helmet.originAgentCluster(),
  ];

  // HSTS solo si estás en producción y bajo HTTPS estable
  if (isProd && enableHsts) {
    middlewares.push(
      helmet.hsts({
        maxAge: 15552000, // ~180 días
        includeSubDomains: true,
        preload: false,
      })
    );
  }

  // CSP opcional (recomendado activar en prod)
  if (enableCsp) {
    const csp = helmet.contentSecurityPolicy({
      useDefaults: false,
      directives: baseDirectives,
      reportOnly: cspReportOnly,
    });
    middlewares.push(csp);
  }

  return middlewares;
}
