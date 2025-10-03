// src/navigation/tabs/AdminTabs.js
import React from "react";
import { View, Platform } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";

// ✅ ruta correcta al theme unificado
import Colors, { spacing, radius } from "../theme/color";

import AdminHome from "../screens/home/AdminHome";
import AdminUsers from "../screens/admin/AdminUsers";
import AdminCategories from "../screens/admin/AdminCategories";
import AdminServices from "../screens/admin/AdminServices";
import AdminModeration from "../screens/admin/AdminModeration";
import SettingsScreen from "../screens/SettingsScreen";

const Tab = createBottomTabNavigator();

// Gradiente de la barra (mismo vibe del login)
const TAB_GRADIENT = Colors?.gradients?.login || ["#7C3AED", "#A855F7"];

const TabBg = () => (
  <LinearGradient
    colors={TAB_GRADIENT}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 0 }}
    style={{
      flex: 1,
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
    }}
  />
);

export default function AdminTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        sceneContainerStyle: { backgroundColor: Colors.bg },

        // Texto e iconos
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.withOpacity(Colors.text, 0.55),
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700",
          marginBottom: Platform.OS === "ios" ? 0 : 2,
        },

        // Estilo de la barra
        tabBarStyle: {
          position: "absolute",
          height: 64,
          paddingTop: 6,
          paddingBottom: Platform.OS === "ios" ? 18 : 10,
          paddingHorizontal: spacing.lg,
          backgroundColor: "transparent", // lo pinta el gradiente
          borderTopWidth: 0,
          elevation: 0,
        },
        tabBarBackground: () => <TabBg />,

        // Iconos
        tabBarIcon: ({ color, size, focused }) => {
          const map = {
            Panel: "home",
            Usuarios: "users",
            Categorías: "grid",
            Servicios: "briefcase",
            Moderación: "shield",
            Ajustes: "settings",
          };
          const name = map[route.name] || "circle";
          return (
            <View
              style={{
                alignItems: "center",
                justifyContent: "center",
                width: 30,
                height: 30,
                borderRadius: 10,
                backgroundColor: focused
                  ? Colors.withOpacity(Colors.card, 0.18)
                  : "transparent",
                borderWidth: focused ? 1 : 0,
                borderColor: focused
                  ? Colors.withOpacity(Colors.card, 0.28)
                  : "transparent",
              }}
            >
              <Feather name={name} size={size} color={color} />
            </View>
          );
        },
      })}
    >
      <Tab.Screen name="Panel" component={AdminHome} />
      <Tab.Screen name="Usuarios" component={AdminUsers} />
      <Tab.Screen name="Categorías" component={AdminCategories} />
      <Tab.Screen name="Servicios" component={AdminServices} />
      <Tab.Screen name="Moderación" component={AdminModeration} />
      <Tab.Screen name="Ajustes" component={SettingsScreen} />
    </Tab.Navigator>
  );
}
