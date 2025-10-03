// src/screens/SplashScreen.js
import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  InteractionManager,
  StatusBar,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../context/AuthContext";
import { colors, radius } from "../theme/token"; // ✅ usa tus tokens

// Gradiente de fondo (puedes cambiarlo por colors.bg si quieres el fondo oscuro del login)
const SPLASH_GRADIENT = ["#1E88E5", "#43A047"]; // primary → success

export default function SplashScreen({ navigation }) {
  const { loading, token, user } = useAuth();
  const redirected = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    // Evita redirecciones si esta pantalla no está dentro del stack
    if (!navigation || typeof navigation.replace !== "function") return;

    const task = InteractionManager.runAfterInteractions(() => {
      if (loading || redirected.current) return;
      const hasSession = Boolean(token) || Boolean(user);
      redirected.current = true;
      // Pequeña espera para que el indicador se vea al menos un frame
      setTimeout(() => {
        if (!mounted.current) return;
        navigation.replace(hasSession ? "Home" : "Login");
      }, 2120);
    });

    return () => task?.cancel?.();
  }, [loading, token, user, navigation]);

  const stateText = loading ? "Verificando sesión…" : "Redirigiendo…";

  return (
    <LinearGradient colors={SPLASH_GRADIENT} style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={Platform.OS === "android" ? SPLASH_GRADIENT[0] : undefined}
      />

      <View style={styles.logoRow}>
        <View style={styles.logoIcon}>
          <View style={[styles.dot, { top: 8, left: 10 }]} />
          <View style={[styles.dot, { bottom: 8, right: 10 }]} />
        </View>
        <Text style={styles.brand}>CiviHelper</Text>
      </View>

      <Text style={styles.tagline}>Conectando servicios de tu comunidad</Text>
      <ActivityIndicator size="large" color="#fff" style={{ marginTop: 24 }} />
      <Text style={styles.loadingText}>{stateText}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center" },

  logoRow: { flexDirection: "row", alignItems: "center" },

  logoIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: "rgba(255,255,255,0.22)",
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
    ...Platform.select({
      web: { boxShadow: "0 8px 24px rgba(0,0,0,0.25)", backdropFilter: "blur(6px)" },
      ios: { shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 3 },
    }),
  },

  dot: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: colors.text, // blanco de tus tokens
    opacity: 0.95,
  },

  brand: { color: colors.text, fontSize: 26, fontWeight: "800", letterSpacing: 0.5 },
  tagline: { color: "rgba(255,255,255,0.9)", marginTop: 10, fontSize: 14 },
  loadingText: { color: "rgba(255,255,255,0.9)", marginTop: 6, fontSize: 12 },
});
