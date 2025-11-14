// src/components/home/ServiceRail.js
import React from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import { formatPriceCL } from "../../utils/format";

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
    : { shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } };

function ServiceCardSmall({ item, onPress }) {
  const img = item.coverThumbUrl || item.coverUrl;
  const price = item.priceFrom != null 
    ? `Desde ${formatPriceCL(item.priceFrom)}` 
    : item.price != null 
    ? formatPriceCL(item.price)
    : "Consultar";

  return (
    <TouchableOpacity 
      style={styles.card} 
      onPress={() => onPress?.(item)} 
      activeOpacity={0.8}
      accessibilityRole="button"
    >
      {/* Imagen */}
      {img ? (
        <Image source={{ uri: img }} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Feather name="briefcase" size={32} color={Colors.primary} />
        </View>
      )}

      {/* Badge con rating */}
      {item.ratingAvg != null && item.ratingAvg > 0 && (
        <View style={styles.badge}>
          <Feather name="star" size={10} color={Colors.primary} />
          <Text style={styles.badgeText}>{Number(item.ratingAvg).toFixed(1)}</Text>
        </View>
      )}

      {/* Contenido */}
      <View style={styles.cardContent}>
        <Text style={styles.title} numberOfLines={2}>
          {item.title || "Servicio"}
        </Text>
        
        {item.city && (
          <View style={styles.locationRow}>
            <Feather name="map-pin" size={10} color={Colors.subtext} />
            <Text style={styles.location} numberOfLines={1}>
              {item.city}
            </Text>
          </View>
        )}

        <Text style={styles.price} numberOfLines={1}>
          {price}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function ServiceRail({ 
  title = "Destacados", 
  data = [], 
  onPressItem, 
  onPressSeeAll 
}) {
  if (!Array.isArray(data) || data.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Feather name="star" size={18} color={Colors.primary} />
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        {onPressSeeAll && (
          <TouchableOpacity 
            onPress={onPressSeeAll}
            style={styles.seeAllBtn}
          >
            <Text style={styles.seeAllText}>Ver todo</Text>
            <Feather name="arrow-right" size={14} color={Colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={data}
        horizontal
        keyExtractor={(it, idx) => String(it.id ?? idx)}
        renderItem={({ item }) => <ServiceCardSmall item={item} onPress={onPressItem} />}
        contentContainerStyle={styles.listContent}
        showsHorizontalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    marginTop: 8,
    marginBottom: 16,
  },
  headerRow: { 
    paddingHorizontal: 16, 
    marginBottom: 12, 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center" 
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: "800",
    color: Colors.text,
  },
  seeAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: Colors.primaryLight,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  seeAllText: { 
    color: Colors.text, 
    fontWeight: "700",
    fontSize: 13,
  },
  listContent: {
    paddingHorizontal: 16,
  },
  card: { 
    width: 180, 
    marginRight: 12, 
    backgroundColor: Colors.card, 
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
    ...makeShadow(),
  },
  image: { 
    width: "100%", 
    height: 120, 
    backgroundColor: Colors.bg,
  },
  imagePlaceholder: {
    width: "100%",
    height: 120,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
    ...makeShadow(),
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: Colors.text,
  },
  cardContent: {
    padding: 12,
    gap: 4,
  },
  title: { 
    fontSize: 14, 
    fontWeight: "700",
    color: Colors.text,
    lineHeight: 18,
    minHeight: 36,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  location: {
    fontSize: 11,
    color: Colors.subtext,
    fontWeight: "500",
  },
  price: { 
    fontSize: 13, 
    color: Colors.success, 
    fontWeight: "700",
    marginTop: 4,
  },
});