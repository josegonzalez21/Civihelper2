// src/theme/color.js
import { Appearance, Platform } from "react-native";

/* ------------------------------- Paleta base ------------------------------- */
export const palette = {
  // Core (Primary violeta)
  primary600: "#7C3AED",
  primary500: "#A855F7",
  primary300: "#C4B5FD",
  primary200: "#A78BFA",

  // Accent
  emerald: "#10B981",
  blue: "#3B82F6",

  // Semantic
  success: "#10B981",
  info: "#3B82F6",
  warning: "#F59E0B",
  error: "#EF4444",

  // Superficies
  bgBase: "#0B0A1A",
  bg2: "#140A2E",
  bg3: "#0D0B1F",
  glass: "rgba(255,255,255,0.05)",
  inputBg: "rgba(10,10,25,0.85)",
  bSubtle: "rgba(255,255,255,0.10)",
  bInput: "rgba(255,255,255,0.08)",

  // Texto
  textPrimary: "#FFFFFF",
  textSecondary: "rgba(255,255,255,0.80)",
  textMuted: "rgba(255,255,255,0.70)",
  textHelper: "rgba(255,255,255,0.55)",

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
export function darken(hex, amount = 0.1) { return mix(hex, "#000000", amount); }
export function contrastText(bgHex) {
  const { r, g, b } = hexToRgb(bgHex);
  const L = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return L > 0.55 ? palette.bgBase : palette.white;
}
export const isDarkScheme = () => Appearance?.getColorScheme?.() === "dark";

/* --------------------------------- Temas ---------------------------------- */
export const lightColors = {
  primary: palette.primary600,
  success: palette.success,
  danger: palette.error,
  warn: palette.warning,
  info: palette.info,

  // Superficies y texto (modo claro)
  text: "#0F172A",
  sub: "#333333",
  border: "#E5E7EB",
  card: palette.white,
  bg: "#FAFAFA",

  muted: "#6B7280",
  placeholder: "#666",
  overlay: withOpacity("#0F172A", 0.08),

  gradients: {
    cta: [palette.primary600, palette.primary500],
    hero: [palette.primary600, palette.primary500],
    bg: ["#FFE875", "#FFD100", "#FFF9C4"],
    blob1: [withOpacity(palette.primary600, 0.25), withOpacity(palette.primary500, 0.1)],
    blob2: [withOpacity(palette.emerald, 0.18), withOpacity(palette.blue, 0.12)],
  },

  tags: {
    ok: { bg: withOpacity(palette.success, 0.12), fg: palette.success },
    info: { bg: withOpacity(palette.info, 0.12), fg: palette.info },
    warn: { bg: withOpacity(palette.warning, 0.12), fg: palette.warning },
    error: { bg: withOpacity(palette.error, 0.12), fg: palette.error },
    brand: { bg: withOpacity(palette.primary600, 0.12), fg: palette.primary600 },
  },
};

export const darkColors = {
  primary: palette.primary600,
  primary500: palette.primary500,
  primary300: palette.primary300,
  primary200: palette.primary200,

  success: palette.success,
  danger: palette.error,
  warn: palette.warning,
  info: palette.info,

  text: palette.textPrimary,
  sub: palette.textSecondary,
  border: palette.bSubtle,
  borderInput: palette.bInput,
  card: palette.glass,
  bg: palette.bgBase,
  bg2: palette.bg2,
  bg3: palette.bg3,
  inputBg: palette.inputBg,

  muted: palette.textMuted,
  placeholder: palette.textHelper,
  overlay: withOpacity(palette.black, 0.32),

  gradients: {
    cta: [palette.primary600, palette.primary500],
    hero: [palette.primary600, palette.primary500],
    bg: ["#0D0B1F", "#140A2E", "#0B0A1A"],
    blob1: [withOpacity(palette.primary600, 0.35), withOpacity(palette.primary500, 0.12)],
    blob2: [withOpacity(palette.emerald, 0.18), withOpacity(palette.blue, 0.12)],
  },

  tags: {
    ok: { bg: withOpacity(palette.success, 0.2), fg: lighten(palette.success, 0.12) },
    info: { bg: withOpacity(palette.info, 0.2), fg: lighten(palette.info, 0.14) },
    warn: { bg: withOpacity(palette.warning, 0.2), fg: lighten(palette.warning, 0.14) },
    error: { bg: withOpacity(palette.error, 0.2), fg: lighten(palette.error, 0.12) },
    brand: { bg: withOpacity(palette.primary600, 0.18), fg: lighten(palette.primary600, 0.15) },
  },
};

/* Tema adaptable */
export function getColors(scheme = "light") {
  if (scheme === "system") return isDarkScheme() ? darkColors : lightColors;
  return scheme === "dark" ? darkColors : lightColors;
}

/* -------------------- Tipografía / layout / sombras / z -------------------- */
export const typography = {
  family: Platform.select({ ios: "System", android: "sans-serif", default: "System" }),
  size: { xs: 11, sm: 12, md: 14, lg: 16, xl: 18, "2xl": 22, "3xl": 26 },
  weight: { regular: "400", medium: "600", bold: "800", black: "900" },
};

const SP_UNIT = 4;
export const spacing = (n = 1) => n * SP_UNIT;
Object.assign(spacing, { unit: SP_UNIT, xs: 6, sm: 8, md: 12, lg: 16, xl: 20, "2xl": 24 });

export const radius = (n = 1) => n * 8;
Object.assign(radius, { xs: 8, sm: 12, md: 16, lg: 22, xl: 28 });

export const z = { base: 1, fab: 10, modal: 100, toast: 1000 };

export const shadows = Platform.select({
  web: {
    lg: { boxShadow: "0 6px 14px rgba(0, 0, 0, 0.16)" },
    md: { boxShadow: "0 4px 8px rgba(0, 0, 0, 0.12)" },
    sm: { boxShadow: "0 3px 6px rgba(0, 0, 0, 0.1)" },
    xs: { boxShadow: "0 2px 3px rgba(0, 0, 0, 0.08)" },
  },
  default: {
    lg: { shadowColor: palette.black, shadowOpacity: 0.16, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 5 },
    md: { shadowColor: palette.black, shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
    sm: { shadowColor: palette.black, shadowOpacity: 0.1, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
    xs: { shadowColor: palette.black, shadowOpacity: 0.08, shadowRadius: 3, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  },
});

/* --------- Helpers disponibles en ambos temas --------- */
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
// ⚙️ Ahora el tema por defecto es CLARO, para texto oscuro en inputs
export default lightColors;
