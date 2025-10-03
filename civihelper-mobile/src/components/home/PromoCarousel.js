// src/components/home/PromoCarousel.js
import React from "react";
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Dimensions } from "react-native";
const W = Dimensions.get("window").width;

export default function PromoCarousel({ items = [], onPressItem }) {
  if (!Array.isArray(items) || items.length === 0) return null;

  return (
    <View style={styles.container}>
      <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
        {items.map((it, idx) => (
          <TouchableOpacity key={idx} style={[styles.card, { width: W - 32 }]} onPress={() => onPressItem?.(it)}>
            {it.image ? (
              <Image source={{ uri: it.image }} style={styles.image} />
            ) : (
              <View style={[styles.image, styles.imageFallback]}>
                <Text style={styles.fallbackText}>{it.title || "Promo"}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 8 },
  card: { height: 120, borderRadius: 16, overflow: "hidden", marginRight: 10, backgroundColor: "#0ea5e9" },
  image: { width: "100%", height: "100%" },
  imageFallback: { alignItems: "center", justifyContent: "center" },
  fallbackText: { color: "white", fontWeight: "800", fontSize: 18 },
});
