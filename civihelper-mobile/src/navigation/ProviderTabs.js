// src/navigation/ProviderTabs.js
import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";

// Home por rol (nuevo)
import ProviderHome from "../screens/home/ProviderHome";

// Screens existentes de proveedor
import MyServicesScreen from "../screens/MyServicesScreen";
import ServiceCreateScreen from "../screens/ServiceCreateScreen";
import ProviderStatsScreen from "../screens/ProviderStatsScreen";
import ProfileScreen from "../screens/ProfileScreen"; // o SettingsScreen si prefieres

const Tab = createBottomTabNavigator();

export default function ProviderTabs() {
  return (
    <Tab.Navigator
      initialRouteName="ProviderHome"
      screenOptions={{
        headerShown: true,
      }}
    >
      <Tab.Screen
        name="ProviderHome"
        component={ProviderHome}
        options={{
          title: "Inicio",
          tabBarIcon: ({ color, size }) => <Feather name="home" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="MyServicesTab"
        component={MyServicesScreen}
        options={{
          title: "Mis Servicios",
          tabBarIcon: ({ color, size }) => <Feather name="tool" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="ServiceCreateTab"
        component={ServiceCreateScreen}
        options={{
          title: "Crear",
          tabBarIcon: ({ color, size }) => <Feather name="plus-circle" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="ProviderStatsTab"
        component={ProviderStatsScreen}
        options={{
          title: "Métricas",
          tabBarIcon: ({ color, size }) => <Feather name="bar-chart-2" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="ProviderProfileTab"
        component={ProfileScreen}
        options={{
          title: "Perfil",
          tabBarIcon: ({ color, size }) => <Feather name="user" color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
}
