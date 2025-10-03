// src/components/common/EmptyState.js
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";

const Colors = {
  text: "#0F172A",
  subtext: "#475569",
  border: "#E5E7EB",
  primary: "#1E88E5",
};

export default function EmptyState({
  title = "Sin resultados",
  subtitle = "Intenta cambiar los filtros o realizar otra búsqueda.",
  icon = <Feather name="inbox" size={28} color={Colors.subtext} />,
  actionLabel,
  onAction,
  style,
}) {
  return (
    <View style={[styles.wrap, style]} accessibilityRole="text">
      <View style={styles.iconBox}>{icon}</View>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {actionLabel && onAction ? (
        <TouchableOpacity onPress={onAction} style={styles.cta} accessibilityRole="button">
          <Text style={styles.ctaText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center", paddingVertical: 24, paddingHorizontal: 16 },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  title: { fontSize: 16, fontWeight: "800", color: Colors.text, textAlign: "center" },
  subtitle: { marginTop: 6, color: Colors.subtext, textAlign: "center" },
  cta: { marginTop: 12, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: Colors.primary },
  ctaText: { color: Colors.primary, fontWeight: "700" },
});
