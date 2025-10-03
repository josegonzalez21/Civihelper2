// src/components/home/AnnouncementBanner.js
import React from "react";
import { View, Text, StyleSheet, Pressable, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

export default function AnnouncementBanner({
  title,
  subtitle,
  cta,
  onPress,
  colors = ["#7c3aed", "#a855f7"],
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [{ opacity: pressed ? 0.95 : 1 }, styles.tap]}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${cta || "Abrir"}`}
      hitSlop={6}
    >
      <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.wrap}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {!!subtitle && <Text style={styles.sub} numberOfLines={2}>{subtitle}</Text>}
          {!!cta && <Text style={styles.cta}>{cta} →</Text>}
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tap: { marginTop: 14 },
  wrap: {
    borderRadius: 18,
    padding: 18,
    minHeight: 96,
    ...Platform.select({
      ios: { shadowColor: "#6d28d9", shadowOpacity: 0.35, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } },
      android: { elevation: 3 },
      web: { boxShadow: "0 18px 40px rgba(124,58,237,.35)" },
    }),
  },
  title: { color: "#fff", fontWeight: "900", fontSize: 18, letterSpacing: 0.2 },
  sub: { color: "rgba(255,255,255,0.92)", marginTop: 6, lineHeight: 20 },
  cta: { color: "#fff", fontWeight: "800", marginTop: 10 },
});
