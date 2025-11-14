// src/screens/SettingsScreen.js
import React, { useEffect, useMemo, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Switch,
  Platform,
  Linking,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as SecureStore from "expo-secure-store";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { API_BASE } from "../services/api";
import Colors, { spacing, radius } from "../theme/color";

/* ===== Paleta/glass alineada al Login ===== */
const UI = {
  gradientBG: ["#0D0B1F", "#140A2E", "#0B0A1A"],            // gradient/bg
  blob1: ["rgba(124,58,237,0.35)", "rgba(168,85,247,0.12)"], // gradient/blob-1
  blob2: ["rgba(16,185,129,0.18)", "rgba(59,130,246,0.12)"], // gradient/blob-2
  glass: "rgba(255,255,255,0.05)",                            // surface/glass
  glassBorder: "rgba(255,255,255,0.10)",                      // border/subtle
  text: "#FFFFFF",                                            // text/primary
  sub: "rgba(255,255,255,0.80)",                              // text/secondary
  muted: "rgba(255,255,255,0.70)",                            // text/muted
  primary: "#7C3AED",                                         // primary/600
  primaryAlt: "#A855F7",                                      // primary/500
  success: "#10B981",
  info: "#3B82F6",
  warning: "#F59E0B",
  error: "#EF4444",
};

const PREF_KEYS = {
  biometrics: "pref_biometrics",
  notifications: "pref_notifications",
  theme: "pref_theme",
  language: "pref_language",
  diagnostics: "pref_diagnostics",
};

async function prefGet(key, fallback = null) {
  try {
    const v = await SecureStore.getItemAsync(key, { keychainService: "civihelper" });
    return v ?? fallback;
  } catch {
    return fallback;
  }
}
async function prefSet(key, value) {
  try {
    await SecureStore.setItemAsync(key, String(value), { keychainService: "civihelper" });
  } catch {}
}
async function prefDel(key) {
  try {
    await SecureStore.deleteItemAsync(key, { keychainService: "civihelper" });
  } catch {}
}

export default function SettingsScreen({ navigation }) {
  const { user, signOut } = useAuth();

  const [biometrics, setBiometrics] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [diagEnabled, setDiagEnabled] = useState(false);
  const [theme, setTheme] = useState("system");
  const [language, setLanguage] = useState("es-CL");

  const versionInfo = useMemo(
    () => ({
      app: "CiviHelper",
      version: "1.0.0",
      build: "100",
      platform: Platform.OS,
      apiBase: API_BASE || "-",
    }),
    []
  );

  useEffect(() => {
    (async () => {
      const bio = await prefGet(PREF_KEYS.biometrics, "0");
      const noti = await prefGet(PREF_KEYS.notifications, "1");
      const diag = await prefGet(PREF_KEYS.diagnostics, "0");
      const th = (await prefGet(PREF_KEYS.theme, "system")) || "system";
      const lang = (await prefGet(PREF_KEYS.language, "es-CL")) || "es-CL";
      setBiometrics(bio === "1");
      setNotifications(noti !== "0");
      setDiagEnabled(diag === "1");
      setTheme(th);
      setLanguage(lang);
    })();
  }, []);

  const goBack = () => {
    if (navigation?.canGoBack?.()) navigation.goBack();
    else navigation.navigate("Home");
  };

  const logout = async () => {
    Alert.alert("Cerrar sesión", "¿Deseas salir de tu cuenta en este dispositivo?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Salir", style: "destructive", onPress: async () => { try { await signOut?.(); } catch {} } },
    ]);
  };

  const logoutAll = async () => {
    Alert.alert(
      "Cerrar sesión en todos tus dispositivos",
      "Esto revocará todas las sesiones activas. ¿Deseas continuar?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Cerrar todas",
            style: "destructive",
            onPress: async () => {
              try {
                // TODO: POST /auth/logout-all
              } finally {
                await signOut?.();
              }
            },
        },
      ]
    );
  };

  const changePassword = () => {
    Alert.alert("Cambio de contraseña", "Función en desarrollo.");
  };

  const exportData = () => {
    Alert.alert(
      "Exportar mis datos",
      "Recibirás un archivo con tus datos personales. ¿Deseas solicitarlo ahora?",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Solicitar", onPress: () => Alert.alert("Solicitud enviada", "Te avisaremos cuando tu exportación esté lista.") },
      ]
    );
  };

  const deleteAccount = () => {
    Alert.alert("Eliminar cuenta", "Esta acción es permanente. ¿Continuar?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          try {
            // TODO: DELETE /me
          } finally {
            await signOut?.();
          }
        },
      },
    ]);
  };

  const toggleBiometrics = async () => {
    const v = !biometrics;
    setBiometrics(v);
    await prefSet(PREF_KEYS.biometrics, v ? "1" : "0");
  };
  const toggleNotifications = async () => {
    const v = !notifications;
    setNotifications(v);
    await prefSet(PREF_KEYS.notifications, v ? "1" : "0");
  };
  const toggleDiagnostics = async () => {
    const v = !diagEnabled;
    setDiagEnabled(v);
    await prefSet(PREF_KEYS.diagnostics, v ? "1" : "0");
  };
  const cycleTheme = async () => {
    const order = ["system", "light", "dark"];
    const next = order[(order.indexOf(theme) + 1) % order.length];
    setTheme(next);
    await prefSet(PREF_KEYS.theme, next);
  };
  const cycleLanguage = async () => {
    const langs = ["es-CL", "es", "en"];
    const next = langs[(langs.indexOf(language) + 1) % langs.length];
    setLanguage(next);
    await prefSet(PREF_KEYS.language, next);
  };

  const clearLocalCache = async () => {
    Alert.alert(
      "Limpiar caché local",
      "No elimina tu cuenta. Borrará preferencias y datos locales.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Limpiar",
          onPress: async () => {
            await Promise.all([
              prefDel(PREF_KEYS.biometrics),
              prefDel(PREF_KEYS.notifications),
              prefDel(PREF_KEYS.diagnostics),
              prefDel(PREF_KEYS.theme),
              prefDel(PREF_KEYS.language),
            ]);
            Alert.alert("Listo", "Caché local limpiada.");
          },
        },
      ]
    );
  };

  const openLink = (url) =>
    Linking.openURL(url).catch(() => Alert.alert("Error", "No se pudo abrir el enlace."));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "transparent" }}>
      {/* Fondo global */}
      <LinearGradient
        colors={UI.gradientBG}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFillObject, { pointerEvents: "none" }]}
      />
      {/* Blobs */}
      <LinearGradient
        colors={UI.blob1}
        style={[styles.blob, { top: -80, left: -60, pointerEvents: "none" }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <LinearGradient
        colors={UI.blob2}
        style={[styles.blob, { bottom: -90, right: -70, transform: [{ scale: 1.2 }], pointerEvents: "none" }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Header */}
      <LinearGradient
        colors={["#7C3AED", "#A855F7"]} // gradient/cta
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.heroTop}>
          <TouchableOpacity
            onPress={goBack}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Volver"
          >
            <Feather name="arrow-left" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Ajustes</Text>
          <View style={styles.backBtn} />{/* spacer */}
        </View>
        <Text style={styles.sub}>Configura tu cuenta y la app</Text>
      </LinearGradient>

      {/* Contenido */}
      <ScrollView
        contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.lg + 4, gap: spacing.sm }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Cuenta */}
        <View style={styles.card}>
          <Text style={styles.blockTitle}>Cuenta</Text>
          <NavRow
            icon="user"
            label="Perfil"
            value={`${user?.name || "—"} · ${user?.role || "—"}`}
            onPress={() => navigation.navigate("Profile")}
          />
          <Divider />
          <Row icon="mail" label="Correo" value={user?.email || "—"} />
          <Divider />
          <NavRow icon="key" label="Cambiar contraseña" value="Recomendado" onPress={changePassword} />
          <Divider />
          <NavRow icon="log-out" label="Cerrar sesión (este dispositivo)" value="" destructive onPress={logout} />
          <Divider />
          <NavRow icon="shield-off" label="Cerrar sesión en todos los dispositivos" value="" destructive onPress={logoutAll} />
        </View>

        {/* Seguridad y Privacidad */}
        <View style={styles.card}>
          <Text style={styles.blockTitle}>Seguridad y privacidad</Text>
          <ToggleRow
            icon="shield"
            label="Biometría para iniciar sesión"
            value={biometrics}
            onValueChange={toggleBiometrics}
            hint={Platform.OS === "android" ? "Huella/rostro (si disponible)" : "Face ID/Touch ID (si disponible)"}
          />
          <Divider />
          <NavRow icon="download" label="Exportar mis datos" value="" onPress={exportData} />
          <Divider />
          <NavRow icon="alert-triangle" label="Eliminar mi cuenta" value="" destructive onPress={deleteAccount} />
        </View>

        {/* Preferencias */}
        <View style={styles.card}>
          <Text style={styles.blockTitle}>Preferencias</Text>
          <ToggleRow icon="bell" label="Notificaciones" value={notifications} onValueChange={toggleNotifications} />
          <Divider />
          <NavRow
            icon="sun"
            label="Tema"
            value={theme === "system" ? "Sistema" : theme === "light" ? "Claro" : "Oscuro"}
            onPress={cycleTheme}
          />
          <Divider />
          <NavRow icon="globe" label="Idioma" value={language} onPress={cycleLanguage} />
          <Divider />
          <ToggleRow icon="activity" label="Enviar diagnósticos anónimos" value={diagEnabled} onValueChange={toggleDiagnostics} />
          <Divider />
          <NavRow icon="trash-2" label="Limpiar caché local" value="" onPress={clearLocalCache} />
        </View>

        {/* Soporte & legales */}
        <View style={styles.card}>
          <Text style={styles.blockTitle}>Soporte y legales</Text>
          <NavRow icon="help-circle" label="Centro de ayuda" value="" onPress={() => openLink("https://example.com/help")} />
          <Divider />
          <NavRow icon="file-text" label="Términos y Condiciones" value="" onPress={() => openLink("https://example.com/terms")} />
          <Divider />
          <NavRow icon="lock" label="Política de Privacidad" value="" onPress={() => openLink("https://example.com/privacy")} />
          <Divider />
          <NavRow
            icon="mail"
            label="Reportar un problema"
            value="soporte@civihelper.com"
            onPress={() => openLink("mailto:soporte@civihelper.com")}
          />
        </View>

        {/* Acerca de */}
        <View style={styles.card}>
          <Text style={styles.blockTitle}>Acerca de</Text>
          <Row icon="info" label="Aplicación" value={`${versionInfo.app} · v${versionInfo.version} (${versionInfo.build})`} />
          <Divider />
          <Row icon="server" label="API" value={versionInfo.apiBase} />
          <Divider />
          <Row icon="cpu" label="Plataforma" value={versionInfo.platform} />
          {__DEV__ ? (
            <>
              <Divider />
              <Text style={styles.devNote}>Modo desarrollo activo. Recuerda usar HTTPS en producción.</Text>
            </>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ---------- Subcomponentes ---------- */

function Row({ icon, label, value }) {
  return (
    <View style={styles.row} accessibilityRole="text">
      <View style={styles.rowLeft}>
        <Feather name={icon} size={18} color={UI.muted} />
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      {!!value && (
        <Text style={styles.rowValue} numberOfLines={1}>
          {value}
        </Text>
      )}
    </View>
  );
}

function NavRow({ icon, label, value, onPress, destructive = false }) {
  const color = destructive ? UI.error : UI.muted;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      style={[styles.row, { paddingVertical: 12 }]}
      accessibilityRole="button"
    >
      <View style={styles.rowLeft}>
        <Feather name={icon} size={18} color={color} />
        <Text style={[styles.rowLabel, destructive && { color: UI.error }]}>{label}</Text>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        {!!value && (
          <Text style={[styles.rowValue, destructive && { color: UI.error }]} numberOfLines={1}>
            {value}
          </Text>
        )}
        <Feather name="chevron-right" size={18} color={destructive ? UI.error : "rgba(255,255,255,0.6)"} />
      </View>
    </TouchableOpacity>
  );
}

function ToggleRow({ icon, label, value, onValueChange, hint }) {
  return (
    <View style={styles.row} accessibilityRole="adjustable">
      <View style={styles.rowLeft}>
        <Feather name={icon} size={18} color={UI.muted} />
        <View>
          <Text style={styles.rowLabel}>{label}</Text>
          {hint ? <Text style={styles.hint}>{hint}</Text> : null}
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: "rgba(255,255,255,0.25)", true: UI.primaryAlt }}
        thumbColor={Platform.OS === "android" ? "#fff" : undefined}
      />
    </View>
  );
}

const Divider = () => <View style={styles.divider} />;

/* ---------- Estilos ---------- */
const styles = StyleSheet.create({
  blob: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 260,
    opacity: 1,
    pointerEvents: "none",
    ...(Platform.OS === "web" ? { filter: "blur(50px)" } : {}),
  },

  hero: {
    paddingHorizontal: spacing.md,
    paddingTop: Platform.select({ ios: 8, android: 10, default: 10 }),
    paddingBottom: spacing.md,
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.45)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  title: { color: "#fff", fontSize: 20, fontWeight: "800" },
  sub: { color: "rgba(255,255,255,0.92)", marginTop: 4 },

  card: {
    backgroundColor: UI.glass,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: Platform.OS === "web" ? 1 : StyleSheet.hairlineWidth,
    borderColor: UI.glassBorder,
    ...Platform.select({
      web: { boxShadow: "0 30px 90px rgba(0,0,0,0.45)", backdropFilter: "blur(14px) saturate(120%)" },
      ios: { shadowColor: "#000", shadowOpacity: 0.28, shadowRadius: 18, shadowOffset: { width: 0, height: 10 } },
      android: { elevation: 4 },
    }),
  },
  blockTitle: { fontSize: 14, fontWeight: "800", color: UI.text, marginBottom: spacing.sm },

  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 10, flexShrink: 1 },
  rowLabel: { fontWeight: "800", color: UI.text },
  rowValue: { color: UI.sub, maxWidth: "60%" },
  hint: { color: UI.muted, fontSize: 11, marginTop: 2 },

  divider: { height: 1, backgroundColor: "rgba(255,255,255,0.08)", marginVertical: 10 },

  devNote: { color: UI.muted, fontSize: 12 },
});