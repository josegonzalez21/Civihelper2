// src/components/common/CategoryCard.js
import React from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";
import { FontAwesome5 } from "@expo/vector-icons";

const Colors = {
  primary: "#1E88E5",
  text: "#0F172A",
  card: "#FFFFFF",
  border: "#E5E7EB",
};

export default function CategoryCard({ name, onPress, icon, style }) {
  return (
    <TouchableOpacity
      style={[styles.card, style]}
      onPress={onPress}
      activeOpacity={0.9}
      accessibilityRole="button"
      accessibilityLabel={`Categoría ${name}`}
    >
      {icon || <FontAwesome5 name="tools" size={18} color={Colors.primary} />}
      <Text numberOfLines={1} style={styles.text}>
        {name}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 64,
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
    gap: 8,
  },
  text: { color: Colors.text, fontWeight: "700" },
});
