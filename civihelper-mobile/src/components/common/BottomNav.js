import React, { memo } from "react";
import { View, Text, TouchableOpacity, Platform, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";

/**
 * BottomNav (estilo glass) - Reusable
 * Props:
 * - navigation: react-navigation object
 * - items: [{ key, label, icon, route, onPress }]
 * - activeRouteName: string
 * - theme: { cardBg, cardBorder, iconBg, iconActiveBg, iconActiveBorder }
 */
function BottomNav({ navigation, items = [], activeRouteName, theme }) {
  const T = { ...DEFAULT_THEME, ...(theme || {}) };

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <View
        style={[
          styles.bar,
          { backgroundColor: T.cardBg, borderColor: T.cardBorder },
          Platform.select({ web: { boxShadow: "0 20px 60px rgba(0,0,0,0.45)" } }),
        ]}
      >
        {items.map((it) => {
          const isActive =
            activeRouteName === it.key ||
            activeRouteName === it.route ||
            activeRouteName === it.label;

          const handlePress = () => {
            if (typeof it.onPress === "function") return it.onPress();
            if (navigation && it.route) navigation.navigate(it.route);
          };

          return (
            <TouchableOpacity
              key={it.key}
              style={styles.item}
              activeOpacity={0.9}
              onPress={handlePress}
              accessibilityRole="button"
              accessibilityLabel={it.label}
            >
              <View
                style={[
                  styles.iconBox,
                  {
                    backgroundColor: isActive ? T.iconActiveBg : T.iconBg,
                    borderColor: isActive ? T.iconActiveBorder : T.cardBorder,
                  },
                ]}
              >
                <Feather name={it.icon} size={18} color="#fff" />
              </View>
              <Text style={[styles.label, { opacity: isActive ? 1 : 0.85 }]} numberOfLines={1}>
                {it.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={{ height: Platform.OS === "ios" ? 6 : 0 }} />
    </View>
  );
}

const DEFAULT_THEME = {
  cardBg: "rgba(255,255,255,0.06)",
  cardBorder: "rgba(255,255,255,0.10)",
  iconBg: "rgba(255,255,255,0.08)",
  iconActiveBg: "rgba(124,58,237,0.22)",
  iconActiveBorder: "rgba(124,58,237,0.45)",
};

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0, right: 0, bottom: 0,
    paddingHorizontal: 18,
    paddingBottom: Platform.OS === "ios" ? 10 : 12,
    zIndex: 10,
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 10,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.28, shadowRadius: 18, shadowOffset: { width: 0, height: 10 } },
      android: { elevation: 8 },
    }),
  },
  item: { flex: 1, alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 4 },
  iconBox: {
    width: 32, height: 32, borderRadius: 999,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1,
  },
  label: { fontSize: 12, fontWeight: "700", color: "#fff" },
});

export default memo(BottomNav);

/* Helpers */
export const defaultHomeItems = () => ([
  { key: "Explore",   label: "Explorar",    icon: "compass",        route: "Search" },
  { key: "MyReviews", label: "Mis reseñas", icon: "message-square", route: "MyReviews" },
  { key: "Favorites", label: "Favoritos",   icon: "star",           route: "Favorites" },
  { key: "Settings",  label: "Ajustes",     icon: "settings",       route: "Settings" },
]);

export const getActiveRouteName = (navigation) => {
  const state = navigation?.getState?.();
  return state?.routes?.[state?.index ?? 0]?.name || "Home";
};
