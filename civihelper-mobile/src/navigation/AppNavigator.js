// src/navigation/AppNavigator.js
import React from "react";
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

// Admin (también enlazables desde Home/Admin)
import AdminServices from "../screens/admin/AdminServices";
import AdminUsers from "../screens/admin/AdminUsers";
import AdminModeration from "../screens/admin/AdminModeration";
import AdminCategories from "../screens/admin/AdminCategories";

const Stack = createNativeStackNavigator();

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
        contentStyle: { backgroundColor: Colors.bg }, // fondo consistente con el tema
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
            <Stack.Screen name="AdminServices" component={AdminServices} />
            <Stack.Screen name="AdminUsers" component={AdminUsers} />
            <Stack.Screen name="AdminModeration" component={AdminModeration} />
            <Stack.Screen name="AdminCategories" component={AdminCategories} />

            {/* Comunes */}
            <Stack.Screen name="Search" component={SearchScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="Favorites" component={FavoritesScreen} />
            <Stack.Screen name="MyReviews" component={MyReviewsScreen} />

            {/* Categorías / Detalles */}
            <Stack.Screen name="Category" component={CategoryScreen} />
            <Stack.Screen name="ServiceDetail" component={ServiceDetailScreen} />
            <Stack.Screen name="ReviewCreate" component={ReviewCreateScreen} />

            {/* Proveedor (pantallas no-modales) */}
            <Stack.Screen name="MyServices" component={MyServicesScreen} />
            <Stack.Screen name="ProviderStats" component={ProviderStatsScreen} />
          </Stack.Group>

          {/* ======= Modales (presentación iOS/Android coherente) ======= */}
          <Stack.Group
            screenOptions={{
              presentation: "modal",
              animation: "slide_from_bottom",
            }}
          >
            <Stack.Screen name="ServiceCreate" component={ServiceCreateScreen} />
            <Stack.Screen name="ServiceEdit" component={ServiceEditScreen} />
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
