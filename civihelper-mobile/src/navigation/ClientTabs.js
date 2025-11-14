// src/navigation/tabs/ClientTabs.js
import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import Colors from "../../theme/color"; // ✅ ruta corregida

// Pantallas
import ClientHome from "../../screens/client/ClientHome";
import FavoritesScreen from "../../screens/FavoritesScreen";
import MyReviewsScreen from "../../screens/MyReviewsScreen";
import SettingsScreen from "../../screens/SettingsScreen";

const Tab = createBottomTabNavigator();

export default function ClientTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,        // oculta header de cada tab
        tabBarShowLabel: true,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.sub,
        tabBarStyle: {
          backgroundColor: Colors.bg2,
          borderTopColor: Colors.border,
        },
      }}
    >
      <Tab.Screen
        name="ClientHome"
        component={ClientHome}
        options={{
          title: "Inicio",
          tabBarIcon: ({ color, size }) => (
            <Feather name="home" color={color} size={size} />
          ),
        }}
      />

      <Tab.Screen
        name="Favorites"
        component={FavoritesScreen}
        options={{
          title: "Favoritos",
          tabBarIcon: ({ color, size }) => (
            <Feather name="heart" color={color} size={size} />
          ),
        }}
      />

      <Tab.Screen
        name="MyReviews"
        component={MyReviewsScreen}
        options={{
          title: "Reseñas",
          tabBarIcon: ({ color, size }) => (
            <Feather name="star" color={color} size={size} />
          ),
        }}
      />

      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: "Ajustes",
          tabBarIcon: ({ color, size }) => (
            <Feather name="settings" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
