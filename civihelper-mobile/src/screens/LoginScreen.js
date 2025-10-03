// src/screens/LoginScreen.js
/* eslint-disable no-console */
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Image,
  ScrollView,
  useWindowDimensions,
  TextInput,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as SecureStore from "expo-secure-store";
import { FontAwesome } from "@expo/vector-icons";

import useCountdown from "../components/hooks/useCountdown";
import { useAuth } from "../context/AuthContext";
import { validateEmail, runValidationTestsOnce } from "../utils/validation";
import { signInWithGoogle, signInWithFacebook, signInWithApple } from "../services/social";
import { API_URL, setAuthToken, API_BASE, login } from "../services/api";

/* =========================
   Utilidades de red/errores
========================= */
function parseRetryAfter(header) {
  if (!header) return null;
  const asInt = parseInt(header, 10);
  if (!Number.isNaN(asInt)) return asInt * 1000; // segundos → ms
  const when = Date.parse(header);
  if (!Number.isNaN(when)) {
    const diff = when - Date.now();
    return diff > 0 ? diff : null;
  }
  return null;
}

async function parseErrorResponse(res) {
  try {
    const data = await res.json();
    if (data?.message) return data.message;
    if (Array.isArray(data?.errors) && data.errors.length) {
      return data.errors.map((e) => e.message || e).join("\n");
    }
    return JSON.stringify(data);
  } catch {
    try {
      const text = await res.text();
      return text || `HTTP ${res.status}`;
    } catch {
      return `HTTP ${res.status}`;
    }
  }
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

/* -------------------------- Form estable (fuera) -------------------------- */
function LoginForm({
  email,
  setEmail,
  pwd,
  setPwd,
  show,
  setShow,
  canSubmit,
  submitting,
  locked,
  lockRunning,
  lockSeconds,
  onSubmit,
  handleGoogle,
  handleFacebook,
  handleApple,
  navigation,
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Bienvenido{"\n"}</Text>
      <Text style={styles.subtitle}>Ingresa tus credenciales para continuar</Text>

      {/* Email */}
      <View style={styles.field}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          placeholder="tucorreo@ejemplo.com"
          placeholderTextColor="rgba(255,255,255,0.55)"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="username"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          onBlur={() => setEmail((e) => (e || "").trim().toLowerCase())}
          style={styles.inputDark}
          returnKeyType="next"
          accessibilityLabel="Correo electrónico"
        />
      </View>

      {/* Password */}
      <View style={styles.field}>
        <Text style={styles.label}>Password</Text>
        <View style={{ position: "relative" }}>
          <TextInput
            placeholder="••••••••"
            placeholderTextColor="rgba(255,255,255,0.55)"
            secureTextEntry={!show}
            autoComplete="password"
            textContentType="password"
            value={pwd}
            onChangeText={setPwd}
            style={styles.inputDark}
            returnKeyType="done"
            onSubmitEditing={onSubmit}
            accessibilityLabel="Contraseña"
          />
          <TouchableOpacity onPress={() => setShow((s) => !s)} style={styles.showBtn} accessibilityRole="button">
            <Text style={styles.link}>{show ? "Hide" : "Show"}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* CTA */}
      <TouchableOpacity
        disabled={!canSubmit}
        onPress={onSubmit}
        activeOpacity={0.9}
        style={[styles.ctaWrapper, !canSubmit && { opacity: 0.6 }]}
        accessibilityRole="button"
      >
        <LinearGradient colors={["#7c3aed", "#a855f7"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.ctaGradient}>
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.ctaText}>{locked && lockRunning ? `Bloqueado ${lockSeconds}s` : "Log in"}</Text>
          )}
        </LinearGradient>
      </TouchableOpacity>

      <Text style={styles.mutedCenter}>o continúa con</Text>

      {/* Social */}
      <View style={styles.socialRow}>
        <TouchableOpacity style={styles.socialBtn} onPress={handleGoogle} disabled={locked} accessibilityLabel="Google">
          <FontAwesome name="google" size={22} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.socialBtn} onPress={handleFacebook} disabled={locked} accessibilityLabel="Facebook">
          <FontAwesome name="facebook" size={22} color="#fff" />
        </TouchableOpacity>
        {Platform.OS === "ios" && (
          <TouchableOpacity style={styles.socialBtn} onPress={handleApple} disabled={locked} accessibilityLabel="Apple">
            <FontAwesome name="apple" size={24} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity onPress={() => navigation.navigate("ForgotPassword")} style={{ marginTop: 14 }}>
        <Text style={[styles.link, { textAlign: "center", color: "#a5b4fc" }]}>¿Olvidaste tu contraseña?</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate("Register")} style={{ marginTop: 8 }}>
        <Text style={[styles.altLink, { color: "#c4b5fd" }]}>¿No tienes cuenta? Crear cuenta</Text>
      </TouchableOpacity>

      <Text style={styles.notice}>
        Al continuar aceptas nuestra Política de Privacidad y Términos. Tus credenciales se envían cifradas (HTTPS).
      </Text>
    </View>
  );
}

/* ------------------------------ Pantalla ------------------------------ */
export default function LoginScreen({ navigation }) {
  useEffect(() => runValidationTestsOnce(), []);

  const { refresh } = useAuth();
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [show, setShow] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const [locked, setLocked] = useState(false);
  const { seconds: lockSeconds, reset: resetLock, running: lockRunning } = useCountdown(0, {
    autoStart: false,
    onFinish: () => setLocked(false),
  });

  const validEmail = validateEmail(email);
  const validPwd = pwd.length >= 8;
  const canSubmit = useMemo(() => validEmail && validPwd && !submitting && !locked, [validEmail, validPwd, submitting, locked]);

  // Logs de diagnóstico
  useEffect(() => {
    const isProd = !__DEV__;
    if (isProd && typeof API_BASE === "string" && !API_BASE.startsWith("https://")) {
      console.warn("En producción, usa siempre HTTPS. API_BASE:", API_BASE);
    }
    console.log("[LoginScreen] montado. Plataforma:", Platform.OS);
  }, []);

  const setSessionToken = async (token) => {
    try {
      if (Platform.OS === "web" && typeof localStorage !== "undefined") {
        localStorage.setItem("civihelper_token", token);
      } else {
        await SecureStore.setItemAsync("civihelper_token", token, { keychainService: "civihelper" });
      }
      setAuthToken(token); // también lo guardamos en el cliente API en memoria
    } catch (err) {
      console.error("[LoginScreen] Error guardando token:", err);
    }
  };

  function applyRateLimitLock(ms) {
    const wait = Math.max(5_000, Math.min(ms || 60_000, 5 * 60_000));
    setLocked(true);
    resetLock(Math.ceil(wait / 1000), true);
  }

  async function onSubmit() {
    if (!canSubmit) return;
    try {
      setSubmitting(true);

      // Ahora usamos el login del servicio directamente
      const res = await login(email.trim().toLowerCase(), pwd);

      if (!res?.token) {
        throw Object.assign(new Error(res?.message || "Credenciales inválidas"), { status: res?.status });
      }

      // Guardamos token también en almacenamiento seguro
      await setSessionToken(res.token);

      // Refrescamos perfil/estado global si tu AuthContext lo soporta
      await refresh?.();
    } catch (e) {
      console.error("[LoginScreen] onSubmit error:", e);

      if (e?.status === 429) {
        const ms = e?.retryAfterSeconds ? e.retryAfterSeconds * 1000 : 60_000;
        applyRateLimitLock(ms);
        Alert.alert("Demasiadas solicitudes", `Intenta nuevamente en ${Math.ceil(ms / 1000)} segundos.`);
        return;
      }

      const next = attempts + 1;
      setAttempts(next);
      if (next >= 5) {
        applyRateLimitLock(30_000);
        Alert.alert("Demasiados intentos", "Espera 30 segundos antes de reintentar.");
      } else {
        Alert.alert("Error de inicio de sesión", e?.message || "Revisa tus credenciales");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function socialLogin(provider, payload) {
    try {
      const res = await fetchWithTimeout(`${API_URL}/auth/social/${provider}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }, 15000);

      if (res.status === 429) {
        const ra = res.headers.get("retry-after");
        const wait = parseRetryAfter(ra) ?? 60_000;
        applyRateLimitLock(wait);
        throw new Error(`Demasiadas solicitudes. Intenta en ${Math.ceil(wait / 1000)} segundos.`);
      }
      if (!res.ok) {
        const msg = await parseErrorResponse(res);
        if (res.status === 501) throw new Error("Inicio de sesión social no disponible en este entorno.");
        throw new Error(msg || `Error ${res.status}`);
      }

      const data = await res.json();
      if (data?.token) {
        await setSessionToken(data.token);
        await refresh?.();
      }
      return data;
    } catch (err) {
      console.error(`[LoginScreen] socialLogin ${provider} error:`, err);
      throw err;
    }
  }

  async function handleGoogle() {
    try {
      const r = await signInWithGoogle();
      if (r?.idToken) await socialLogin("google", { idToken: r.idToken });
      else if (r?.email)
        await socialLogin("google", {
          email: String(r.email).trim().toLowerCase(),
          fullName: r.name || r.fullName || "Usuario",
          oauthId: r.sub || r.id,
        });
      else throw new Error("No se obtuvo credencial válida de Google.");
    } catch (e) {
      Alert.alert("Google", e.message || "No se pudo iniciar sesión con Google");
    }
  }

  async function handleFacebook() {
    try {
      const r = await signInWithFacebook();
      if (r?.accessToken) await socialLogin("facebook", { accessToken: r.accessToken });
      else if (r?.email)
        await socialLogin("facebook", {
          email: String(r.email).trim().toLowerCase(),
          fullName: r.name || "Usuario",
          oauthId: r.id,
        });
      else throw new Error("No se obtuvo credencial válida de Facebook.");
    } catch (e) {
      Alert.alert("Facebook", e.message || "No se pudo iniciar sesión con Facebook");
    }
  }

  async function handleApple() {
    try {
      const r = await signInWithApple(); // iOS
      if (r?.identityToken) await socialLogin("apple", { identityToken: r.identityToken });
      else if (r?.email)
        await socialLogin("apple", {
          email: String(r.email).trim().toLowerCase(),
          fullName: r.name || r.fullName || "Usuario",
          oauthId: r.user || r.sub || r.id,
        });
      else throw new Error("No se obtuvo credencial válida de Apple.");
    } catch (e) {
      Alert.alert("Apple", e.message || "No se pudo iniciar sesión con Apple");
    }
  }

  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === "web";
  const isNarrow = isWeb && width < 1024;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "transparent" }}>
      {/* Fondo global */}
      <LinearGradient
        colors={["#0d0b1f", "#140a2e", "#0b0a1a"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />
      {/* Blobs (no capturan eventos) */}
      <LinearGradient
        colors={["rgba(124,58,237,0.35)", "rgba(168,85,247,0.12)"]}
        style={[styles.blob, { top: -80, left: -60 }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        pointerEvents="none"
      />
      <LinearGradient
        colors={["rgba(16,185,129,0.18)", "rgba(59,130,246,0.12)"]}
        style={[styles.blob, { bottom: -90, right: -70, transform: [{ scale: 1.2 }] }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        pointerEvents="none"
      />

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        {isWeb ? (
          // WEB: 2 columnas (imagen se mantiene)
          <View style={styles.webShell}>
            <View style={[styles.webContainer, isNarrow && styles.webContainerNarrow]}>
              {/* Izquierda: Imagen */}
              <View style={[styles.leftPane, isNarrow && styles.leftPaneNarrow]}>
                <Image
                  source={require("../assets/login-illustration.png")}
                  style={[styles.illustration, isNarrow && styles.illustrationNarrow]}
                  resizeMode="cover"
                />
              </View>

              {/* Derecha: Form oscuro */}
              <View style={[styles.rightPane, isNarrow && styles.rightPaneNarrow]}>
                <ScrollView
                  contentContainerStyle={[styles.rightContent, { maxWidth: 560 }]}
                  bounces={false}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="always"
                >
                  <View style={styles.brandRow}>
                    <Image source={require("../assets/Logo3.png")} style={styles.brandIcon} resizeMode="contain" />
                    <Text style={styles.brandText}>CiviHelper</Text>
                  </View>

                  <LoginForm
                    email={email}
                    setEmail={setEmail}
                    pwd={pwd}
                    setPwd={setPwd}
                    show={show}
                    setShow={setShow}
                    canSubmit={canSubmit}
                    submitting={submitting}
                    locked={locked}
                    lockRunning={lockRunning}
                    lockSeconds={lockSeconds}
                    onSubmit={onSubmit}
                    handleGoogle={handleGoogle}
                    handleFacebook={handleFacebook}
                    handleApple={handleApple}
                    navigation={navigation}
                  />
                </ScrollView>
              </View>
            </View>
          </View>
        ) : (
          // Móvil
          <ScrollView
            contentContainerStyle={[styles.container, { minHeight: "100%" }]}
            bounces={false}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="always"
          >
            <View style={[styles.brandRow, { paddingHorizontal: 4 }]}>
              <Image source={require("../assets/Logo3.png")} style={styles.brandIcon} resizeMode="contain" />
              <Text style={styles.brandText}>CiviHelper</Text>
            </View>

            <LoginForm
              email={email}
              setEmail={setEmail}
              pwd={pwd}
              setPwd={setPwd}
              show={show}
              setShow={setShow}
              canSubmit={canSubmit}
              submitting={submitting}
              locked={locked}
              lockRunning={lockRunning}
              lockSeconds={lockSeconds}
              onSubmit={onSubmit}
              handleGoogle={handleGoogle}
              handleFacebook={handleFacebook}
              handleApple={handleApple}
              navigation={navigation}
            />
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ======================= STYLES ======================= */

const styles = StyleSheet.create({
  // WEB layout
  webShell: { width: "100%", minHeight: "100vh" },
  webContainer: { width: "100%", minHeight: "100vh", flexDirection: "row" },
  webContainerNarrow: { flexDirection: "column" },

  leftPane: { flexBasis: "50%", flexGrow: 1, minHeight: "100vh", overflow: "hidden" },
  leftPaneNarrow: { width: "100%", minHeight: 260 },
  illustration: { width: "100%", height: "100%" },
  illustrationNarrow: { height: 260 },

  rightPane: {
    flexBasis: "50%",
    flexGrow: 1,
    minHeight: "100vh",
    backgroundColor: "transparent",
  },
  rightPaneNarrow: { width: "100%", minHeight: "auto" },
  rightContent: {
    padding: 24,
    width: "100%",
    marginHorizontal: "auto",
    gap: 16,
    paddingBottom: 48,
  },

  // Contenedores comunes
  container: { paddingHorizontal: 20, paddingBottom: 32, gap: 18 },

  // Marca
  brandRow: { flexDirection: "row", alignItems: "center", marginTop: 35, marginBottom: 35, marginLeft: 55 },
  brandIcon: { width: 100, height: 100, borderRadius: 8, marginRight: 8 },
  brandText: { color: "#fff", fontSize: 30, fontWeight: "800", letterSpacing: 0.3 },

  // Tarjeta “glass”
  card: {
    width: "100%",
    borderRadius: 24,
    padding: 18,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: Platform.OS === "web" ? 1 : StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.10)",
    ...Platform.select({
      web: { boxShadow: "0 30px 90px rgba(0,0,0,0.45)", backdropFilter: "blur(14px) saturate(120%)" },
      ios: { shadowColor: "#000", shadowOpacity: 0.28, shadowRadius: 18, shadowOffset: { width: 0, height: 10 } },
      android: { elevation: 6 },
    }),
  },

  title: { color: "#fff", fontSize: 28, fontWeight: "800", marginBottom: 4, lineHeight: 34 },
  subtitle: { color: "rgba(255,255,255,0.8)", fontSize: 14, marginBottom: 14 },

  field: { marginBottom: 12 },
  label: { color: "rgba(255,255,255,0.9)", fontSize: 13, marginBottom: 8 },

  inputDark: {
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(10,10,25,0.85)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    color: "#fff",
    paddingHorizontal: 16,
  },
  showBtn: { position: "absolute", right: 12, top: 12, height: 24, justifyContent: "center" },

  // CTA
  ctaWrapper: { marginTop: 6, borderRadius: 999 },
  ctaGradient: {
    height: 50,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      web: { boxShadow: "0 14px 40px rgba(124,58,237,0.45)" },
      ios: { shadowColor: "#7c3aed", shadowOpacity: 0.55, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } },
      android: { elevation: 3 },
    }),
  },
  ctaText: { color: "#fff", fontWeight: "800", fontSize: 16 },

  mutedCenter: { textAlign: "center", color: "rgba(255,255,255,0.7)", fontSize: 12, marginTop: 12 },

  link: { color: "#a78bfa", fontWeight: "700" },
  altLink: { textAlign: "center", fontWeight: "700" },

  errorText: { color: "#fca5a5", marginTop: 8, fontSize: 12, textAlign: "center" },

  socialRow: { flexDirection: "row", justifyContent: "center", marginTop: 12, gap: 16 },
  socialBtn: {
    width: 56,
    height: 56,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    ...Platform.select({
      web: { boxShadow: "0 6px 20px rgba(0,0,0,0.3)" },
      ios: { shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 3 },
    }),
  },

  notice: { marginTop: 14, color: "rgba(255,255,255,0.75)", fontSize: 11, textAlign: "center" },

  // blobs (no interceptan eventos)
  blob: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 260,
    opacity: 1,
    pointerEvents: "none",
    ...(Platform.OS === "web" ? { filter: "blur(50px)" } : {}),
  },
});
