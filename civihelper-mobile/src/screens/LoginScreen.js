// src/screens/LoginScreen.js
/* eslint-disable no-console */
import React, { useEffect, useMemo, useState, useCallback } from "react";
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
  Animated,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { FontAwesome } from "@expo/vector-icons";

import useCountdown from "../components/hooks/useCountdown";
import { useAuth } from "../context/AuthContext";
import { validateEmail, runValidationTestsOnce } from "../utils/validation";
import { signInWithGoogle, signInWithFacebook, signInWithApple } from "../services/social";
import { API_URL, setAuthToken, login } from "../services/api";

/* =========================
   CONSTANTES
========================= */
const RATE_LIMIT = {
  MAX_ATTEMPTS: 5,
  LOCKOUT_DURATION: 30000,
  MIN_WAIT: 5000,
  MAX_WAIT: 300000,
  RESET_AFTER_INACTIVITY: 300000,
};

const PASSWORD_REQUIREMENTS = {
  MIN_LENGTH: 8,
};

const TIMEOUTS = {
  FETCH: 15000,
};

/* =========================
   UTILIDADES
========================= */
function parseRetryAfter(header) {
  if (!header) return null;
  const asInt = parseInt(header, 10);
  if (!Number.isNaN(asInt)) return asInt * 1000;
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

async function fetchWithTimeout(url, options = {}, timeoutMs = TIMEOUTS.FETCH) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

/* =========================
   COMPONENTE: INPUT FIELD
========================= */
const InputField = React.memo(function InputField({
  label,
  value,
  onChangeText,
  onBlur,
  placeholder,
  secureTextEntry,
  autoComplete,
  textContentType,
  keyboardType,
  returnKeyType,
  onSubmitEditing,
  disabled,
  rightElement,
  icon,
}) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.inputWrapper}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={[styles.inputContainer, isFocused && styles.inputContainerFocused]}>
        {icon && (
          <View style={styles.inputIconContainer}>
            <FontAwesome name={icon} size={18} color="rgba(255,255,255,0.5)" />
          </View>
        )}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onBlur={() => {
            setIsFocused(false);
            onBlur?.();
          }}
          onFocus={() => setIsFocused(true)}
          placeholder={placeholder}
          placeholderTextColor="rgba(255,255,255,0.4)"
          secureTextEntry={secureTextEntry}
          autoComplete={autoComplete}
          textContentType={textContentType}
          keyboardType={keyboardType}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          editable={!disabled}
          style={[styles.input, icon && styles.inputWithIcon]}
        />
        {rightElement}
      </View>
    </View>
  );
});

/* =========================
   COMPONENTE: SOCIAL BUTTON
========================= */
const SocialButton = React.memo(function SocialButton({ icon, onPress, disabled, label }) {
  return (
    <TouchableOpacity
      style={[styles.socialButton, disabled && styles.socialButtonDisabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      accessibilityLabel={label}
      accessibilityRole="button"
    >
      <FontAwesome name={icon} size={20} color="#fff" />
    </TouchableOpacity>
  );
});

/* =========================
   COMPONENTE: FORMULARIO
========================= */
const LoginForm = React.memo(function LoginForm({
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
  attempts,
  onSubmit,
  handleGoogle,
  handleFacebook,
  handleApple,
  navigation,
}) {
  const handleEmailBlur = useCallback(() => {
    setEmail((e) => (e || "").trim().toLowerCase());
  }, [setEmail]);

  const togglePasswordVisibility = useCallback(() => {
    setShow((prev) => !prev);
  }, [setShow]);

  return (
    <View style={styles.formContainer}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Bienvenido de nuevo</Text>
        <Text style={styles.subtitleText}>Inicia sesión para continuar</Text>
      </View>

      {/* Email Input */}
      <InputField
        label="Correo electrónico"
        value={email}
        onChangeText={setEmail}
        onBlur={handleEmailBlur}
        placeholder="tu@email.com"
        autoComplete="email"
        textContentType="username"
        keyboardType="email-address"
        returnKeyType="next"
        disabled={locked}
        icon="envelope"
      />

      {/* Password Input */}
      <InputField
        label="Contraseña"
        value={pwd}
        onChangeText={setPwd}
        placeholder="••••••••"
        secureTextEntry={!show}
        autoComplete="password"
        textContentType="password"
        returnKeyType="done"
        onSubmitEditing={onSubmit}
        disabled={locked}
        icon="lock"
        rightElement={
          <TouchableOpacity
            onPress={togglePasswordVisibility}
            style={styles.eyeButton}
            accessibilityRole="button"
            accessibilityLabel={show ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            <FontAwesome
              name={show ? "eye-slash" : "eye"}
              size={18}
              color="rgba(255,255,255,0.6)"
            />
          </TouchableOpacity>
        }
      />

      {/* Attempts Warning */}
      {attempts > 0 && attempts < RATE_LIMIT.MAX_ATTEMPTS && !locked && (
        <View style={styles.warningContainer}>
          <FontAwesome name="exclamation-triangle" size={14} color="#f59e0b" />
          <Text style={styles.warningText}>
            Intentos restantes: {RATE_LIMIT.MAX_ATTEMPTS - attempts}
          </Text>
        </View>
      )}

      {/* Forgot Password Link */}
      <TouchableOpacity
        onPress={() => navigation.navigate("ForgotPassword")}
        style={styles.forgotPasswordButton}
        accessibilityRole="button"
      >
        <Text style={styles.forgotPasswordText}>¿Olvidaste tu contraseña?</Text>
      </TouchableOpacity>

      {/* Login Button */}
      <TouchableOpacity
        disabled={!canSubmit}
        onPress={onSubmit}
        activeOpacity={0.8}
        style={[styles.loginButton, !canSubmit && styles.loginButtonDisabled]}
        accessibilityRole="button"
        accessibilityLabel="Iniciar sesión"
      >
        <LinearGradient
          colors={["#8b5cf6", "#7c3aed"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.loginButtonGradient}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.loginButtonText}>
              {locked && lockRunning ? `Bloqueado (${lockSeconds}s)` : "Iniciar sesión"}
            </Text>
          )}
        </LinearGradient>
      </TouchableOpacity>

      {/* Divider */}
      <View style={styles.dividerContainer}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>O continúa con</Text>
        <View style={styles.dividerLine} />
      </View>

      {/* Social Login Buttons */}
      <View style={styles.socialContainer}>
        <SocialButton
          icon="google"
          onPress={handleGoogle}
          disabled={locked || submitting}
          label="Iniciar sesión con Google"
        />
        <SocialButton
          icon="facebook"
          onPress={handleFacebook}
          disabled={locked || submitting}
          label="Iniciar sesión con Facebook"
        />
        {Platform.OS === "ios" && (
          <SocialButton
            icon="apple"
            onPress={handleApple}
            disabled={locked || submitting}
            label="Iniciar sesión con Apple"
          />
        )}
      </View>

      {/* Register Link */}
      <View style={styles.registerContainer}>
        <Text style={styles.registerText}>¿No tienes una cuenta? </Text>
        <TouchableOpacity
          onPress={() => navigation.navigate("Register")}
          accessibilityRole="button"
        >
          <Text style={styles.registerLink}>Regístrate</Text>
        </TouchableOpacity>
      </View>

      {/* Legal Notice */}
      <Text style={styles.legalText}>
        Al continuar, aceptas nuestros Términos de Servicio y Política de Privacidad
      </Text>

      {/* Debug Button */}
      {__DEV__ && (
        <TouchableOpacity
          onPress={() => {
            console.log("[LoginScreen] Estado:", {
              email,
              pwd: pwd.length > 0 ? `*** (${pwd.length} chars)` : "(vacío)",
              validEmail: validateEmail(email),
              validPwd: pwd.length >= PASSWORD_REQUIREMENTS.MIN_LENGTH,
              attempts,
              locked,
              submitting,
              canSubmit,
            });
          }}
          style={styles.debugButton}
        >
          <Text style={styles.debugText}>🐛 Debug State</Text>
        </TouchableOpacity>
      )}
    </View>
  );
});

/* =========================
   PANTALLA PRINCIPAL
========================= */
export default function LoginScreen({ navigation }) {
  useEffect(() => runValidationTestsOnce(), []);

  const { login: authLogin } = useAuth();
  const { width } = useWindowDimensions();

  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [show, setShow] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [locked, setLocked] = useState(false);

  const { seconds: lockSeconds, reset: resetLock, running: lockRunning } = useCountdown(0, {
    autoStart: false,
    onFinish: () => {
      console.log("[LoginScreen] Bloqueo finalizado");
      setLocked(false);
    },
  });

  const validEmail = useMemo(() => validateEmail(email), [email]);
  const validPwd = useMemo(() => pwd.length >= PASSWORD_REQUIREMENTS.MIN_LENGTH, [pwd]);
  const canSubmit = useMemo(
    () => validEmail && validPwd && !submitting && !locked,
    [validEmail, validPwd, submitting, locked]
  );

  const isWeb = Platform.OS === "web";
  const isNarrow = isWeb && width < 1024;

  useEffect(() => {
    if (!__DEV__) {
      const apiBase = API_URL || "";
      if (typeof apiBase === "string" && !apiBase.startsWith("https://")) {
        console.warn("⚠️ [SEGURIDAD] Usar HTTPS en producción");
      }
    }
  }, []);

  useEffect(() => {
    if (attempts > 0) {
      const resetTimer = setTimeout(() => {
        console.log("[LoginScreen] Reset intentos por inactividad");
        setAttempts(0);
      }, RATE_LIMIT.RESET_AFTER_INACTIVITY);
      return () => clearTimeout(resetTimer);
    }
  }, [attempts]);

  const setSessionToken = useCallback(async (token, userData = null) => {
    try {
      await authLogin(token, userData);
      setAuthToken(token);
    } catch (err) {
      console.error("[LoginScreen] Error guardando sesión:", err);
      throw new Error("No se pudo guardar la sesión");
    }
  }, [authLogin]);

  const applyRateLimitLock = useCallback((ms) => {
    const wait = Math.max(RATE_LIMIT.MIN_WAIT, Math.min(ms || 60000, RATE_LIMIT.MAX_WAIT));
    setLocked(true);
    resetLock(Math.ceil(wait / 1000), true);
  }, [resetLock]);

  const onSubmit = useCallback(async () => {
    if (!canSubmit) return;

    try {
      setSubmitting(true);
      const res = await login(email.trim().toLowerCase(), pwd);

      if (!res?.token) {
        throw Object.assign(
          new Error(res?.message || "Credenciales inválidas"),
          { status: res?.status || 401 }
        );
      }

      await setSessionToken(res.token, res.user || null);
      setAttempts(0);
    } catch (error) {
      console.error("[LoginScreen] Error:", error);

      if (error?.status === 429) {
        const ms = error?.retryAfterSeconds ? error.retryAfterSeconds * 1000 : 60000;
        applyRateLimitLock(ms);
        Alert.alert(
          "Demasiadas solicitudes",
          `Intenta en ${Math.ceil(ms / 1000)} segundos`
        );
        return;
      }

      const nextAttempts = attempts + 1;
      setAttempts(nextAttempts);

      if (nextAttempts >= RATE_LIMIT.MAX_ATTEMPTS) {
        applyRateLimitLock(RATE_LIMIT.LOCKOUT_DURATION);
        Alert.alert(
          "Demasiados intentos",
          `Espera ${RATE_LIMIT.LOCKOUT_DURATION / 1000}s antes de reintentar`
        );
      } else {
        let errorMessage = "Revisa tus credenciales";
        if (error?.status === 401) errorMessage = "Email o contraseña incorrectos";
        else if (error?.status === 400) errorMessage = error?.message || "Datos inválidos";
        else if (error?.status >= 500) errorMessage = "Error del servidor";
        else if (error?.message) errorMessage = error.message;

        Alert.alert(
          "Error de inicio de sesión",
          `${errorMessage}\n\nIntentos restantes: ${RATE_LIMIT.MAX_ATTEMPTS - nextAttempts}`
        );
      }
    } finally {
      setSubmitting(false);
    }
  }, [canSubmit, email, pwd, attempts, setSessionToken, applyRateLimitLock]);

  const socialLogin = useCallback(async (provider, payload) => {
    try {
      const res = await fetchWithTimeout(
        `${API_URL}/auth/social/${provider}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
        TIMEOUTS.FETCH
      );

      if (res.status === 429) {
        const wait = parseRetryAfter(res.headers.get("retry-after")) ?? 60000;
        applyRateLimitLock(wait);
        throw new Error(`Intenta en ${Math.ceil(wait / 1000)}s`);
      }

      if (!res.ok) {
        const msg = await parseErrorResponse(res);
        throw new Error(msg || `Error ${res.status}`);
      }

      const data = await res.json();
      if (data?.token) {
        await setSessionToken(data.token, data.user || null);
        setAttempts(0);
      }
      return data;
    } catch (error) {
      console.error(`[LoginScreen] socialLogin(${provider}):`, error);
      throw error;
    }
  }, [applyRateLimitLock, setSessionToken]);

  const handleGoogle = useCallback(async () => {
    try {
      const result = await signInWithGoogle();
      if (result?.idToken) {
        await socialLogin("google", { idToken: result.idToken });
      } else if (result?.email) {
        await socialLogin("google", {
          email: String(result.email).trim().toLowerCase(),
          fullName: result.name || result.fullName || "Usuario",
          oauthId: result.sub || result.id,
        });
      } else {
        throw new Error("No se obtuvo credencial de Google");
      }
    } catch (error) {
      Alert.alert("Error con Google", error.message || "Intenta nuevamente");
    }
  }, [socialLogin]);

  const handleFacebook = useCallback(async () => {
    try {
      const result = await signInWithFacebook();
      if (result?.accessToken) {
        await socialLogin("facebook", { accessToken: result.accessToken });
      } else if (result?.email) {
        await socialLogin("facebook", {
          email: String(result.email).trim().toLowerCase(),
          fullName: result.name || "Usuario",
          oauthId: result.id,
        });
      } else {
        throw new Error("No se obtuvo credencial de Facebook");
      }
    } catch (error) {
      Alert.alert("Error con Facebook", error.message || "Intenta nuevamente");
    }
  }, [socialLogin]);

  const handleApple = useCallback(async () => {
    try {
      const result = await signInWithApple();
      if (result?.identityToken) {
        await socialLogin("apple", { identityToken: result.identityToken });
      } else if (result?.email) {
        await socialLogin("apple", {
          email: String(result.email).trim().toLowerCase(),
          fullName: result.name || result.fullName || "Usuario",
          oauthId: result.user || result.sub || result.id,
        });
      } else {
        throw new Error("No se obtuvo credencial de Apple");
      }
    } catch (error) {
      Alert.alert("Error con Apple", error.message || "Intenta nuevamente");
    }
  }, [socialLogin]);

  /* =========================
     RENDER
  ========================= */
  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={["#0f0f1e", "#1a1a2e", "#16213e"]}
        style={styles.gradient}
      >
        {/* Animated Background Elements */}
        <View style={styles.backgroundElements}>
          <View style={[styles.circle, styles.circle1]} />
          <View style={[styles.circle, styles.circle2]} />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.keyboardView}
        >
          {isWeb && !isNarrow ? (
            /* Desktop Layout */
            <View style={styles.desktopContainer}>
              <View style={styles.leftSection}>
                <View style={styles.brandingContainer}>
                  <Image
                    source={require("../assets/Logo3.png")}
                    style={styles.logo}
                    resizeMode="contain"
                  />
                  <Text style={styles.brandName}>CiviHelper</Text>
                  <Text style={styles.brandTagline}>
                    Tu asistente ciudadano digital
                  </Text>
                </View>
                <Image
                  source={require("../assets/login-illustration.png")}
                  style={styles.illustration}
                  resizeMode="contain"
                />
              </View>

              <View style={styles.rightSection}>
                <ScrollView
                  contentContainerStyle={styles.scrollContent}
                  showsVerticalScrollIndicator={false}
                  bounces={false}
                >
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
                    attempts={attempts}
                    onSubmit={onSubmit}
                    handleGoogle={handleGoogle}
                    handleFacebook={handleFacebook}
                    handleApple={handleApple}
                    navigation={navigation}
                  />
                </ScrollView>
              </View>
            </View>
          ) : (
            /* Mobile Layout */
            <ScrollView
              contentContainerStyle={styles.mobileContent}
              showsVerticalScrollIndicator={false}
              bounces={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.mobileBranding}>
                <Image
                  source={require("../assets/Logo3.png")}
                  style={styles.logoMobile}
                  resizeMode="contain"
                />
                <Text style={styles.brandNameMobile}>CiviHelper</Text>
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
                attempts={attempts}
                onSubmit={onSubmit}
                handleGoogle={handleGoogle}
                handleFacebook={handleFacebook}
                handleApple={handleApple}
                navigation={navigation}
              />
            </ScrollView>
          )}
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}

/* =========================
   ESTILOS
========================= */
const styles = StyleSheet.create({
  // Container principal
  container: {
    flex: 1,
    backgroundColor: "#0f0f1e",
  },

  gradient: {
    flex: 1,
  },

  keyboardView: {
    flex: 1,
  },

  // Elementos de fondo
  backgroundElements: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },

  circle: {
    position: "absolute",
    borderRadius: 9999,
    opacity: 0.15,
    ...(Platform.OS === "web" ? { filter: "blur(60px)" } : {}),
  },

  circle1: {
    width: 400,
    height: 400,
    backgroundColor: "#8b5cf6",
    top: -200,
    right: -100,
  },

  circle2: {
    width: 300,
    height: 300,
    backgroundColor: "#06b6d4",
    bottom: -150,
    left: -50,
  },

  // Layout Desktop
  desktopContainer: {
    flex: 1,
    flexDirection: "row",
    minHeight: "100vh",
  },

  leftSection: {
    flex: 1,
    padding: 60,
    justifyContent: "space-between",
    alignItems: "center",
  },

  brandingContainer: {
    alignItems: "center",
    marginTop: 40,
  },

  logo: {
    width: 80,
    height: 80,
    marginBottom: 20,
  },

  brandName: {
    fontSize: 36,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 8,
  },

  brandTagline: {
    fontSize: 16,
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
  },

  illustration: {
    width: "100%",
    maxWidth: 500,
    height: 400,
  },

  rightSection: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },

  scrollContent: {
    width: "100%",
    maxWidth: 440,
  },

  // Layout Mobile
  mobileContent: {
    padding: 24,
    paddingTop: 60,
  },

  mobileBranding: {
    alignItems: "center",
    marginBottom: 48,
  },

  logoMobile: {
    width: 70,
    height: 70,
    marginBottom: 16,
  },

  brandNameMobile: {
    fontSize: 28,
    fontWeight: "700",
    color: "#fff",
  },

  // Form Container
  formContainer: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 24,
    padding: 32,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    ...Platform.select({
      web: {
        backdropFilter: "blur(20px)",
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
      },
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
      },
      android: {
        elevation: 8,
      },
    }),
  },

  // Header
  header: {
    marginBottom: 32,
  },

  welcomeText: {
    fontSize: 28,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 8,
  },

  subtitleText: {
    fontSize: 15,
    color: "rgba(255,255,255,0.6)",
  },

  // Input Fields
  inputWrapper: {
    marginBottom: 20,
  },

  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255,255,255,0.9)",
    marginBottom: 8,
  },

  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.1)",
    height: 50,
    paddingHorizontal: 16,
  },

  inputContainerFocused: {
    borderColor: "#8b5cf6",
    backgroundColor: "rgba(139,92,246,0.1)",
  },

  inputIconContainer: {
    marginRight: 12,
  },

  input: {
    flex: 1,
    color: "#fff",
    fontSize: 15,
    ...(Platform.OS === "web" ? { outlineStyle: "none" } : {}),
  },

  inputWithIcon: {
    marginLeft: 0,
  },

  eyeButton: {
    padding: 8,
  },

  // Warning
  warningContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(245,158,11,0.1)",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },

  warningText: {
    color: "#f59e0b",
    fontSize: 13,
    fontWeight: "600",
  },

  // Forgot Password
  forgotPasswordButton: {
    alignSelf: "flex-end",
    marginBottom: 24,
  },

  forgotPasswordText: {
    color: "#a78bfa",
    fontSize: 14,
    fontWeight: "600",
  },

  // Login Button
  loginButton: {
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 24,
  },

  loginButtonDisabled: {
    opacity: 0.5,
  },

  loginButtonGradient: {
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      web: {
        boxShadow: "0 10px 30px rgba(139,92,246,0.4)",
      },
      ios: {
        shadowColor: "#8b5cf6",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },

  loginButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },

  // Divider
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },

  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
  },

  dividerText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 13,
    marginHorizontal: 16,
  },

  // Social Buttons
  socialContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    marginBottom: 24,
  },

  socialButton: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      web: {
        transition: "all 0.2s ease",
        boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
      },
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },

  socialButtonDisabled: {
    opacity: 0.4,
  },

  // Register
  registerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },

  registerText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
  },

  registerLink: {
    color: "#8b5cf6",
    fontSize: 14,
    fontWeight: "700",
  },

  // Legal Text
  legalText: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
  },

  // Debug Button
  debugButton: {
    marginTop: 16,
    padding: 12,
    backgroundColor: "rgba(245,158,11,0.1)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.3)",
  },

  debugText: {
    color: "#f59e0b",
    fontSize: 13,
    textAlign: "center",
    fontWeight: "600",
  },
});