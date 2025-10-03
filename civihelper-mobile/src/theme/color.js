// src/theme/color.js
import { Appearance, Platform } from "react-native";

/* ------------------------------- Paleta base ------------------------------- */
/** Paleta CiviHelper */
export const palette = {
  // Core (Primary violeta)
  primary600: "#7C3AED", // botón, énfasis
  primary500: "#A855F7", // gradiente/hover
  primary300: "#C4B5FD", // links alternativos
  primary200: "#A78BFA", // links

  // Accent
  emerald: "#10B981",    // éxito/acento sutil
  blue:    "#3B82F6",    // info/acento sutil

  // Semantic
  success: "#10B981",
  info:    "#3B82F6",
  warning: "#F59E0B",
  error:   "#EF4444",

  // Superficies (oscuro elegante)
  bgBase:  "#0B0A1A",
  bg2:     "#140A2E",
  bg3:     "#0D0B1F",
  glass:   "rgba(255,255,255,0.05)",     // surface/glass
  inputBg: "rgba(10,10,25,0.85)",        // surface/input
  bSubtle: "rgba(255,255,255,0.10)",     // border/subtle
  bInput:  "rgba(255,255,255,0.08)",     // border/input

  // Texto
  textPrimary:   "#FFFFFF",
  textSecondary: "rgba(255,255,255,0.80)",
  textMuted:     "rgba(255,255,255,0.70)",
  textHelper:    "rgba(255,255,255,0.55)",

  // Utilidades
  white: "#FFFFFF",
  black: "#000000",
};

/* --------------------------------- Helpers -------------------------------- */
export function hexToRgb(hex) {
  const h = String(hex).replace("#", "");
  const s = h.length === 3 ? h.split("").map(c => c + c).join("") : h.padEnd(6, "0").slice(0, 6);
  const n = parseInt(s, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
export function rgbToHex(r, g, b) {
  const toHex = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
export function withOpacity(hex, alpha = 1) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`;
}
export function mix(c1, c2, t = 0.5) {
  const a = hexToRgb(c1), b = hexToRgb(c2);
  return rgbToHex(a.r + (b.r - a.r) * t, a.g + (b.g - a.g) * t, a.b + (b.b - a.b) * t);
}
export function lighten(hex, amount = 0.1) { return mix(hex, "#ffffff", amount); }
export function darken(hex, amount = 0.1)  { return mix(hex, "#000000", amount); }
export function contrastText(bgHex) {
  const { r, g, b } = hexToRgb(bgHex);
  const L = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return L > 0.55 ? palette.bgBase : palette.white;
}
export const isDarkScheme = () => Appearance?.getColorScheme?.() === "dark";

/* --------------------------------- Temas ---------------------------------- */
/** Tema claro (opcional, por si lo necesitas; mantiene contraste correcto) */
export const lightColors = {
  primary: palette.primary600,
  success: palette.success,
  danger:  palette.error,
  warn:    palette.warning,
  info:    palette.info,

  text:    "#0F172A",
  sub:     "#6B7280",
  border:  "#E5E7EB",
  card:    palette.white,
  bg:      "#F5F7FB",

  muted:   "#94A3B8",
  overlay: withOpacity("#0F172A", 0.08),

  gradients: {
    // puedes usarlo en headers/CTA si usas tema claro
    cta: [palette.primary600, palette.primary500],
    hero: [palette.primary600, palette.primary500],
    bg:  ["#0D0B1F", "#140A2E", "#0B0A1A"], // para pantallas con fondo ilustrado
    blob1: [withOpacity(palette.primary600, 0.35), withOpacity(palette.primary500, 0.12)],
    blob2: [withOpacity(palette.emerald, 0.18), withOpacity(palette.blue, 0.12)],
  },

  tags: {
    ok:     { bg: withOpacity(palette.success, 0.12), fg: palette.success },
    info:   { bg: withOpacity(palette.info, 0.12),    fg: palette.info },
    warn:   { bg: withOpacity(palette.warning, 0.12), fg: palette.warning },
    error:  { bg: withOpacity(palette.error, 0.12),   fg: palette.error },
    brand:  { bg: withOpacity(palette.primary600, 0.12), fg: palette.primary600 },
  },
};

/** Tema oscuro – CiviHelper (predeterminado) */
export const darkColors = {
  primary: palette.primary600,
  primary500: palette.primary500,
  primary300: palette.primary300,
  primary200: palette.primary200,

  success: palette.success,
  danger:  palette.error,
  warn:    palette.warning,
  info:    palette.info,

  // Superficies y texto
  text:   palette.textPrimary,
  sub:    palette.textSecondary,
  border: palette.bSubtle,
  borderInput: palette.bInput,
  card:   palette.glass,
  bg:     palette.bgBase,
  bg2:    palette.bg2,
  bg3:    palette.bg3,
  inputBg: palette.inputBg,

  muted:   palette.textMuted,
  placeholder: palette.textHelper,
  overlay: withOpacity(palette.black, 0.32),

  // Gradientes (coinciden con el login/CTA)
  gradients: {
    cta:  [palette.primary600, palette.primary500],
    hero: [palette.primary600, palette.primary500],
    bg:   ["#0D0B1F", "#140A2E", "#0B0A1A"],
    blob1: [withOpacity(palette.primary600, 0.35), withOpacity(palette.primary500, 0.12)],
    blob2: [withOpacity(palette.emerald, 0.18), withOpacity(palette.blue, 0.12)],
  },

  tags: {
    ok:     { bg: withOpacity(palette.success, 0.20),  fg: lighten(palette.success, 0.12) },
    info:   { bg: withOpacity(palette.info, 0.20),     fg: lighten(palette.info, 0.14) },
    warn:   { bg: withOpacity(palette.warning, 0.20),  fg: lighten(palette.warning, 0.14) },
    error:  { bg: withOpacity(palette.error, 0.20),    fg: lighten(palette.error, 0.12) },
    brand:  { bg: withOpacity(palette.primary600, 0.18), fg: lighten(palette.primary600, 0.15) },
  },
};

/** Tema por esquema ("light" | "dark" | "system") */
export function getColors(scheme = "dark") {
  if (scheme === "system") return isDarkScheme() ? darkColors : lightColors;
  return scheme === "dark" ? darkColors : lightColors;
}

/* -------------------- Tipografía / layout / sombras / z -------------------- */
export const typography = {
  family: Platform.select({ ios: "System", android: "sans-serif", default: "System" }),
  size:   { xs: 11, sm: 12, md: 14, lg: 16, xl: 18, "2xl": 22, "3xl": 26 },
  weight: { regular: "400", medium: "600", bold: "800", black: "900" },
};

/** spacing / radius como función + props (compat con spacing(2) y spacing.md) */
const SP_UNIT = 4;
export const spacing = (n = 1) => n * SP_UNIT;
Object.assign(spacing, { unit: SP_UNIT, xs: 6, sm: 8, md: 12, lg: 16, xl: 20, "2xl": 24 });

export const radius = (n = 1) => n * 8;
Object.assign(radius, { xs: 8, sm: 12, md: 16, lg: 22, xl: 28 });

export const z = { base: 1, fab: 10, modal: 100, toast: 1000 };

export const shadows = {
  lg: { shadowColor: palette.black, shadowOpacity: 0.16, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 5 },
  md: { shadowColor: palette.black, shadowOpacity: 0.12, shadowRadius: 8,  shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  sm: { shadowColor: palette.black, shadowOpacity: 0.10, shadowRadius: 6,  shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  xs: { shadowColor: palette.black, shadowOpacity: 0.08, shadowRadius: 3,  shadowOffset: { width: 0, height: 2 }, elevation: 1 },
};

/* --------- Inyecta helpers dentro de los temas para uso por método --------- */
const helperBundle = {
  withOpacity,
  mix,
  lighten,
  darken,
  contrastText,
  palette,
  getColors,
  typography,
  shadows,
  radius,
  spacing,
  z,
  isDarkScheme,
};
Object.assign(lightColors, helperBundle);
Object.assign(darkColors, helperBundle);

/* ------------------------------ Default export ----------------------------- */
// Exportamos por defecto el tema oscuro para alinear con el login/admin
export default darkColors;

/* --------------------------------- Notas ---------------------------------- */
/*
USO 1 (compat):
  import Colors from "../theme/color";
  const bg = Colors.withOpacity(Colors.primary, 0.1);

USO 2 (tema por esquema):
  import Colors, { getColors, spacing } from "../theme/color";
  const theme = getColors("system"); // o "dark" | "light"
  const pad   = spacing(3);
*/
