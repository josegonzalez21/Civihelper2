// src/routes/auth.js
import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { prisma } from "../lib/prisma.js";
import { signJWT } from "../lib/jwt.js";
import { registerSchema, loginSchema, socialSchema } from "../validators/auth.js";
import { requireAuth } from "../middleware/auth.js";

// Rate limit helpers (normalizan IPv6)
import { createLimiter, ipEmailKey, ipProviderKey } from "../middleware/rateLimit.js";

/* =============================
   Configuración / helpers
============================= */
const router = Router();
const isProd = process.env.NODE_ENV === "production";
const ALLOW_DEMO = !isProd && process.env.DEV_ALLOW_SOCIAL_DEMO === "1";

const providerParamSchema = z.enum(["google", "facebook", "apple"]);
const googleSchema   = z.object({ idToken: z.string().min(10) });
const facebookSchema = z.object({ accessToken: z.string().min(10) });
const appleSchema    = z.object({ identityToken: z.string().min(10) });

// Hash “dummy” (bcrypt de "dummy-password", salt 10) para uniformar tiempo
const DUMMY_HASH = "$2b$10$0c5Ej5fV7lDkH7wtc6Z0yO9VY2zG6m5pV8W3m3q8Tgk8x3li8Vw1a";

/** Oculta campos sensibles / internos */
function safeUser(u) {
  if (!u) return null;
  // eslint-disable-next-line no-unused-vars
  const { password, passwordHash, tokenVersion, ...rest } = u;
  return rest;
}

/** Respuesta de error consistente */
function sendError(res, status, message, extraHeaders) {
  if (extraHeaders) {
    for (const [k, v] of Object.entries(extraHeaders)) {
      if (v !== undefined && v !== null) res.setHeader(k, v);
    }
  }
  return res.status(status).json({ message: String(message || "Error") });
}

/* =============================
   Rate limiters (con IPv6 OK)
============================= */
// Login: por IP+email, ventana 2 min, 7 intentos (no cuenta éxitos).
const loginLimiter = createLimiter({
  windowMs: 2 * 60 * 1000,
  limit: 7,
  skipSuccessfulRequests: true,
  keyGenerator: ipEmailKey,
});

// Registro: por IP, ventana 10 min, 5 intentos (no cuenta éxitos).
const registerLimiter = createLimiter({
  windowMs: 10 * 60 * 1000,
  limit: 5,
  skipSuccessfulRequests: true,
  keyGenerator: (req, res) => ipEmailKey(req, res).split(":")[0],
});

// Social: por IP+provider, ventana 2 min, 10 intentos (no cuenta éxitos).
const socialLimiter = createLimiter({
  windowMs: 2 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  keyGenerator: ipProviderKey,
});

/* =============================
   Stubs de verificación (prod)
============================= */
async function verifyGoogleIdToken(/* idToken */) {
  // TODO: implementar con Google tokeninfo / @google-auth-library
  throw new Error("Verificación de Google no implementada.");
}
async function verifyFacebookAccessToken(/* accessToken */) {
  // TODO: implementar con Graph API /debug_token
  throw new Error("Verificación de Facebook no implementada.");
}
async function verifyAppleIdentityToken(/* identityToken */) {
  // TODO: implementar con Apple .well-known/jwks.json
  throw new Error("Verificación de Apple no implementada.");
}

/* =============================
   POST /auth/register
============================= */
router.post("/register", registerLimiter, async (req, res) => {
  try {
    const data = registerSchema.parse(req.body);

    const email = String(data.email || "").trim().toLowerCase();
    const name  = String(data.name || "Usuario").trim().slice(0, 120);

    const allowedRoles = new Set(["CLIENT", "PROVIDER"]);
    const role = allowedRoles.has(String(data.role)) ? String(data.role) : "CLIENT";

    const passwordHashVal = await bcrypt.hash(String(data.password), 10);

    let user;
    try {
      user = await prisma.user.create({
        data: { name, email, role, password: passwordHashVal },
      });
    } catch (e) {
      // Prisma P2002: unique violation
      if (e?.code === "P2002") {
        return sendError(res, 409, "Email ya registrado");
      }
      throw e;
    }

    const token = signJWT({ sub: user.id, role: user.role, email: user.email });
    return res.status(201).json({ token, user: safeUser(user) });
  } catch (e) {
    const msg = e?.errors?.[0]?.message || e?.message || "Bad Request";
    return sendError(res, 400, msg);
  }
});

/* =============================
   POST /auth/login
============================= */
router.post("/login", loginLimiter, async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const normalizedEmail = String(email || "").trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // Comparación “dummy” para uniformar tiempo si no existe el usuario
    let storedForCheck = DUMMY_HASH;
    if (user) {
      storedForCheck = String(user.password || user.passwordHash || DUMMY_HASH);
    }
    const ok = await bcrypt.compare(String(password), storedForCheck);

    // Si usuario no existe o el hash no coincide (o no hay password real), mensaje genérico
    if (!user || !ok || !(user.password || user.passwordHash)) {
      return sendError(res, 401, "Credenciales inválidas");
    }

    const token = signJWT({ sub: user.id, role: user.role, email: user.email });
    return res.json({ token, user: safeUser(user) });
  } catch (e) {
    // Si el rate limiter puso Retry-After, se conserva
    const retry = res.getHeader("Retry-After");
    const msg = e?.errors?.[0]?.message || e?.message || "Bad Request";
    return sendError(res, 400, msg, retry ? { "Retry-After": retry } : undefined);
  }
});

/* =============================
   POST /auth/social/:provider
============================= */
router.post("/social/:provider", socialLimiter, async (req, res) => {
  try {
    const provider = providerParamSchema.parse(String(req.params.provider || "").toLowerCase());

    let email, fullName, oauthIdFromIdP;

    if (provider === "google") {
      if (isProd) {
        const { idToken } = googleSchema.parse(req.body);
        const info = await verifyGoogleIdToken(idToken);
        email = info.email;
        fullName = info.fullName;
        oauthIdFromIdP = info.sub;
      } else if (ALLOW_DEMO) {
        const data = socialSchema.parse(req.body);
        email = data.email;
        fullName = data.fullName;
        oauthIdFromIdP = data.oauthId;
      } else {
        return sendError(res, 501, "Google login no habilitado (verificación no implementada).");
      }
    }

    if (provider === "facebook") {
      if (isProd) {
        const { accessToken } = facebookSchema.parse(req.body);
        const info = await verifyFacebookAccessToken(accessToken);
        email = info.email;
        fullName = info.fullName;
        oauthIdFromIdP = info.id;
        if (!email) return sendError(res, 400, "Facebook no devolvió email. Solicita permiso 'email'.");
      } else if (ALLOW_DEMO) {
        const data = socialSchema.parse(req.body);
        email = data.email;
        fullName = data.fullName;
        oauthIdFromIdP = data.oauthId;
      } else {
        return sendError(res, 501, "Facebook login no habilitado (verificación no implementada).");
      }
    }

    if (provider === "apple") {
      if (isProd) {
        const { identityToken } = appleSchema.parse(req.body);
        const info = await verifyAppleIdentityToken(identityToken);
        email = info.email; // puede ser null en re-logins
        fullName = info.fullName;
        oauthIdFromIdP = info.sub;
        if (!email) return sendError(res, 400, "Apple no devolvió email. Completa correo en el onboarding.");
      } else if (ALLOW_DEMO) {
        const data = socialSchema.parse(req.body);
        email = data.email;
        fullName = data.fullName;
        oauthIdFromIdP = data.oauthId;
      } else {
        return sendError(res, 501, "Apple login no habilitado (verificación no implementada).");
      }
    }

    email = String(email || "").trim().toLowerCase();
    if (!email) return sendError(res, 400, "No fue posible determinar el email del proveedor.");

    const result = await prisma.$transaction(async (tx) => {
      const name = String(fullName || "Usuario").trim().slice(0, 120);

      let u = await tx.user.findUnique({ where: { email } });
      let created = false;

      if (!u) {
        // Creamos una contraseña “dummy” (no usada para login social)
        const dummyHash = await bcrypt.hash(`social:${provider}:${oauthIdFromIdP || Date.now()}`, 8);
        u = await tx.user.create({
          data: {
            name,
            email,
            role: "CLIENT",
            password: dummyHash,
          },
        });
        created = true;
      }

      if (oauthIdFromIdP) {
        await tx.provider.upsert({
          where: {
            type_oauthId: {
              type: provider.toUpperCase(), // "GOOGLE" | "FACEBOOK" | "APPLE"
              oauthId: String(oauthIdFromIdP),
            },
          },
          update: { userId: u.id },
          create: {
            type: provider.toUpperCase(),
            oauthId: String(oauthIdFromIdP),
            userId: u.id,
          },
        });
      }

      return { user: u, created };
    });

    const token = signJWT({ sub: result.user.id, role: result.user.role, email: result.user.email });
    return res.status(result.created ? 201 : 200).json({ token, user: safeUser(result.user) });
  } catch (e) {
    const retry = res.getHeader("Retry-After");
    const msg = e?.errors?.[0]?.message || e?.message || "Bad Request";
    return sendError(res, 400, msg, retry ? { "Retry-After": retry } : undefined);
  }
});

/* =============================
   POST /auth/logout-all
============================= */
router.post("/logout-all", requireAuth, async (req, res) => {
  try {
    const uid = String(req.user?.id || req.user?.sub || "");
    if (!uid) return res.status(204).end();

    try {
      await prisma.user.update({
        where: { id: uid },
        data: { tokenVersion: { increment: 1 } },
      });
    } catch {
      // si tu modelo no tiene tokenVersion, ignora
    }
    return res.status(204).end();
  } catch {
    return res.status(200).json({ ok: true });
  }
});

export default router;
