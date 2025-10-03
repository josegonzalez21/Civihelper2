// src/components/home/CategoryGrid.js
import React from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image } from "react-native";

function CategoryItem({ item, onPress }) {
  return (
    <TouchableOpacity style={styles.item} onPress={() => onPress?.(item)} accessibilityRole="button">
      {item.iconUrl ? (
        <Image source={{ uri: item.iconUrl }} style={styles.icon} resizeMode="cover" />
      ) : (
        <View style={[styles.icon, styles.iconFallback]}><Text style={styles.iconText}>{(item.name || "C").charAt(0)}</Text></View>
      )}
      <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
    </TouchableOpacity>
  );
}

export default function CategoryGrid({ categories = [], onPressCategory }) {
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Categorías</Text>
      </View>

      <FlatList
        data={categories}
        numColumns={3}
        keyExtractor={(it, idx) => String(it.id ?? idx)}
        renderItem={({ item }) => <CategoryItem item={item} onPress={onPressCategory} />}
        columnWrapperStyle={{ justifyContent: "space-between" }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8 }}
        showsVerticalScrollIndicator={false}
        scrollEnabled={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 8 },
  headerRow: { paddingHorizontal: 16, marginBottom: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 16, fontWeight: "700" },
  item: { width: "31%", backgroundColor: "#f1f5f9", borderRadius: 14, paddingVertical: 12, paddingHorizontal: 8, alignItems: "center", marginBottom: 10 },
  icon: { width: 56, height: 56, borderRadius: 12, marginBottom: 8 },
  iconFallback: { backgroundColor: "#e2e8f0", alignItems: "center", justifyContent: "center" },
  iconText: { fontWeight: "800", fontSize: 18, color: "#334155" },
  name: { textAlign: "center", fontSize: 13, color: "#0f172a" },
});
