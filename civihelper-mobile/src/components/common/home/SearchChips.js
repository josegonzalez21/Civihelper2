// src/components/home/SearchChips.js
import React, { useRef } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  Animated,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

/**
 * props:
 * - items: [{ key, label, icon }]
 * - onPress: (item) => void
 * - layout: "grid" | "wrap"    // grid = 2 columnas elegantes (default)
 */
export default function SearchChips({ items = [], onPress, layout = "grid" }) {
  return (
    <View
      style={[
        styles.row,
        layout === "grid" ? styles.rowGrid : styles.rowWrap,
      ]}
    >
      {items.map((it, i) => (
        <Chip key={`${it.key}-${i}`} item={it} onPress={onPress} layout={layout} />
      ))}
    </View>
  );
}

function Chip({ item, onPress, layout }) {
  const scale = useRef(new Animated.Value(1)).current;

  const animate = (to) =>
    Animated.spring(scale, {
      toValue: to,
      useNativeDriver: true,
      speed: 22,
      bounciness: 6,
    }).start();

  return (
    <Animated.View
      style={[
        { transform: [{ scale }] },
        layout === "grid" ? styles.cell : null,
      ]}
    >
      {/* Borde gradiente (1px) */}
      <LinearGradient
        colors={["#8b5cf6", "rgba(124,58,237,0.45)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.border}
      >
        <Pressable
          onPress={() => onPress?.(item)}
          onPressIn={() => animate(0.98)}
          onPressOut={() => animate(1)}
          style={({ pressed }) => [
            styles.chip,
            pressed && styles.chipPressed,
          ]}
          android_ripple={{ color: "rgba(255,255,255,0.08)", borderless: false }}
          accessibilityRole="button"
          accessibilityLabel={`Filtro ${item.label}`}
          hitSlop={8}
        >
          <View style={styles.iconBox}>{item.icon}</View>
          <Text style={styles.text} numberOfLines={1}>
            {item.label}
          </Text>
        </Pressable>
      </LinearGradient>
    </Animated.View>
  );
}

const HEIGHT = 44; // recomendado por guías

const styles = StyleSheet.create({
  /* contenedor */
  row: { marginTop: 12 },
  rowWrap: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  rowGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 10,
  },

  /* celda para 2 columnas */
  cell: { width: "48%" },

  /* borde gradiente */
  border: {
    padding: 1, // grosor del borde
    borderRadius: 999,
  },

  /* chip glass */
  chip: {
    minHeight: HEIGHT,
    borderRadius: 999,
    paddingHorizontal: 14,
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.18,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
      },
      android: { elevation: 1 },
      web: { boxShadow: "0 4px 14px rgba(0,0,0,.18)" },
    }),
  },
  chipPressed: { opacity: 0.95 },

  /* icono en pastilla */
  iconBox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },

  text: {
    color: "#fff",
    fontWeight: "800",
    letterSpacing: 0.2,
  },
});
