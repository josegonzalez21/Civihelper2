import React, { memo, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Platform,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { Feather } from "@expo/vector-icons";

/**
 * BottomNav Component - Glassmorphism Style Navigation Bar
 *
 * Props:
 * - navigation: react-navigation object
 * - items: array of { key, label, icon, route, badge?, color? }
 * - activeRouteName: current active route name
 * - theme: custom theme object (optional)
 * - onItemPress: callback when item is pressed (optional)
 */
function BottomNav({
  navigation,
  items = [],
  activeRouteName,
  theme,
  onItemPress,
}) {
  const finalTheme = useMemo(() => {
    return { ...DEFAULT_THEME, ...(theme || {}) };
  }, [theme]);

  const handleItemPress = (item) => {
    if (typeof onItemPress === "function") {
      onItemPress(item);
    }

    if (typeof item.onPress === "function") {
      item.onPress();
      return;
    }

    if (navigation && item.route) {
      navigation.navigate(item.route);
    }
  };

  const isItemActive = (item) => {
    return (
      activeRouteName === item.key ||
      activeRouteName === item.route ||
      activeRouteName === item.label
    );
  };

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        { paddingBottom: Platform.OS === "ios" ? 6 : 12 },
      ]}
      edges={["bottom"]}
    >
      <View style={styles.container}>
        <View
          style={[
            styles.navBar,
            {
              backgroundColor: finalTheme.cardBg,
              borderColor: finalTheme.cardBorder,
            },
            Platform.select({
              ios: {
                shadowColor: finalTheme.shadowColor,
                shadowOpacity: 0.3,
                shadowRadius: 16,
                shadowOffset: { width: 0, height: -4 },
              },
              android: { elevation: 12 },
            }),
          ]}
        >
          {items.map((item, index) => {
            const active = isItemActive(item);
            const itemColor = item.color || finalTheme.iconActiveBg;

            return (
              <TouchableOpacity
                key={item.key || index}
                style={styles.navItem}
                activeOpacity={0.7}
                onPress={() => handleItemPress(item)}
                accessibilityRole="tab"
                accessibilityLabel={item.label}
                accessibilityState={{ selected: active }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                {/* Icon Container */}
                <View
                  style={[
                    styles.iconContainer,
                    {
                      backgroundColor: active
                        ? itemColor
                        : finalTheme.iconBg,
                      borderColor: active
                        ? itemColor
                        : finalTheme.cardBorder,
                    },
                  ]}
                >
                  <Feather
                    name={item.icon}
                    size={20}
                    color="#fff"
                    style={{ opacity: active ? 1 : 0.8 }}
                  />

                  {/* Badge */}
                  {item.badge && item.badge > 0 && (
                    <View
                      style={[
                        styles.badge,
                        { backgroundColor: item.badgeColor || "#FF4444" },
                      ]}
                    >
                      <Text style={styles.badgeText}>
                        {item.badge > 99 ? "99+" : item.badge}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Label */}
                <Text
                  style={[
                    styles.label,
                    {
                      opacity: active ? 1 : 0.7,
                      color: active ? "#fff" : "#ccc",
                      fontWeight: active ? "800" : "600",
                    },
                  ]}
                  numberOfLines={1}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}

const DEFAULT_THEME = {
  cardBg: "rgba(30, 30, 30, 0.88)",
  cardBorder: "rgba(255, 255, 255, 0.1)",
  iconBg: "rgba(255, 255, 255, 0.08)",
  iconActiveBg: "rgba(33, 150, 243, 0.3)",
  iconActiveBorder: "rgba(33, 150, 243, 0.6)",
  shadowColor: "#000",
};

const styles = StyleSheet.create({
  safeArea: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
  },
  container: {
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === "android" ? 12 : 0,
  },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 12,
    gap: 4,
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 4,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    position: "relative",
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
    maxWidth: 50,
  },
  badge: {
    position: "absolute",
    top: -6,
    right: -6,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: DEFAULT_THEME.cardBg,
    paddingHorizontal: 4,
  },
  badgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "800",
  },
});

export default memo(BottomNav);

/**
 * Helper: Generate default navigation items
 * Use this or create custom items based on your app structure
 */
export const createNavItems = (config = {}) => {
  const defaults = [
    {
      key: "Home",
      label: "Inicio",
      icon: "home",
      route: "Home",
      color: "rgba(59, 130, 246, 0.3)",
    },
    {
      key: "Search",
      label: "Explorar",
      icon: "search",
      route: "Search",
      color: "rgba(34, 197, 94, 0.3)",
    },
    {
      key: "Bookings",
      label: "Reservas",
      icon: "calendar",
      route: "Bookings",
      badge: config.bookingsBadge || 0,
      badgeColor: "#FF6B6B",
      color: "rgba(99, 102, 241, 0.3)",
    },
    {
      key: "Messages",
      label: "Mensajes",
      icon: "message-square",
      route: "Messages",
      badge: config.messagesBadge || 0,
      badgeColor: "#FF8C00",
      color: "rgba(236, 72, 153, 0.3)",
    },
    {
      key: "Profile",
      label: "Perfil",
      icon: "user",
      route: "Profile",
      color: "rgba(168, 85, 247, 0.3)",
    },
  ];

  return defaults;
};

/**
 * Helper: Get active route name from navigation state
 */
export const getActiveRouteName = (navigation) => {
  const state = navigation?.getState?.();
  if (!state) return "Home";

  const route = state.routes?.[state.index ?? 0];
  return route?.name || "Home";
};

/**
 * Helper: Create admin navigation items
 */
export const createAdminNavItems = (config = {}) => {
  return [
    {
      key: "AdminHome",
      label: "Panel",
      icon: "grid",
      route: "AdminHome",
      color: "rgba(59, 130, 246, 0.3)",
    },
    {
      key: "AdminUsers",
      label: "Usuarios",
      icon: "users",
      route: "AdminUsers",
      badge: config.usersBadge || 0,
      badgeColor: "#FF6B6B",
      color: "rgba(34, 197, 94, 0.3)",
    },
    {
      key: "AdminServices",
      label: "Servicios",
      icon: "briefcase",
      route: "AdminServices",
      color: "rgba(99, 102, 241, 0.3)",
    },
    {
      key: "AdminModeration",
      label: "Moderación",
      icon: "shield",
      route: "AdminModeration",
      badge: config.moderationBadge || 0,
      badgeColor: "#FF8C00",
      color: "rgba(236, 72, 153, 0.3)",
    },
    {
      key: "AdminSettings",
      label: "Ajustes",
      icon: "settings",
      route: "AdminSettings",
      color: "rgba(168, 85, 247, 0.3)",
    },
  ];
};