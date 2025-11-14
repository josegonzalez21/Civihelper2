// src/components/common/Input.js
import React, { useMemo } from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import Colors, { spacing, radius } from "../../theme/color";

/**
 * Sanitiza estilos para evitar valores inválidos en props numéricos,
 * como booleanos o strings tipo "$true"/"true".
 */
function sanitizeStyle(style) {
  const numericKeys = new Set([
    "opacity", "zIndex", "elevation",
    "lineHeight", "letterSpacing", "fontSize",
    "width", "height", "top", "left", "right", "bottom",
    "borderWidth", "borderRadius",
    "padding", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
    "margin", "marginTop", "marginRight", "marginBottom", "marginLeft",
  ]);

  const toCleanObj = (obj) => {
    if (!obj || typeof obj !== "object") return obj;
    const out = { ...obj };
    for (const k of Object.keys(out)) {
      const v = out[k];
      if (numericKeys.has(k)) {
        // si llega booleano o "true"/"$true"/"false"/"$false", lo anulamos
        if (typeof v === "boolean") {
          delete out[k];
        } else if (typeof v === "string" && /^\$?(true|false)$/i.test(v)) {
          delete out[k];
        }
      }
    }
    return out;
  };

  if (Array.isArray(style)) return style.map(toCleanObj);
  return toCleanObj(style);
}

export default function Input({
  label,
  error,
  style,
  rightIcon,           // icono al lado derecho
  containerStyle,
  inputStyle,          // estilo adicional solo para el TextInput
  ...props
}) {
  const safeContainerStyle = useMemo(() => sanitizeStyle(containerStyle), [containerStyle]);
  const safeInputStyle     = useMemo(() => sanitizeStyle(inputStyle), [inputStyle]);
  const safeStyle          = useMemo(() => sanitizeStyle(style), [style]);

  return (
    <View style={[{ marginBottom: spacing?.md ?? 12 }, safeContainerStyle]}>
      {!!label && <Text style={s.label}>{label}</Text>}

      <View style={s.inputWrap}>
        <TextInput
          placeholderTextColor={Colors?.subtext || "#8e8e8e"}
          style={[
            s.input,
            error && s.inputError,
            safeStyle,
            safeInputStyle,
            !!rightIcon && s.inputWithIcon
          ]}
          {...props}
        />
        {!!rightIcon && <View style={s.iconWrap}>{rightIcon}</View>}
      </View>

      {!!error && <Text style={s.err}>{error}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  label: { marginBottom: 6, color: Colors?.subtext || "#6b7280", fontSize: 13 },

  inputWrap: {
    position: "relative",
    justifyContent: "center",
  },

  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: Colors?.border || "#e5e7eb",
    borderRadius: radius?.md ?? 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: Colors?.text || "#111827",
  },

  inputWithIcon: {
    paddingRight: 40, // deja espacio para el icono
  },

  iconWrap: {
    position: "absolute",
    right: 8,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },

  inputError: { borderColor: Colors?.danger || "#ef4444" },
  err: { marginTop: 6, color: Colors?.danger || "#ef4444", fontSize: 12 },
});
