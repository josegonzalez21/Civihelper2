// src/components/home/ServiceRail.js
import React from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image } from "react-native";
import { formatPriceCL } from "../../utils/format";

function ServiceCardSmall({ item, onPress }) {
  const img = item.coverThumbUrl || item.coverUrl;
  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress?.(item)} accessibilityRole="button">
      <Image source={{ uri: img }} style={styles.image} resizeMode="cover" />
      <Text style={styles.title} numberOfLines={1}>{item.title || "Servicio"}</Text>
      {item.price != null && <Text style={styles.price}>{formatPriceCL(item.price)}</Text>}
    </TouchableOpacity>
  );
}

export default function ServiceRail({ title = "Destacados", data = [], onPressItem, onPressSeeAll }) {
  if (!Array.isArray(data) || data.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {onPressSeeAll && (
          <TouchableOpacity onPress={onPressSeeAll}><Text style={styles.link}>Ver todo</Text></TouchableOpacity>
        )}
      </View>

      <FlatList
        data={data}
        horizontal
        keyExtractor={(it, idx) => String(it.id ?? idx)}
        renderItem={({ item }) => <ServiceCardSmall item={item} onPress={onPressItem} />}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        showsHorizontalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 8 },
  headerRow: { paddingHorizontal: 16, marginBottom: 6, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { fontSize: 16, fontWeight: "700" },
  link: { color: "#0ea5e9", fontWeight: "700" },
  card: { width: 160, marginRight: 12, backgroundColor: "white", borderRadius: 14, overflow: "hidden", elevation: 1, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  image: { width: "100%", height: 100, backgroundColor: "#e2e8f0" },
  title: { paddingHorizontal: 10, paddingTop: 8, fontSize: 13, fontWeight: "700" },
  price: { paddingHorizontal: 10, paddingBottom: 8, fontSize: 12, color: "#0f766e", fontWeight: "600" },
});
