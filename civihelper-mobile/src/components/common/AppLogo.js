// src/components/common/AppLogo.js
import React, { useState } from "react";
import { Image, Text, View, StyleSheet } from "react-native";



export default function AppLogo({ source, size = 28, rounded = false, label = "CiviHelper" }) {
  const [error, setError] = useState(false);

  if (!source || error) {
    return (
      <View
        style={[
          styles.fallback,
          { width: size, height: size, borderRadius: rounded ? size / 5 : 8 },
        ]}
        accessible
        accessibilityRole="image"
        accessibilityLabel={`${label} logo`}
      >
        <Text style={[styles.fallbackText, { fontSize: Math.max(12, size * 0.42) }]}>
          CH
        </Text>
      </View>
    );
  }

  return (
    <Image
      source={source}
      style={{ width: size, height: size, borderRadius: rounded ? size / 5 : 8 }}
      resizeMode="contain"
      onError={() => setError(true)}
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${label} logo`}
    />
  );
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: "#0ea5e9", // azul suave
    alignItems: "center",
    justifyContent: "center",
  },
  fallbackText: {
    color: "white",
    fontWeight: "700",
  },
});
