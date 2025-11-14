// src/components/common/ServiceCard.js
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { MaterialIcons, Feather } from "@expo/vector-icons";
import RatingStars from "./RatingStars";

// Paleta Páginas Amarillas
const Colors = {
  primary: "#FFD100",
  primaryDark: "#F5C400",
  primaryLight: "#FFF8CC",
  purple: "#7C3AED",
  success: "#10B981",
  text: "#0F172A",
  subtext: "#64748B",
  border: "#E5E7EB",
  card: "#FFFFFF",
  bg: "#FAFAFA",
};

const makeShadow = () =>
  Platform.OS === "android"
    ? { elevation: 2 }
    : { shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } };

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
      activeOpacity={0.7}
      style={[styles.card, compact && styles.cardCompact, style]}
      accessibilityRole="button"
      accessibilityLabel={`Servicio ${item?.title || "Servicio"}`}
    >
      {/* Icono del servicio */}
      <View style={styles.iconContainer}>
        <MaterialIcons name="home-repair-service" size={22} color={Colors.text} />
      </View>

      {/* Contenido principal */}
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>
          {item?.title || "Servicio"}
        </Text>
        
        <View style={styles.metaRow}>
          {city && (
            <View style={styles.metaItem}>
              <Feather name="map-pin" size={12} color={Colors.subtext} />
              <Text style={styles.metaText} numberOfLines={1}>
                {city}
              </Text>
            </View>
          )}
          <View style={styles.metaItem}>
            <Feather name="dollar-sign" size={12} color={Colors.success} />
            <Text style={[styles.metaText, { color: Colors.success, fontWeight: "600" }]}>
              {price}
            </Text>
          </View>
        </View>

        {showRating && (
          <View style={styles.ratingRow}>
            <RatingStars rating={Number(item?.ratingAvg ?? 0)} size={12} />
            <Text style={styles.ratingCount}>
              {item?._count?.reviews != null ? `(${item._count.reviews})` : "(0)"}
            </Text>
          </View>
        )}
      </View>

      {/* Acción derecha */}
      <View style={styles.trailing}>
        {typeof trailing === "function" ? (
          trailing(item)
        ) : (
          <View style={styles.badge}>
            <Feather name="star" size={14} color={Colors.primary} />
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
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    ...makeShadow(),
  },
  cardCompact: { 
    paddingVertical: 10, 
    paddingHorizontal: 12 
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    gap: 6,
  },
  title: { 
    color: Colors.text, 
    fontWeight: "800",
    fontSize: 15,
    marginBottom: 2,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: { 
    color: Colors.subtext, 
    fontSize: 12,
    fontWeight: "500",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  ratingCount: { 
    color: Colors.subtext, 
    fontSize: 11,
    fontWeight: "600",
  },
  trailing: {
    alignItems: "flex-end",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  badgeText: { 
    fontWeight: "800", 
    fontSize: 13, 
    color: Colors.text 
  },
});