// src/navigation/AppNavigator.js
import React from "react";
import { View, Text } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../context/AuthContext";
import Colors from "../theme/color";

// Públicas
import SplashScreen from "../screens/SplashScreen";
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import ResetPasswordScreen from "../screens/ResetPasswordScreen";
import ForgotPasswordScreen from "../screens/ForgotPasswordScreen";

// Router por rol (Tabs según rol)
import RoleRouter from "./RoleRouter";

// Navegador de Mapa
import MapNavigator from "./MapNavigator";

// Comunes (accesibles desde Tabs)
import SearchScreen from "../screens/SearchScreen";
import CategoryScreen from "../screens/CategoryScreen";
import ServiceDetailScreen from "../screens/ServiceDetailScreen";
import ServiceCreateScreen from "../screens/ServiceCreateScreen";
import MyServicesScreen from "../screens/MyServicesScreen";
import ServiceEditScreen from "../screens/ServiceEditScreen";
import ProviderStatsScreen from "../screens/ProviderStatsScreen";
import SettingsScreen from "../screens/SettingsScreen";
import ProfileScreen from "../screens/ProfileScreen";
import ReviewCreateScreen from "../screens/ReviewCreateScreen";
import FavoritesScreen from "../screens/FavoritesScreen";
import MyReviewsScreen from "../screens/MyReviewsScreen";

// Chat - ✅ Corregido el import
import ConversationsScreen from "../screens/ConversationsScreen";
import ChatScreen from "../screens/ChatScreen";

// Admin
import AdminHome from "../screens/admin/AdminHome";
import AdminDashboard from "../screens/admin/AdminDashboard";
import AdminServices from "../screens/admin/AdminServices";
import AdminUsers from "../screens/admin/AdminUsers";
import AdminModeration from "../screens/admin/AdminModeration";
import AdminCategories from "../screens/admin/AdminCategories";
import AdminPromotionCreate from "../screens/admin/AdminPromotionCreate";
import AdminSettings from "../screens/admin/AdminSettings";
import AdminPromotions from "../screens/admin/AdminPromotions";

const Stack = createNativeStackNavigator();

/** Placeholders mínimos por si aún no existen esas pantallas */
const Placeholder = ({ title = "Próximamente" }) => (
  <View
    style={{
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: Colors.bg,
    }}
  >
    <Text style={{ color: Colors.text, fontSize: 16, fontWeight: "700" }}>
      {title}
    </Text>
  </View>
);

const NewRequestScreen = () => <Placeholder title="Nueva Solicitud" />;
const SupportScreen = () => <Placeholder title="Soporte" />;

export default function AppNavigator() {
  const { loading, token, user } = useAuth();
  const isAuthed = !!token || !!user;

  if (loading) return <SplashScreen />;

  return (
    <Stack.Navigator
      key={isAuthed ? "authed" : "public"}
      initialRouteName={isAuthed ? "RoleRoot" : "Login"}
      screenOptions={{
        headerShown: false,
        animation: "fade",
        detachPreviousScreen: false,
        contentStyle: { backgroundColor: Colors.bg },
      }}
    >
      {isAuthed ? (
        <>
          {/* ======= Contenedor de Tabs por rol ======= */}
          <Stack.Screen
            name="RoleRoot"
            component={RoleRouter}
            options={{ gestureEnabled: false }}
          />

          {/* ======= Pilas estándar (push) ======= */}
          <Stack.Group screenOptions={{ animation: "slide_from_right" }}>
            {/* Admin */}
            <Stack.Screen name="AdminCategories" component={AdminCategories} />
            <Stack.Screen name="AdminDashboard" component={AdminDashboard} />
            <Stack.Screen name="AdminHome" component={AdminHome} />
            <Stack.Screen name="AdminModeration" component={AdminModeration} />
            <Stack.Screen name="AdminPromotionCreate" component={AdminPromotionCreate} />
            <Stack.Screen name="AdminPromotions" component={AdminPromotions} />
            <Stack.Screen name="AdminServices" component={AdminServices} />
            <Stack.Screen name="AdminSettings" component={AdminSettings} />
            <Stack.Screen name="AdminUsers" component={AdminUsers} />

            {/* Comunes */}
            <Stack.Screen name="Search" component={SearchScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="Favorites" component={FavoritesScreen} />
            <Stack.Screen name="MyReviews" component={MyReviewsScreen} />

            {/* Categorías / Detalles */}
            <Stack.Screen name="Category" component={CategoryScreen} />
            <Stack.Screen name="Service" component={ServiceDetailScreen} />
            <Stack.Screen name="ServiceDetail" component={ServiceDetailScreen} />
            <Stack.Screen name="ReviewCreate" component={ReviewCreateScreen} />

            {/* Proveedor (no modales) */}
            <Stack.Screen name="MyServices" component={MyServicesScreen} />
            <Stack.Screen name="ProviderStats" component={ProviderStatsScreen} />

            {/* ✅ Chat - Lista de conversaciones */}
            <Stack.Screen 
              name="Conversations" 
              component={ConversationsScreen}
              options={{
                title: "Mensajes",
                animation: "slide_from_right",
              }}
            />

            {/* ✅ Chat - Conversación individual */}
            <Stack.Screen 
              name="Chat" 
              component={ChatScreen}
              options={{
                animation: "slide_from_right",
              }}
            />
            
            {/* MAPA - Navigator completo */}
            <Stack.Screen 
              name="Map" 
              component={MapNavigator}
              options={{ animation: "slide_from_bottom" }}
            />
          </Stack.Group>

          {/* ======= Modales ======= */}
          <Stack.Group
            screenOptions={{
              presentation: "modal",
              animation: "slide_from_bottom",
            }}
          >
            <Stack.Screen name="ServiceCreate" component={ServiceCreateScreen} />
            <Stack.Screen name="ServiceEdit" component={ServiceEditScreen} />
            <Stack.Screen name="NewRequest" component={NewRequestScreen} />
            <Stack.Screen name="Support" component={SupportScreen} />
          </Stack.Group>
        </>
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}