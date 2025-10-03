// src/screens/ResetPasswordScreen.js
import React, { useEffect, useMemo, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import PrimaryButton from "../components/common/PrimaryButton";
import { api } from "../services/api";
import { validateEmail } from "../utils/validation";
import Colors, { shadows } from "../theme/color";

export default function ResetPasswordScreen({ navigation, route }) {
  const presetEmail = route?.params?.email || "";
  const [email, setEmail] = useState(presetEmail);
  const [token, setToken] = useState("");
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showPwd2, setShowPwd2] = useState(false);
  const [loading, setLoading] = useState(false);

  // Bloqueo por rate limit (429)
  const [lockUntil, setLockUntil] = useState(0);
  const [countdown, setCountdown] = useState(null);
  const locked = Date.now() < lockUntil;

  useEffect(() => {
    if (!lockUntil) return;
    const id = setInterval(() => {
      const sec = Math.max(0, Math.ceil((lockUntil - Date.now()) / 1000));
      setCountdown(sec);
      if (sec <= 0) clearInterval(id);
    }, 500);
    return () => clearInterval(id);
  }, [lockUntil]);

  const validEmail = validateEmail(email);
  const validPwd = pwd.length >= 8;
  const match = pwd === pwd2 && pwd2.length > 0;
  const validToken = token.trim().length >= 4;
  const canSubmit = useMemo(
    () => validEmail && validPwd && match && validToken && !loading && !locked,
    [validEmail, validPwd, match, validToken, loading, locked]
  );

  function applyRateLimitLock(ms) {
    const wait = Math.max(5_000, Math.min(ms, 5 * 60_000)); // 5s..5min
    setLockUntil(Date.now() + wait);
  }

  async function onSubmit() {
    if (!canSubmit) return;
    try {
      setLoading(true);
      await api.resetPassword({
        email: email.trim().toLowerCase(),
        token: token.trim(),
        newPassword: pwd,
      });
      Alert.alert("Listo", "Tu contraseña fue restablecida. Inicia sesión.");
      navigation.replace("Login");
    } catch (e) {
      // Si el backend devuelve 429 con Retry-After
      if (e?.status === 429) {
        const wait = e?.retryAfterSeconds ? e.retryAfterSeconds * 1000 : 60_000;
        applyRateLimitLock(wait);
        Alert.alert("Demasiadas solicitudes", `Intenta nuevamente en ${Math.ceil(wait / 1000)} segundos.`);
        return;
      }
      Alert.alert("Error", e?.message || "No se pudo restablecer la contraseña.");
    } finally {
      setLoading(false);
    }
  }

  const goBack = () => (navigation.canGoBack() ? navigation.goBack() : navigation.replace("Login"));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }}>
      <LinearGradient colors={Colors.gradients.hero} style={styles.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={styles.heroRow}>
          <TouchableOpacity
            onPress={goBack}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Volver"
          >
            <Feather name="arrow-left" size={20} color="#fff" />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Restablecer contraseña</Text>
            <Text style={styles.heroSub}>Ingresa el código recibido y tu nueva contraseña</Text>
          </View>

          <View style={{ width: 36 }} />
        </View>
      </LinearGradient>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
          <View style={[styles.card, shadows.lg]}>
            {/* Email */}
            <Text style={styles.label}>Correo</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="tucorreo@ejemplo.com"
              placeholderTextColor={Colors.sub}
              accessibilityLabel="Correo electrónico"
              textContentType="username"
              autoComplete="email"
              returnKeyType="next"
            />
            {!validEmail && email.length > 0 && <Text style={styles.err}>Formato de correo no válido.</Text>}

            {/* Token */}
            <Text style={[styles.label, { marginTop: 12 }]}>Código / Token</Text>
            <TextInput
              style={styles.input}
              value={token}
              onChangeText={setToken}
              placeholder="Código recibido"
              placeholderTextColor={Colors.sub}
              accessibilityLabel="Código o token"
              autoCapitalize="none"
              returnKeyType="next"
            />
            {!validToken && token.length > 0 && (
              <Text style={styles.err}>Ingresa el código que recibiste en tu correo.</Text>
            )}

            {/* Nueva contraseña */}
            <View style={styles.rowBetween}>
              <Text style={[styles.label, { marginTop: 12 }]}>Nueva contraseña</Text>
              <TouchableOpacity onPress={() => setShowPwd((v) => !v)} accessibilityRole="button">
                <Text style={styles.link}>{showPwd ? "Ocultar" : "Mostrar"}</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              value={pwd}
              onChangeText={setPwd}
              placeholder="••••••••"
              placeholderTextColor={Colors.sub}
              secureTextEntry={!showPwd}
              textContentType="newPassword"
              accessibilityLabel="Nueva contraseña"
              returnKeyType="next"
            />
            {pwd.length > 0 && !validPwd && <Text style={styles.err}>Mínimo 8 caracteres.</Text>}

            {/* Confirmar */}
            <View style={styles.rowBetween}>
              <Text style={[styles.label, { marginTop: 12 }]}>Confirmar contraseña</Text>
              <TouchableOpacity onPress={() => setShowPwd2((v) => !v)} accessibilityRole="button">
                <Text style={styles.link}>{showPwd2 ? "Ocultar" : "Mostrar"}</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              value={pwd2}
              onChangeText={setPwd2}
              placeholder="••••••••"
              placeholderTextColor={Colors.sub}
              secureTextEntry={!showPwd2}
              textContentType="newPassword"
              accessibilityLabel="Confirmar contraseña"
              returnKeyType="done"
              onSubmitEditing={onSubmit}
            />
            {pwd2.length > 0 && !match && <Text style={styles.err}>Las contraseñas no coinciden.</Text>}

            {/* Aviso de bloqueo */}
            {locked && (
              <Text style={[styles.err, { textAlign: "center" }]}>
                Bloqueado temporalmente. Intenta en {countdown ?? Math.ceil((lockUntil - Date.now()) / 1000)} s.
              </Text>
            )}

            <PrimaryButton onPress={onSubmit} loading={loading} disabled={!canSubmit} style={{ marginTop: 12 }}>
              {locked ? `Bloqueado ${countdown ?? Math.ceil((lockUntil - Date.now()) / 1000)}s` : "Restablecer"}
            </PrimaryButton>

            <TouchableOpacity
              onPress={() => navigation.navigate("ForgotPassword", { email })}
              style={{ marginTop: 12, alignSelf: "center" }}
            >
              <Text style={styles.altLink}>¿No tienes el código? Recuperar contraseña</Text>
            </TouchableOpacity>

            <Text style={styles.notice}>
              Tus datos se envían cifrados (HTTPS). No compartas este código con nadie.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingHorizontal: 16,
    paddingTop: Platform.select({ ios: 10, android: 16, default: 16 }),
    paddingBottom: 16,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
  },
  heroRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.45)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  heroTitle: { color: "#fff", fontSize: 20, fontWeight: "800" },
  heroSub: { color: "rgba(255,255,255,0.9)", marginTop: 4 },

  card: {
    marginTop: -12,
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  label: { color: Colors.text, opacity: 0.8, fontSize: 13, marginBottom: 6 },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
    color: Colors.text,
  },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },

  link: { color: Colors.primary, fontWeight: "700", fontSize: 13 },
  altLink: { color: Colors.success, fontWeight: "700" },

  err: { color: Colors.danger, marginTop: 6, fontSize: 12 },
  notice: { marginTop: 12, color: Colors.sub, fontSize: 11, textAlign: "center" },
});
