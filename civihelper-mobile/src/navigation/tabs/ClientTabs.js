// src/navigation/tabs/ClientTabs.js
import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { View, StyleSheet, Platform, Text } from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

// Importar las pantallas cliente
import ClientHome from "../../screens/client/ClientHome";
import ClientServices from "../../screens/client/ClientServices";
import ConversationsScreen from "../../screens/ConversationsScreen"; // ✅ NUEVO
import ClientBookings from "../../screens/client/ClientBookings";
import ClientProfile from "../../screens/client/ClientProfile";

const Tab = createBottomTabNavigator();

/* =========================
   PALETA DE COLORES - PÁGINAS AMARILLAS CHILE
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
  let badgeCount = 0;

  switch (route.name) {
    case "ClientHome":
      iconName = "home";
      break;
    case "ClientServices":
      iconName = "search";
      break;
    case "ClientConversations": // ✅ NUEVO
      iconName = "message-circle";
      badgeCount = 0; // Puedes conectar con estado para mostrar no leídos
      break;
    case "ClientBookings":
      iconName = "calendar";
      badgeCount = 3; // Ejemplo: mostrar 3 reservas pendientes
      break;
    case "ClientProfile":
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
export default function ClientTabs() {
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
            case "ClientHome":
              label = "Inicio";
              break;
            case "ClientServices":
              label = "Servicios";
              break;
            case "ClientConversations": // ✅ NUEVO
              label = "Mensajes";
              break;
            case "ClientBookings":
              label = "Reservas";
              break;
            case "ClientProfile":
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
        name="ClientHome"
        component={ClientHome}
        options={{
          title: "Inicio",
        }}
      />
      <Tab.Screen
        name="ClientServices"
        component={ClientServices}
        options={{
          title: "Servicios",
        }}
      />
      {/* ✅ TAB DE MENSAJES */}
      <Tab.Screen
        name="ClientConversations"
        component={ConversationsScreen}
        options={{
          title: "Mensajes",
        }}
      />
      <Tab.Screen
        name="ClientBookings"
        component={ClientBookings}
        options={{
          title: "Mis Reservas",
        }}
      />
      <Tab.Screen
        name="ClientProfile"
        component={ClientProfile}
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
  // Tab Bar Principal - fondo blanco limpio con borde amarillo distintivo
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