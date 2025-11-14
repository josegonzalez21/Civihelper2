// src/navigation/tabs/AdminTabs.js
import React from "react";
import { View, Platform, StyleSheet } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";

import Colors, { spacing, radius, shadows } from "../../theme/color";

// Reemplazado: usar el dashboard administrativo central
// import AdminHome from "../../screens/home/AdminHome";
import AdminDashboard from "../../screens/admin/AdminDashboard";
import AdminUsers from "../../screens/admin/AdminUsers";
import AdminCategories from "../../screens/admin/AdminCategories";
import AdminServices from "../../screens/admin/AdminServices";
import AdminModeration from "../../screens/admin/AdminModeration";
import SettingsScreen from "../../screens/SettingsScreen";

const Tab = createBottomTabNavigator();

// Background con efecto blur moderno
const TabBackground = () => {
  if (Platform.OS === 'ios') {
    return (
      <BlurView
        intensity={95}
        tint="light"
        style={StyleSheet.absoluteFill}
      />
    );
  }
  
  // Fallback para Android
  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        {
          backgroundColor: Colors.withOpacity(Colors.card, 0.98),
          borderTopWidth: 1,
          borderTopColor: Colors.border,
        },
      ]}
    />
  );
};

export default function AdminTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        sceneContainerStyle: { backgroundColor: Colors.bg },

        // Colores de texto e iconos
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.sub,
        
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700",
          marginBottom: Platform.OS === "ios" ? 0 : 4,
          marginTop: 2,
        },

        // Estilo de la barra
        tabBarStyle: {
          position: "absolute",
          height: Platform.OS === "ios" ? 88 : 70,
          paddingTop: 8,
          paddingBottom: Platform.OS === "ios" ? 24 : 12,
          paddingHorizontal: spacing.sm,
          backgroundColor: "transparent",
          borderTopWidth: 0,
          elevation: 0,
          ...shadows.lg,
        },
        
        tabBarBackground: () => <TabBackground />,

        // Iconos con animación
        tabBarIcon: ({ color, focused }) => {
          const iconMap = {
            Panel: "home",
            Usuarios: "users",
            Categorías: "grid",
            Servicios: "briefcase",
            Moderación: "shield",
            Ajustes: "settings",
          };
          
          const iconName = iconMap[route.name] || "circle";
          const iconSize = focused ? 22 : 20;

          return (
            <View
              style={[
                styles.iconContainer,
                focused && styles.iconContainerFocused,
              ]}
            >
              <Feather name={iconName} size={iconSize} color={color} />
              {focused && <View style={styles.indicator} />}
            </View>
          );
        },

        // Badges para notificaciones (ejemplo)
        tabBarBadge: route.name === "Moderación" ? undefined : undefined,
        tabBarBadgeStyle: {
          backgroundColor: Colors.error,
          color: Colors.card,
          fontSize: 10,
          fontWeight: "800",
          minWidth: 18,
          height: 18,
          borderRadius: 9,
          lineHeight: 18,
          textAlign: "center",
        },
      })}
    >
      <Tab.Screen 
        name="Panel" 
        component={AdminDashboard}
        options={{
          tabBarLabel: "Panel",
        }}
      />
      <Tab.Screen 
        name="Usuarios" 
        component={AdminUsers}
        options={{
          tabBarLabel: "Usuarios",
        }}
      />
      <Tab.Screen 
        name="Categorías" 
        component={AdminCategories}
        options={{
          tabBarLabel: "Categorías",
        }}
      />
      <Tab.Screen 
        name="Servicios" 
        component={AdminServices}
        options={{
          tabBarLabel: "Servicios",
        }}
      />
      <Tab.Screen 
        name="Moderación" 
        component={AdminModeration}
        options={{
          tabBarLabel: "Moderación",
          // Ejemplo: mostrar badge si hay items pendientes
          // tabBarBadge: moderationCount > 0 ? moderationCount : undefined,
        }}
      />
      <Tab.Screen 
        name="Ajustes" 
        component={SettingsScreen}
        options={{
          tabBarLabel: "Ajustes",
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: 48,
    height: 36,
    borderRadius: radius.lg,
    backgroundColor: "transparent",
    position: "relative",
  },
  iconContainerFocused: {
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: Colors.withOpacity(Colors.primary, 0.2),
  },
  indicator: {
    position: "absolute",
    bottom: -6,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.primary,
  },
});