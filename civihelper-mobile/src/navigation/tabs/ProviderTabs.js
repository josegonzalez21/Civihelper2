// src/navigation/tabs/ProviderTabs.js
import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { View, StyleSheet, Platform, Text } from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

// Importar las pantallas proveedor
import ProviderHome from "../../screens/provider/ProviderHome";
import ProviderBookings from "../../screens/provider/ProviderBookings";
import ConversationsScreen from "../../screens/ConversationsScreen"; // ✅ NUEVO
import ProviderServices from "../../screens/provider/ProviderServices";
import ProviderProfile from "../../screens/provider/ProviderProfile";

const Tab = createBottomTabNavigator();

/* =========================
   PALETA DE COLORES - PÁGINAS AMARILLAS CHILE (PROVIDER)
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
function TabIcon({ route, focused, color, size, pendingBookings }) {
  let iconName;
  let badgeCount = 0;

  switch (route.name) {
    case "ProviderHome":
      iconName = "home";
      break;
    case "ProviderBookings":
      iconName = "calendar";
      badgeCount = pendingBookings;
      break;
    case "ProviderConversations": // ✅ NUEVO
      iconName = "message-circle";
      badgeCount = 0; // Puedes conectar con estado de mensajes no leídos
      break;
    case "ProviderServices":
      iconName = "briefcase";
      break;
    case "ProviderProfile":
      iconName = "user";
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
      
      {/* Badge de notificaciones */}
      {badgeCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {badgeCount > 9 ? '9+' : badgeCount}
          </Text>
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
export default function ProviderTabs() {
  // Simulación de datos - puedes conectarlo a tu contexto/estado
  const pendingBookings = 3; // Número de reservas pendientes

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
            pendingBookings={pendingBookings}
          />
        ),
        tabBarLabel: ({ focused }) => {
          let label;
          switch (route.name) {
            case "ProviderHome":
              label = "Inicio";
              break;
            case "ProviderBookings":
              label = "Reservas";
              break;
            case "ProviderConversations": // ✅ NUEVO
              label = "Mensajes";
              break;
            case "ProviderServices":
              label = "Servicios";
              break;
            case "ProviderProfile":
              label = "Perfil";
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
        name="ProviderHome"
        component={ProviderHome}
        options={{
          title: "Dashboard",
        }}
      />
      <Tab.Screen
        name="ProviderBookings"
        component={ProviderBookings}
        options={{
          title: "Reservas",
        }}
      />
      {/* ✅ TAB DE MENSAJES */}
      <Tab.Screen
        name="ProviderConversations"
        component={ConversationsScreen}
        options={{
          title: "Mensajes",
        }}
      />
      <Tab.Screen
        name="ProviderServices"
        component={ProviderServices}
        options={{
          title: "Mis Servicios",
        }}
      />
      <Tab.Screen
        name="ProviderProfile"
        component={ProviderProfile}
        options={{
          title: "Mi Perfil",
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
    paddingHorizontal: 4, // Reducido para 5 tabs
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

  // Badge de notificaciones - rojo característico
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: COLORS.white,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3,
      },
      android: {
        elevation: 4,
      },
    }),
  },

  badgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '900',
    lineHeight: 12,
  },

  // Labels - tipografía bold y clara
  tabLabel: {
    fontSize: 9, // Reducido para 5 tabs
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