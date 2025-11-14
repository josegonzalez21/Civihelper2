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
  Image,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { request } from "../services/api";

// Paleta amarilla / páginas amarillas
const PALETTE = {
  background: "#FFFDF4",
  header: "#FFD100",
  cardBg: "#FFFFFF",
  cardBorder: "rgba(255, 216, 0, 0.25)",
  text: "#0F172A",
  sub: "#475569",
  accent: "#B45309",
  darkBtn: "#0F172A",
  warn: "#DC2626",
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

  // carga única
  const load = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    if (mountedRef.current) setLoading(true);

    try {
      // refresca el usuario
      try {
        await refresh?.();
      } catch {}

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
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
      return () => {};
    }, [load])
  );

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
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
    <SafeAreaView style={{ flex: 1, backgroundColor: PALETTE.background }}>
      {/* Header amarillo */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={goBack}
            accessibilityRole="button"
            accessibilityLabel="Volver"
            style={styles.backBtn}
          >
            <Feather name="arrow-left" size={20} color={PALETTE.text} />
          </TouchableOpacity>
          <Image
            source={require("../assets/Logo3.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <View>
            <Text style={styles.title}>Tu perfil</Text>
            <Text style={styles.sub}>Gestiona tu cuenta</Text>
          </View>
        </View>
        {saving ? <ActivityIndicator color={PALETTE.text} /> : <View style={{ width: 20 }} />}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={PALETTE.text} />
          <Text style={styles.loadingText}>Cargando…</Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
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
              labelStyle={{ color: "#B45309", fontWeight: "800" }}
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
        <Text style={styles.value} numberOfLines={1}>
          {value}
        </Text>
      </View>
    </View>
  );
}
function RowAction({ icon, label, onPress, labelStyle }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.rowAction} accessibilityRole="button">
      <Feather name={icon} size={18} color={PALETTE.accent} />
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
        trackColor={{ false: "rgba(15,23,42,0.12)", true: "#0F172A" }}
        thumbColor={Platform.OS === "android" ? "#FFFFFF" : undefined}
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
  header: {
    backgroundColor: PALETTE.header,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "android" ? 14 : 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.04)",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 34,
    height: 34,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: PALETTE.text,
  },
  sub: {
    fontSize: 12,
    color: PALETTE.sub,
  },
  scrollContent: {
    padding: 16,
    gap: 14,
    paddingBottom: 28,
  },
  card: {
    backgroundColor: PALETTE.cardBg,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: PALETTE.cardBorder,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 1,
  },
  blockTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: PALETTE.text,
    marginBottom: 8,
  },
  label: {
    color: "#94A3B8",
    fontSize: 12,
    marginBottom: 4,
  },
  value: {
    color: PALETTE.text,
    fontWeight: "700",
    maxWidth: "80%",
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
  },
  rowActionText: {
    color: PALETTE.text,
    fontWeight: "600",
  },
  link: {
    color: "#0F172A",
    fontWeight: "600",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 8,
    color: PALETTE.sub,
  },
});

