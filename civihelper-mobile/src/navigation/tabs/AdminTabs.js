// src/navigation/tabs/AdminTabs.js
import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { View, StyleSheet, Platform, Text } from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

// Importar las pantallas admin
import AdminDashboard from "../../screens/admin/AdminDashboard";
import AdminPromotions from "../../screens/admin/AdminPromotions";
import AdminServices from "../../screens/admin/AdminServices";
import AdminUsers from "../../screens/admin/AdminUsers";
import AdminSettings from "../../screens/admin/AdminSettings";

const Tab = createBottomTabNavigator();

/* =========================
   PALETA DE COLORES - PÁGINAS AMARILLAS CHILE (ADMIN)
========================= */
const COLORS = {
  // Amarillos característicos
  primary: "#FFDD00",        // Amarillo icónico Páginas Amarillas
  primaryDark: "#FFB800",    // Amarillo más oscuro
  primaryLight: "#FFF4CC",   // Amarillo suave para fondos
  
  // Negros y grises
  black: "#000000",          // Negro puro (texto principal)
  gray900: "#1A1A1A",        // Gris muy oscuro
  gray700: "#4A4A4A",        // Gris medio oscuro
  gray500: "#787878",        // Gris medio
  gray300: "#C4C4C4",        // Gris claro
  gray100: "#F5F5F5",        // Gris muy claro
  
  // Colores de soporte
  white: "#FFFFFF",
  error: "#E31E24",          // Rojo vibrante
  success: "#00A550",        // Verde
  
  // Sombras
  shadowYellow: "rgba(255, 221, 0, 0.25)",
  shadowBlack: "rgba(0, 0, 0, 0.15)",
};

/* =========================
   COMPONENTE: TAB ICON
========================= */
function TabIcon({ route, focused, color, size }) {
  let iconName;

  switch (route.name) {
    case "AdminDashboard":
      iconName = "bar-chart-2";
      break;
    case "AdminPromotions":
      iconName = "tag";
      break;
    case "AdminServices":
      iconName = "grid";
      break;
    case "AdminUsers":
      iconName = "users";
      break;
    case "AdminSettings":
      iconName = "settings";
      break;
    default:
      iconName = "circle";
  }

  return (
    <View style={styles.iconWrapper}>
      {focused ? (
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.iconContainerActive}
        >
          <Feather name={iconName} size={size + 2} color={COLORS.black} />
        </LinearGradient>
      ) : (
        <View style={styles.iconContainer}>
          <Feather name={iconName} size={size} color={color} />
        </View>
      )}
    </View>
  );
}

/* =========================
   COMPONENTE: TAB LABEL
========================= */
function TabLabel({ label, focused }) {
  return (
    <Text
      style={[
        styles.tabLabel,
        focused && styles.tabLabelActive,
      ]}
      numberOfLines={1}
    >
      {label}
    </Text>
  );
}

/* =========================
   NAVEGACIÓN PRINCIPAL
========================= */
export default function AdminTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: COLORS.black,
        tabBarInactiveTintColor: COLORS.gray500,
        tabBarIcon: ({ focused, color, size }) => (
          <TabIcon 
            route={route} 
            focused={focused} 
            color={color} 
            size={size} 
          />
        ),
        tabBarLabel: ({ focused }) => {
          let label;
          switch (route.name) {
            case "AdminDashboard":
              label = "Dashboard";
              break;
            case "AdminPromotions":
              label = "Promociones";
              break;
            case "AdminServices":
              label = "Servicios";
              break;
            case "AdminUsers":
              label = "Usuarios";
              break;
            case "AdminSettings":
              label = "Ajustes";
              break;
            default:
              label = route.name;
          }
          return <TabLabel label={label} focused={focused} />;
        },
        tabBarHideOnKeyboard: Platform.OS === "android",
        tabBarShowLabel: true,
      })}
    >
      <Tab.Screen
        name="AdminDashboard"
        component={AdminDashboard}
        options={{
          title: "Panel Admin",
        }}
      />
      <Tab.Screen
        name="AdminPromotions"
        component={AdminPromotions}
        options={{
          title: "Promociones",
        }}
      />
      <Tab.Screen
        name="AdminServices"
        component={AdminServices}
        options={{
          title: "Servicios",
        }}
      />
      <Tab.Screen
        name="AdminUsers"
        component={AdminUsers}
        options={{
          title: "Usuarios",
        }}
      />
      <Tab.Screen
        name="AdminSettings"
        component={AdminSettings}
        options={{
          title: "Configuración",
        }}
      />
    </Tab.Navigator>
  );
}

/* =========================
   ESTILOS - INSPIRADOS EN PÁGINAS AMARILLAS
========================= */
const styles = StyleSheet.create({
  // Tab Bar Principal - fondo blanco limpio
  tabBar: {
    backgroundColor: COLORS.white,
    borderTopWidth: 0,
    height: Platform.OS === "ios" ? 90 : 75,
    paddingTop: 8,
    paddingBottom: Platform.OS === "ios" ? 28 : 16,
    paddingHorizontal: 8,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 12,
      },
      web: {
        boxShadow: '0 -2px 12px rgba(0,0,0,0.08)',
      },
    }),
  },

  // Contenedor de iconos
  iconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },

  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },

  // Estado activo con gradiente amarillo
  iconContainerActive: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: `0 4px 12px ${COLORS.shadowYellow}`,
      },
    }),
  },

  // Labels - tipografía bold y clara
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 6,
    color: COLORS.gray500,
    letterSpacing: 0.2,
  },

  tabLabelActive: {
    color: COLORS.black,
    fontWeight: '800',
  },
});