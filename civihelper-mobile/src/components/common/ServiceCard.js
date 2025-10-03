// src/components/common/ServiceCard.js
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { MaterialIcons, Feather } from "@expo/vector-icons";
import RatingStars from "./RatingStars";

const Colors = {
  primary: "#1E88E5",
  text: "#0F172A",
  subtext: "#475569",
  card: "#FFFFFF",
  border: "#E5E7EB",
};

export default function ServiceCard({
  item,
  onPress,
  trailing, // (item) => ReactNode
  style,
  compact = false,
  showRating = true,
}) {
  const price = item?.priceFrom != null ? `Desde $${item.priceFrom}` : "Precio a convenir";
  const city = item?.city ? item.city : null;

  return (
    <TouchableOpacity
      onPress={() => onPress?.(item)}
      activeOpacity={0.9}
      style={[styles.row, compact && styles.rowCompact, style]}
      accessibilityRole="button"
      accessibilityLabel={`Servicio ${item?.title || "Servicio"}`}
    >
      <View style={styles.thumb}>
        <MaterialIcons name="home-repair-service" size={20} color="#fff" />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.title} numberOfLines={1}>
          {item?.title || "Servicio"}
        </Text>
        <Text style={styles.meta} numberOfLines={2}>
          {city ? `${city} · ` : ""}
          {price}
        </Text>

        {showRating && (
          <View style={{ marginTop: 6, flexDirection: "row", alignItems: "center", gap: 6 }}>
            <RatingStars rating={Number(item?.ratingAvg ?? 0)} size={12} />
            <Text style={styles.metaSmall}>
              {item?._count?.reviews != null ? `(${item._count.reviews})` : ""}
            </Text>
          </View>
        )}
      </View>

      <View style={{ alignItems: "flex-end" }}>
        {typeof trailing === "function" ? trailing(item) : (
          <View style={styles.badge}>
            <Feather name="star" size={12} color="#FBBF24" />
            <Text style={styles.badgeText}>
              {item?.ratingAvg != null ? Number(item.ratingAvg).toFixed(1) : "—"}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    alignItems: "center",
  },
  rowCompact: { paddingVertical: 10, paddingHorizontal: 12 },
  thumb: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { color: Colors.text, fontWeight: "800" },
  meta: { color: Colors.subtext, marginTop: 2, fontSize: 12 },
  metaSmall: { color: Colors.subtext, fontSize: 11 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: "#fff",
  },
  badgeText: { fontWeight: "700", fontSize: 12, color: Colors.text },
});
