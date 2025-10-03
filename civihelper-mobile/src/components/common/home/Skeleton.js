// src/components/common/Skeleton.js
import React from "react";
import { View, StyleSheet, Platform } from "react-native";

export const Skeleton = ({ w = "100%", h = 14, r = 12, style }) => (
  <View style={[styles.base, { width: w, height: h, borderRadius: r }, style]} />
);

const styles = StyleSheet.create({
  base: {
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.08)",
    ...Platform.select({
      web: { animation: "pulse 1.4s ease-in-out infinite" },
      default: {},
    }),
  },
});
