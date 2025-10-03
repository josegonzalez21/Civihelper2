// src/screens/ProfileScreen.js
import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Switch,
  ActivityIndicator,
  Linking,
  Platform,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { request } from "../services/api";

// Paleta (coherente con login/home)
const PALETTE = {
  bgGradient: ["#0d0b1f", "#140a2e", "#0b0a1a"],
  blob1: ["rgba(124,58,237,0.35)", "rgba(168,85,247,0.12)"],
  blob2: ["rgba(16,185,129,0.18)", "rgba(59,130,246,0.12)"],
  cardBg: "rgba(255,255,255,0.05)",
  cardBorder: "rgba(255,255,255,0.10)",
  borderSubtle: "rgba(255,255,255,0.15)",
  text: "#ffffff",
  sub: "rgba(255,255,255,0.75)",
  primary2: "#a855f7",
  warn: "#f59e0b",
};

const POLICY_URL = "https://tu-dominio.com/politica-privacidad";
const TERMS_URL = "https://tu-dominio.com/terminos";

export default function ProfileScreen({ navigation }) {
  const { user, refresh, signOut } = useAuth();

  const mountedRef = useRef(true);
  const loadingRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [consents, setConsents] = useState({ marketing: false });

  // ÚNICA función de carga, sin dependencias inestables
  const load = useCallback(async () => {
    if (loadingRef.current) return;       // evita llamadas superpuestas
    loadingRef.current = true;
    if (mountedRef.current) setLoading(true);

    try {
      // refresca el usuario (si falla, seguimos)
      try { await refresh?.(); } catch {}

      // preferencia de privacidad
      try {
        const priv = await request("/me/privacy", { tag: "PROFILE_PRIV" });
        if (mountedRef.current) {
          setConsents({ marketing: !!priv?.consents?.marketing });
        }
      } catch {}
    } finally {
      loadingRef.current = false;
      if (mountedRef.current) setLoading(false);
    }
  }, []); // ← sin refresh aquí

  // Carga al enfocar la pantalla (incluye la primera vez)
  useFocusEffect(
    useCallback(() => {
      load();
      return () => {}; // no-op
    }, [load])
  );

  // Limpieza de “montado”
  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  const goBack = () => navigation?.canGoBack?.() && navigation.goBack();
  const onChangePassword = () => navigation.navigate("ResetPassword");

  const onLogoutAll = () => {
    Alert.alert(
      "Cerrar sesión en todos los dispositivos",
      "Esto cerrará tu sesión en otros dispositivos.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Cerrar en todos",
          style: "destructive",
          onPress: async () => {
            try {
              setSaving(true);
              await request("/auth/logout-all", { method: "POST", tag: "LOGOUT_ALL" });
            } catch {}
            finally {
              setSaving(false);
              await signOut?.();
            }
          },
        },
      ]
    );
  };

  const onToggleMarketing = async (value) => {
    try {
      setSaving(true);
      setConsents((c) => ({ ...c, marketing: value }));
      await request("/me/consents", {
        method: "PATCH",
        body: { marketing: !!value },
        tag: "PROFILE_CONSENT",
      });
    } catch (e) {
      setConsents((c) => ({ ...c, marketing: !value }));
      Alert.alert("No disponible", e?.message || "Configura /me/consents en el backend.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "transparent" }}>
      {/* Fondo */}
      <LinearGradient colors={PALETTE.bgGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject} pointerEvents="none" />
      <LinearGradient colors={PALETTE.blob1} style={[styles.blob, { top: -80, left: -60 }]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} pointerEvents="none" />
      <LinearGradient colors={PALETTE.blob2} style={[styles.blob, { bottom: -90, right: -70, transform: [{ scale: 1.2 }] }]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} pointerEvents="none" />

      {/* Header */}
      <View style={styles.hero}>
        <View style={styles.heroRow}>
          <TouchableOpacity onPress={goBack} accessibilityRole="button" accessibilityLabel="Volver" style={styles.backBtn}>
            <Feather name="arrow-left" size={20} color="#fff" />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Tu perfil</Text>
            <Text style={styles.sub}>Gestiona tu cuenta</Text>
          </View>

          {saving ? <ActivityIndicator color="#fff" /> : <View style={{ width: 20 }} />}
        </View>
      </View>

      {/* Contenido mínimo y seguro */}
      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color="#fff" />
          <Text style={{ color: PALETTE.sub, marginTop: 8 }}>Cargando…</Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 28 }}
          keyboardShouldPersistTaps="handled"
        >
          <Block title="Datos de la cuenta">
            <Field label="Nombre" value={user?.name || "—"} />
            <Field label="Correo" value={user?.email || "—"} />
            <Field label="Rol" value={String(user?.role || "—").toUpperCase()} />
          </Block>

          <Block title="Preferencias">
            <ToggleRow
              label="Recibir comunicaciones (marketing)"
              value={consents.marketing}
              onValueChange={onToggleMarketing}
            />
          </Block>

          <Block title="Seguridad">
            <RowAction icon="key" label="Cambiar contraseña" onPress={onChangePassword} />
            <RowAction
              icon="log-out"
              label="Cerrar sesión en todos los dispositivos"
              onPress={onLogoutAll}
              labelStyle={{ color: PALETTE.warn, fontWeight: "800" }}
            />
          </Block>

          <Block title="Legal">
            <Links />
          </Block>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

/* ---------- Subcomponentes ---------- */
function Block({ title, children }) {
  return (
    <View style={styles.card}>
      <Text style={styles.blockTitle}>{title}</Text>
      <View style={{ gap: 10 }}>{children}</View>
    </View>
  );
}
function Field({ label, value }) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.rowBetween}>
        <Text style={styles.value} numberOfLines={1}>{value}</Text>
      </View>
    </View>
  );
}
function RowAction({ icon, label, onPress, labelStyle }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.rowAction} accessibilityRole="button">
      <Feather name={icon} size={18} color={PALETTE.primary2} />
      <Text style={[styles.rowActionText, labelStyle]}>{label}</Text>
    </TouchableOpacity>
  );
}
function ToggleRow({ label, value, onValueChange }) {
  return (
    <View style={styles.rowBetween}>
      <Text style={styles.rowActionText}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: "rgba(255,255,255,0.25)", true: PALETTE.primary2 }}
        thumbColor={Platform.OS === "android" ? "#fff" : undefined}
      />
    </View>
  );
}
function Links() {
  return (
    <View style={{ gap: 6, marginTop: 4 }}>
      <TouchableOpacity onPress={() => Linking.openURL(POLICY_URL)}>
        <Text style={styles.link}>Política de privacidad</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => Linking.openURL(TERMS_URL)}>
        <Text style={styles.link}>Términos y condiciones</Text>
      </TouchableOpacity>
    </View>
  );
}

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
    padding: 16,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    backgroundColor: "transparent",
  },
  heroRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn: {
    width: 36, height: 36, borderRadius: 12,
    borderWidth: 1, borderColor: PALETTE.borderSubtle,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  title: { color: "#fff", fontSize: 20, fontWeight: "800" },
  sub: { color: "rgba(255,255,255,0.9)", marginTop: 6 },

  card: {
    backgroundColor: PALETTE.cardBg,
    borderRadius: 16,
    padding: 14,
    borderWidth: Platform.OS === "web" ? 1 : StyleSheet.hairlineWidth,
    borderColor: PALETTE.cardBorder,
    ...Platform.select({
      web: { boxShadow: "0 30px 90px rgba(0,0,0,0.45)", backdropFilter: "blur(14px) saturate(120%)" },
      ios: { shadowColor: "#000", shadowOpacity: 0.28, shadowRadius: 18, shadowOffset: { width: 0, height: 10 } },
      android: { elevation: 4 },
    }),
  },
  blockTitle: { fontSize: 14, fontWeight: "800", color: PALETTE.text, marginBottom: 8 },
  label: { color: "rgba(255,255,255,0.85)", fontSize: 12, marginBottom: 4 },
  value: { color: PALETTE.text, fontWeight: "800", maxWidth: "80%" },

  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  rowAction: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
  rowActionText: { color: PALETTE.text, fontWeight: "700" },
  link: { color: PALETTE.primary2, fontWeight: "700" },
});
