// App.js
import "react-native-gesture-handler";
import "react-native-reanimated";

import React, { useEffect } from "react";
import { LogBox, Platform } from "react-native";
import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import AppNavigator from "./src/navigation/AppNavigator";
import { AuthProvider } from "./src/context/AuthContext";
import {
  installGlobalErrorHandlers,
  setErrorReporter,
  setSanitizer,
} from "./src/utils/setupErrorHandling";

import Colors from "./src/theme/color"; // ← tu paleta CiviHelper

// Tema de navegación oscuro alineado al login
const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: Colors.bg,    // #0B0A1A
    card: Colors.bg2,         // #140A2E (headers/sheets)
    text: Colors.text,        // blanco
    border: Colors.border,    // sutil
    primary: Colors.primary,  // violeta
    notification: Colors.error,
  },
};

export default function App() {
  useEffect(() => {
    setSanitizer((payload) => {
      const p = { ...payload };
      if (!__DEV__ && p?.error) p.error.stack = undefined;
      return p;
    });

    setErrorReporter(async (_payload) => {
      // Aquí puedes enviar a tu backend/Sentry si quieres
    });

    installGlobalErrorHandlers({
      tapConsole: false,
      enableNetworkInterceptor: __DEV__,
      fetchExcludeDomains: ["localhost", "10.0.2.2", "192.168.", "127.0.0.1"],
      showAlerts: true,
      ignoreLogBox: [
        "Non-serializable values were found in the navigation state",
        "Require cycle:",
      ],
    });

    LogBox.ignoreLogs([
      "Non-serializable values were found in the navigation state",
      "Require cycle:",
    ]);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: Colors.bg }}>
      <SafeAreaProvider>
        <AuthProvider>
          {/* Forzamos tema oscuro de la app para que el admin menu
              tenga el mismo look & feel que el login */}
          <NavigationContainer theme={navTheme}>
            <StatusBar
              style="light"
              backgroundColor={Colors.bg} // Android
              translucent={Platform.OS === "android"}
            />
            <AppNavigator />
          </NavigationContainer>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
