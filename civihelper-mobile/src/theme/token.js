// src/theme/token.js
import { Platform, StyleSheet } from "react-native";

/* ===============================
   🎨 Colores base
=============================== */
export const colors = {
  // Fondo principal (gradiente oscuro usado en login)
  bg: ["#0d0b1f", "#140a2e", "#0b0a1a"],

  // Decorativos (blobs)
  blobA: ["rgba(124,58,237,0.35)", "rgba(168,85,247,0.12)"],
  blobB: ["rgba(16,185,129,0.18)", "rgba(59,130,246,0.12)"],

  // Texto
  text: "#ffffff",
  textMuted: "rgba(255,255,255,0.8)",
  label: "rgba(255,255,255,0.9)",
  placeholder: "rgba(255,255,255,0.55)",

  // Bordes / inputs
  border: "rgba(255,255,255,0.10)",
  inputBorder: "rgba(255,255,255,0.08)",
  inputBg: "rgba(10,10,25,0.85)",

  // Botón principal
  ctaGradient: ["#7c3aed", "#a855f7"],

  // Links
  link: "#a78bfa",
  altLink: "#c4b5fd",

  // Estados
  error: "#f87171",
  success: "#43A047",
  primary: "#1E88E5",

  // Notas
  notice: "rgba(255,255,255,0.75)",
};

/* ===============================
   📐 Radius
=============================== */
export const radius = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  pill: 999,
};

/* ===============================
   📏 Espaciados
=============================== */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

/* ===============================
   ✍️ Tipografía
=============================== */
export const typography = {
  h1: { fontSize: 32, fontWeight: "800", color: colors.text },
  h2: { fontSize: 24, fontWeight: "700", color: colors.text },
  body: { fontSize: 14, color: colors.textMuted },
  caption: { fontSize: 12, color: colors.textMuted },
};

/* ===============================
   🌑 Sombras (cross-platform)
=============================== */
export const shadows = StyleSheet.create({
  card: Platform.select({
    web: { boxShadow: "0 30px 90px rgba(0,0,0,0.45)", backdropFilter: "blur(14px) saturate(120%)" },
    ios: { shadowColor: "#000", shadowOpacity: 0.28, shadowRadius: 18, shadowOffset: { width: 0, height: 10 } },
    android: { elevation: 6 },
  }),
  cta: Platform.select({
    web: { boxShadow: "0 14px 40px rgba(124,58,237,0.45)" },
    ios: { shadowColor: "#7c3aed", shadowOpacity: 0.55, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } },
    android: { elevation: 3 },
  }),
  social: Platform.select({
    web: { boxShadow: "0 6px 20px rgba(0,0,0,0.3)" },
    ios: { shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
    android: { elevation: 3 },
  }),
});
