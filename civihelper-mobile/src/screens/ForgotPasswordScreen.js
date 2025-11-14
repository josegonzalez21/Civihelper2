/**
 * Pantalla de restablecimiento de contraseña
 * 
 * Permite a los usuarios restablecer su contraseña usando un código/token
 * enviado previamente a su correo electrónico.
 * 
 * Características:
 * - Validación en tiempo real de email, token y contraseñas
 * - Confirmación de contraseña con verificación de coincidencia
 * - Rate limiting con countdown visual
 * - Manejo robusto de errores
 * - Toggle de visibilidad de contraseñas
 * 
 * @module screens/ResetPasswordScreen
 */

import React, { useEffect, useMemo, useState, useCallback } from "react";
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
import { createShadow } from "../utils/shadowHelper";
import Colors from "../theme/color";

/* =========================
   CONSTANTES DE CONFIGURACIÓN
========================= */

const PASSWORD_REQUIREMENTS = {
  MIN_LENGTH: 8,
  MIN_TOKEN_LENGTH: 4,
};

const RATE_LIMIT = {
  MIN_WAIT: 5000, // 5 segundos
  MAX_WAIT: 300000, // 5 minutos
  DEFAULT_WAIT: 60000, // 1 minuto
};

const VALIDATION_MESSAGES = {
  EMAIL_INVALID: "Formato de correo no válido.",
  TOKEN_INVALID: "Ingresa el código que recibiste en tu correo.",
  PASSWORD_SHORT: `Mínimo ${PASSWORD_REQUIREMENTS.MIN_LENGTH} caracteres.`,
  PASSWORDS_MISMATCH: "Las contraseñas no coinciden.",
};

/* =========================
   COMPONENTE PRINCIPAL
========================= */

/**
 * Pantalla de restablecimiento de contraseña
 * 
 * @param {Object} props
 * @param {Object} props.navigation - Objeto de navegación
 * @param {Object} props.route - Objeto de ruta con parámetros
 * @param {string} [props.route.params.email] - Email pre-llenado (opcional)
 */
export default function ResetPasswordScreen({ navigation, route }) {
  // Email pre-llenado desde parámetros de navegación
  const presetEmail = route?.params?.email || "";

  // Estado del formulario
  const [email, setEmail] = useState(presetEmail);
  const [token, setToken] = useState("");
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showPwd2, setShowPwd2] = useState(false);
  const [loading, setLoading] = useState(false);

  // Estado de rate limiting
  const [lockUntil, setLockUntil] = useState(0);
  const [countdown, setCountdown] = useState(null);

  // Computados
  const locked = useMemo(() => Date.now() < lockUntil, [lockUntil]);

  /**
   * Actualiza el countdown del rate limiting
   */
  useEffect(() => {
    if (!lockUntil) return;

    const intervalId = setInterval(() => {
      const remainingSeconds = Math.max(
        0,
        Math.ceil((lockUntil - Date.now()) / 1000)
      );
      setCountdown(remainingSeconds);

      if (remainingSeconds <= 0) {
        clearInterval(intervalId);
      }
    }, 500);

    return () => clearInterval(intervalId);
  }, [lockUntil]);

  /**
   * Validaciones del formulario
   */
  const validEmail = useMemo(() => validateEmail(email), [email]);
  const validPwd = useMemo(
    () => pwd.length >= PASSWORD_REQUIREMENTS.MIN_LENGTH,
    [pwd]
  );
  const passwordsMatch = useMemo(
    () => pwd === pwd2 && pwd2.length > 0,
    [pwd, pwd2]
  );
  const validToken = useMemo(
    () => token.trim().length >= PASSWORD_REQUIREMENTS.MIN_TOKEN_LENGTH,
    [token]
  );

  /**
   * Determina si el formulario puede ser enviado
   */
  const canSubmit = useMemo(
    () => validEmail && validPwd && passwordsMatch && validToken && !loading && !locked,
    [validEmail, validPwd, passwordsMatch, validToken, loading, locked]
  );

  /**
   * Aplica un bloqueo temporal por rate limiting
   * @param {number} ms - Duración del bloqueo en milisegundos
   */
  const applyRateLimitLock = useCallback((ms) => {
    const wait = Math.max(
      RATE_LIMIT.MIN_WAIT,
      Math.min(ms, RATE_LIMIT.MAX_WAIT)
    );
    setLockUntil(Date.now() + wait);
  }, []);

  /**
   * Maneja el envío del formulario de restablecimiento
   */
  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;

    try {
      setLoading(true);

      await api.resetPassword({
        email: email.trim().toLowerCase(),
        token: token.trim(),
        newPassword: pwd,
      });

      Alert.alert(
        "¡Listo!",
        "Tu contraseña fue restablecida exitosamente. Ya puedes iniciar sesión con tu nueva contraseña.",
        [
          {
            text: "Iniciar sesión",
            onPress: () => navigation.replace("Login"),
          },
        ]
      );
    } catch (error) {
      console.error("[ResetPasswordScreen] Error:", error);

      // Manejo de rate limiting (429)
      if (error?.status === 429) {
        const wait = error?.retryAfterSeconds
          ? error.retryAfterSeconds * 1000
          : RATE_LIMIT.DEFAULT_WAIT;

        applyRateLimitLock(wait);
        Alert.alert(
          "Demasiadas solicitudes",
          `Por favor, intenta nuevamente en ${Math.ceil(wait / 1000)} segundos.`
        );
        return;
      }

      // Manejo de token inválido o expirado
      if (error?.status === 400 || error?.status === 401) {
        Alert.alert(
          "Código inválido",
          "El código ingresado es inválido o ha expirado. Por favor, solicita uno nuevo.",
          [
            {
              text: "Solicitar nuevo código",
              onPress: () => navigation.replace("ForgotPassword", { email }),
            },
            { text: "Intentar de nuevo", style: "cancel" },
          ]
        );
        return;
      }

      Alert.alert(
        "Error",
        error?.message || "No se pudo restablecer la contraseña. Por favor, intenta nuevamente."
      );
    } finally {
      setLoading(false);
    }
  }, [canSubmit, email, token, pwd, navigation, applyRateLimitLock]);

  /**
   * Navega hacia atrás o al login
   */
  const handleGoBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.replace("Login");
    }
  }, [navigation]);

  /**
   * Navega a la pantalla de recuperación de contraseña
   */
  const handleRequestNewCode = useCallback(() => {
    navigation.navigate("ForgotPassword", { email });
  }, [navigation, email]);

  /**
   * Toggles de visibilidad de contraseñas
   */
  const togglePasswordVisibility = useCallback(() => {
    setShowPwd((prev) => !prev);
  }, []);

  const togglePassword2Visibility = useCallback(() => {
    setShowPwd2((prev) => !prev);
  }, []);

  /**
   * Normaliza el email al cambiar
   */
  const handleEmailChange = useCallback((text) => {
    setEmail(text.trim().toLowerCase());
  }, []);

  /**
   * Calcula el tiempo restante de bloqueo
   */
  const getLockdownTime = useCallback(() => {
    return countdown ?? Math.ceil((lockUntil - Date.now()) / 1000);
  }, [countdown, lockUntil]);

  /* =========================
     RENDERIZADO
  ========================= */

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header con gradiente */}
      <LinearGradient
        colors={Colors.gradients?.hero || ["#7C3AED", "#A855F7"]}
        style={styles.hero}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.heroRow}>
          {/* Botón de retroceso */}
          <TouchableOpacity
            onPress={handleGoBack}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Volver"
          >
            <Feather name="arrow-left" size={20} color="#fff" />
          </TouchableOpacity>

          {/* Título y subtítulo */}
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>Restablecer contraseña</Text>
            <Text style={styles.heroSub}>
              Ingresa el código recibido y tu nueva contraseña
            </Text>
          </View>

          {/* Espaciador para balance visual */}
          <View style={styles.spacer} />
        </View>
      </LinearGradient>

      {/* Formulario */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            {/* Campo: Email */}
            <Text style={styles.label}>Correo electrónico</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={handleEmailChange}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="tucorreo@ejemplo.com"
              placeholderTextColor={Colors.sub}
              accessibilityLabel="Correo electrónico"
              textContentType="username"
              autoComplete="email"
              returnKeyType="next"
              editable={!locked && !loading}
            />
            {!validEmail && email.length > 0 && (
              <Text style={styles.errorText}>
                {VALIDATION_MESSAGES.EMAIL_INVALID}
              </Text>
            )}

            {/* Campo: Token/Código */}
            <Text style={[styles.label, styles.labelSpaced]}>
              Código de verificación
            </Text>
            <TextInput
              style={styles.input}
              value={token}
              onChangeText={setToken}
              placeholder="Código recibido por correo"
              placeholderTextColor={Colors.sub}
              accessibilityLabel="Código o token de verificación"
              autoCapitalize="none"
              returnKeyType="next"
              editable={!locked && !loading}
              maxLength={10}
            />
            {!validToken && token.length > 0 && (
              <Text style={styles.errorText}>
                {VALIDATION_MESSAGES.TOKEN_INVALID}
              </Text>
            )}

            {/* Campo: Nueva contraseña */}
            <View style={styles.rowBetween}>
              <Text style={[styles.label, styles.labelSpaced]}>
                Nueva contraseña
              </Text>
              <TouchableOpacity
                onPress={togglePasswordVisibility}
                accessibilityRole="button"
                accessibilityLabel={showPwd ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                <Text style={styles.link}>{showPwd ? "Ocultar" : "Mostrar"}</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              value={pwd}
              onChangeText={setPwd}
              placeholder="Mínimo 8 caracteres"
              placeholderTextColor={Colors.sub}
              secureTextEntry={!showPwd}
              textContentType="newPassword"
              accessibilityLabel="Nueva contraseña"
              returnKeyType="next"
              editable={!locked && !loading}
            />
            {pwd.length > 0 && !validPwd && (
              <Text style={styles.errorText}>
                {VALIDATION_MESSAGES.PASSWORD_SHORT}
              </Text>
            )}

            {/* Campo: Confirmar contraseña */}
            <View style={styles.rowBetween}>
              <Text style={[styles.label, styles.labelSpaced]}>
                Confirmar contraseña
              </Text>
              <TouchableOpacity
                onPress={togglePassword2Visibility}
                accessibilityRole="button"
                accessibilityLabel={showPwd2 ? "Ocultar confirmación" : "Mostrar confirmación"}
              >
                <Text style={styles.link}>{showPwd2 ? "Ocultar" : "Mostrar"}</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              value={pwd2}
              onChangeText={setPwd2}
              placeholder="Repite tu nueva contraseña"
              placeholderTextColor={Colors.sub}
              secureTextEntry={!showPwd2}
              textContentType="newPassword"
              accessibilityLabel="Confirmar contraseña"
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
              editable={!locked && !loading}
            />
            {pwd2.length > 0 && !passwordsMatch && (
              <Text style={styles.errorText}>
                {VALIDATION_MESSAGES.PASSWORDS_MISMATCH}
              </Text>
            )}

            {/* Mensaje de bloqueo temporal */}
            {locked && (
              <View style={styles.lockWarning}>
                <Feather name="clock" size={16} color={Colors.danger} />
                <Text style={styles.lockText}>
                  Bloqueado temporalmente. Intenta en {getLockdownTime()} segundos.
                </Text>
              </View>
            )}

            {/* Botón de envío */}
            <PrimaryButton
              onPress={handleSubmit}
              loading={loading}
              disabled={!canSubmit}
              style={styles.submitButton}
            >
              {locked
                ? `Bloqueado ${getLockdownTime()}s`
                : "Restablecer contraseña"}
            </PrimaryButton>

            {/* Enlace para solicitar nuevo código */}
            <TouchableOpacity
              onPress={handleRequestNewCode}
              style={styles.linkContainer}
              accessibilityRole="button"
            >
              <Text style={styles.altLink}>
                ¿No tienes el código? Solicitar uno nuevo
              </Text>
            </TouchableOpacity>

            {/* Aviso de seguridad */}
            <View style={styles.noticeContainer}>
              <Feather name="shield" size={14} color={Colors.sub} />
              <Text style={styles.notice}>
                Tus datos se envían cifrados (HTTPS). No compartas este código con nadie.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* =========================
   ESTILOS
========================= */

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.bg || "#F9FAFB",
  },

  keyboardView: {
    flex: 1,
  },

  // Header con gradiente
  hero: {
    paddingHorizontal: 16,
    paddingTop: Platform.select({
      ios: 10,
      android: 16,
      default: 16,
    }),
    paddingBottom: 16,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
  },

  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

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

  heroContent: {
    flex: 1,
  },

  heroTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
  },

  heroSub: {
    color: "rgba(255,255,255,0.9)",
    marginTop: 4,
    fontSize: 14,
  },

  spacer: {
    width: 36,
  },

  // Contenido
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },

  card: {
    marginTop: -12,
    backgroundColor: Colors.card || "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border || "#E5E7EB",
    ...createShadow({
      elevation: 8,
      shadowColor: "#000",
      shadowOpacity: 0.3,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
    }),
  },

  // Campos de formulario
  label: {
    color: Colors.text || "#0F172A",
    opacity: 0.8,
    fontSize: 13,
    marginBottom: 6,
    fontWeight: "600",
  },

  labelSpaced: {
    marginTop: 12,
  },

  input: {
    height: 48,
    borderWidth: 1,
    borderColor: Colors.border || "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
    color: Colors.text || "#0F172A",
    fontSize: 14,
  },

  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  // Enlaces y botones
  link: {
    color: Colors.primary || "#1E88E5",
    fontWeight: "700",
    fontSize: 13,
  },

  altLink: {
    color: Colors.success || "#43A047",
    fontWeight: "700",
    fontSize: 14,
  },

  linkContainer: {
    marginTop: 12,
    alignSelf: "center",
  },

  submitButton: {
    marginTop: 16,
  },

  // Mensajes de error y avisos
  errorText: {
    color: Colors.danger || "#DC2626",
    marginTop: 6,
    fontSize: 12,
  },

  lockWarning: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    padding: 12,
    backgroundColor: "rgba(220, 38, 38, 0.1)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(220, 38, 38, 0.2)",
  },

  lockText: {
    flex: 1,
    color: Colors.danger || "#DC2626",
    fontSize: 13,
    fontWeight: "600",
  },

  noticeContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 16,
    padding: 12,
    backgroundColor: "rgba(107, 114, 128, 0.05)",
    borderRadius: 8,
  },

  notice: {
    flex: 1,
    color: Colors.sub || "#6B7280",
    fontSize: 11,
    lineHeight: 16,
  },
});