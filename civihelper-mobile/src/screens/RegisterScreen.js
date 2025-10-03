// src/screens/RegisterScreen.js
import React, { useEffect, useMemo, useRef, useState } from "react";
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
import { useAuth } from "../context/AuthContext";
import { validateEmail, runValidationTestsOnce } from "../utils/validation";

/* ==================== Paleta CiviHelper (oscuro elegante) ==================== */
const PALETTE = {
  // Gradientes de fondo y blobs
  gradientBg: ["#0D0B1F", "#140A2E", "#0B0A1A"],
  blob1: ["rgba(124,58,237,0.35)", "rgba(168,85,247,0.12)"],
  blob2: ["rgba(16,185,129,0.18)", "rgba(59,130,246,0.12)"],
  // CTA
  cta: ["#7C3AED", "#A855F7"],
  // Superficies
  cardGlass: "rgba(255,255,255,0.05)",
  borderSubtle: "rgba(255,255,255,0.10)",
  inputBg: "rgba(10,10,25,0.85)",
  inputBorder: "rgba(255,255,255,0.08)",
  // Texto
  text: "#FFFFFF",
  sub: "rgba(255,255,255,0.80)",
  muted: "rgba(255,255,255,0.70)",
  helper: "rgba(255,255,255,0.55)",
  // Accentos
  primary600: "#7C3AED",
  primary500: "#A855F7",
  primary300: "#C4B5FD",
  primary200: "#A78BFA",
  error: "#EF4444",
};

export default function RegisterScreen({ navigation }) {
  useEffect(() => runValidationTestsOnce(), []);

  const { signUp } = useAuth();

  const [name, setName] = useState("");
  const [emailRaw, setEmailRaw] = useState("");
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showPwd2, setShowPwd2] = useState(false);
  const [role, setRole] = useState("CLIENT");
  const [submitting, setSubmitting] = useState(false);

  // Refs para flujo de teclado
  const emailRef = useRef(null);
  const pwdRef = useRef(null);
  const pwd2Ref = useRef(null);

  const nameTrim = String(name).trim();
  const email = String(emailRaw).trim().toLowerCase();

  const validName = nameTrim.length >= 2;
  const validEmail = validateEmail(email);
  const validPwd = String(pwd).length >= 8;
  const matchPwd = pwd2 === pwd && pwd2.length > 0;

  const canSubmit = useMemo(
    () => validName && validEmail && validPwd && matchPwd && !submitting,
    [validName, validEmail, validPwd, matchPwd, submitting]
  );

  const onSubmit = async () => {
    if (!canSubmit) return;
    try {
      setSubmitting(true);
      const res = await signUp({ name: nameTrim, email, password: pwd, role });
      if (res?.token) {
        // Entra al enrutador por rol
        navigation.replace("RoleRoot");
        return;
      }
      throw Object.assign(new Error(res?.message || "No se pudo crear la cuenta"), { status: res?.status });
    } catch (e) {
      if (e?.status === 429) {
        const wait = e?.retryAfterSeconds ? `${e.retryAfterSeconds} segundos` : "unos instantes";
        Alert.alert("Demasiadas solicitudes", `Intenta nuevamente en ${wait}.`);
        return;
      }
      const msg =
        e?.status === 409
          ? "Ese correo ya está registrado."
          : e?.message || "No se pudo crear la cuenta. Inténtalo nuevamente.";
      Alert.alert("Error de registro", msg);
    } finally {
      setSubmitting(false);
    }
  };

  const onGoLogin = () => navigation.navigate("Login");

  // Layout
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === "web";
  const isNarrow = isWeb && width < 1024;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "transparent" }}>
      {/* Fondo global */}
      <LinearGradient
        colors={PALETTE.gradientBg}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      {/* blobs decorativos */}
      <LinearGradient
        colors={PALETTE.blob1}
        style={[styles.blob, { top: -80, left: -60 }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        pointerEvents="none"
      />
      <LinearGradient
        colors={PALETTE.blob2}
        style={[styles.blob, { bottom: -90, right: -70, transform: [{ scale: 1.2 }] }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        pointerEvents="none"
      />

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        {isWeb ? (
          // WEB: 2 columnas (imagen a la izquierda, formulario a la derecha)
          <View style={styles.webShell}>
            <View style={[styles.webContainer, isNarrow && styles.webContainerNarrow]}>
              {/* Izquierda: Imagen */}
              <View style={[styles.leftPane, isNarrow && styles.leftPaneNarrow]}>
                <Image
                  source={require("../assets/register-illustration.png")}
                  style={[styles.illustration, isNarrow && styles.illustrationNarrow]}
                  resizeMode="cover"
                />
              </View>

              {/* Derecha: Form glass */}
              <View style={[styles.rightPane, isNarrow && styles.rightPaneNarrow]}>
                <ScrollView
                  contentContainerStyle={styles.rightContent}
                  bounces={false}
                  showsVerticalScrollIndicator={false}
                >
                  <View style={styles.brandRow}>
                    <Image source={require("../assets/Logo2.png")} style={styles.brandIcon} resizeMode="contain" />
                    <Text style={styles.brandText}>CiviHelper</Text>
                  </View>

                  <RegisterForm
                    name={name}
                    setName={setName}
                    email={email}
                    setEmail={setEmailRaw}
                    pwd={pwd}
                    setPwd={setPwd}
                    pwd2={pwd2}
                    setPwd2={setPwd2}
                    showPwd={showPwd}
                    setShowPwd={setShowPwd}
                    showPwd2={showPwd2}
                    setShowPwd2={setShowPwd2}
                    role={role}
                    setRole={setRole}
                    canSubmit={canSubmit}
                    submitting={submitting}
                    onSubmit={onSubmit}
                    onGoLogin={onGoLogin}
                    refs={{ emailRef, pwdRef, pwd2Ref }}
                  />
                </ScrollView>
              </View>
            </View>
          </View>
        ) : (
          // NATIVO: Hero + form
          <ScrollView contentContainerStyle={{ flexGrow: 1 }} bounces={false} showsVerticalScrollIndicator={false}>
            <View style={styles.hero}>
              <View style={styles.brandRow}>
                <Image source={require("../assets/Logo2.png")} style={styles.brandIcon} resizeMode="contain" />
                <Text style={styles.brandText}>CiviHelper</Text>
              </View>
              <Text style={styles.heroTitle}>Crea tu cuenta</Text>
              <Text style={styles.heroSubtitle}>Únete y encuentra o publica servicios</Text>
            </View>

            <View style={{ padding: 20 }}>
              <RegisterForm
                name={name}
                setName={setName}
                email={email}
                setEmail={setEmailRaw}
                pwd={pwd}
                setPwd={setPwd}
                pwd2={pwd2}
                setPwd2={setPwd2}
                showPwd={showPwd}
                setShowPwd={setShowPwd}
                showPwd2={showPwd2}
                setShowPwd2={setShowPwd2}
                role={role}
                setRole={setRole}
                canSubmit={canSubmit}
                submitting={submitting}
                onSubmit={onSubmit}
                onGoLogin={onGoLogin}
                refs={{ emailRef, pwdRef, pwd2Ref }}
              />
            </View>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* -------------------------- Form -------------------------- */
function RegisterForm({
  name,
  setName,
  email,
  setEmail,
  pwd,
  setPwd,
  pwd2,
  setPwd2,
  showPwd,
  setShowPwd,
  showPwd2,
  setShowPwd2,
  role,
  setRole,
  canSubmit,
  submitting,
  onSubmit,
  onGoLogin,
  refs,
}) {
  const { emailRef, pwdRef, pwd2Ref } = refs || {};

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Crear cuenta</Text>
      <Text style={styles.subtitle}>Únete y encuentra o publica servicios</Text>

      {/* Nombre */}
      <View style={{ marginBottom: 14 }}>
        <Text style={styles.labelDark}>Nombre</Text>
        <TextInput
          placeholder="Tu nombre"
          placeholderTextColor={PALETTE.helper}
          value={name}
          onChangeText={setName}
          style={styles.inputDark}
          returnKeyType="next"
          accessibilityLabel="Nombre"
          onSubmitEditing={() => emailRef?.current?.focus()}
          blurOnSubmit={false}
        />
      </View>

      {/* Email */}
      <View style={{ marginBottom: 14 }}>
        <Text style={styles.labelDark}>Correo electrónico</Text>
        <TextInput
          ref={emailRef}
          placeholder="tucorreo@ejemplo.com"
          placeholderTextColor={PALETTE.helper}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          style={styles.inputDark}
          returnKeyType="next"
          textContentType="emailAddress"
          autoComplete="email"
          accessibilityLabel="Correo electrónico"
          onSubmitEditing={() => pwdRef?.current?.focus()}
          blurOnSubmit={false}
        />
        {!!email && !validateEmail(email) && (
          <Text style={styles.errText}>Formato de correo no válido.</Text>
        )}
      </View>

      {/* Password */}
      <View style={{ marginBottom: 14 }}>
        <View style={styles.rowBetween}>
          <Text style={styles.labelDark}>Contraseña</Text>
          <TouchableOpacity onPress={() => setShowPwd((s) => !s)}>
            <Text style={styles.link}>{showPwd ? "Ocultar" : "Mostrar"}</Text>
          </TouchableOpacity>
        </View>
        <TextInput
          ref={pwdRef}
          placeholder="••••••••"
          placeholderTextColor={PALETTE.helper}
          secureTextEntry={!showPwd}
          autoComplete="password"
          textContentType="newPassword"
          value={pwd}
          onChangeText={setPwd}
          style={styles.inputDark}
          returnKeyType="next"
          accessibilityLabel="Contraseña"
          onSubmitEditing={() => pwd2Ref?.current?.focus()}
          blurOnSubmit={false}
        />
        {!!pwd && pwd.length < 8 && <Text style={styles.errText}>Mínimo 8 caracteres.</Text>}
      </View>

      {/* Confirmación */}
      <View style={{ marginBottom: 14 }}>
        <View style={styles.rowBetween}>
          <Text style={styles.labelDark}>Confirmar contraseña</Text>
          <TouchableOpacity onPress={() => setShowPwd2((s) => !s)}>
            <Text style={styles.link}>{showPwd2 ? "Ocultar" : "Mostrar"}</Text>
          </TouchableOpacity>
        </View>
        <TextInput
          ref={pwd2Ref}
          placeholder="••••••••"
          placeholderTextColor={PALETTE.helper}
          secureTextEntry={!showPwd2}
          autoComplete="password"
          textContentType="newPassword"
          value={pwd2}
          onChangeText={setPwd2}
          style={styles.inputDark}
          returnKeyType="done"
          onSubmitEditing={onSubmit}
          accessibilityLabel="Confirmar contraseña"
        />
        {!!pwd2 && pwd2 !== pwd && <Text style={styles.errText}>Las contraseñas no coinciden.</Text>}
      </View>

      {/* Rol */}
      <View style={{ marginBottom: 10 }}>
        <Text style={styles.labelDark}>Rol</Text>
        <View style={styles.roleRow}>
          <TouchableOpacity
            onPress={() => setRole("CLIENT")}
            style={[styles.rolePill, role === "CLIENT" && styles.rolePillActive]}
            accessibilityRole="button"
          >
            <Text style={[styles.roleText, role === "CLIENT" && styles.roleTextActive]}>CLIENT</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setRole("PROVIDER")}
            style={[styles.rolePill, role === "PROVIDER" && styles.rolePillActive]}
            accessibilityRole="button"
          >
            <Text style={[styles.roleText, role === "PROVIDER" && styles.roleTextActive]}>PROVIDER</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Botón primario (gradiente CTA) */}
      <TouchableOpacity
        onPress={onSubmit}
        disabled={!canSubmit || submitting}
        accessibilityRole="button"
        accessibilityState={{ disabled: !canSubmit || submitting }}
        style={{ marginTop: 8, borderRadius: 12, overflow: "hidden" }}
      >
        <LinearGradient
          colors={PALETTE.cta}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.primaryBtn, (!canSubmit || submitting) && { opacity: 0.6 }]}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>Crear cuenta</Text>
          )}
        </LinearGradient>
      </TouchableOpacity>

      {/* Enlace login */}
      <TouchableOpacity onPress={onGoLogin} style={{ marginTop: 12 }}>
        <Text style={styles.altLinkCenter}>¿Ya tienes cuenta? Inicia sesión</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  // HERO (nativo)
  hero: {
    padding: 24,
    paddingTop: 36,
    paddingBottom: 36,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    backgroundColor: "transparent",
  },
  brandRow: { flexDirection: "row", alignItems: "center" },
  brandIcon: { width: 36, height: 36, marginRight: 8 },
  brandText: { color: PALETTE.text, fontWeight: "800", fontSize: 18, letterSpacing: 0.5 },

  heroTitle: { color: PALETTE.text, fontWeight: "900", fontSize: 24, marginTop: 10 },
  heroSubtitle: { color: PALETTE.sub, fontSize: 14, marginTop: 4 },

  // Web layout
  webShell: { flex: 1, padding: 20 },
  webContainer: {
    flex: 1,
    flexDirection: "row",
    gap: 20,
    maxWidth: 1200,
    width: "100%",
    alignSelf: "center",
  },
  webContainerNarrow: { flexDirection: "column" },

  leftPane: {
    flexBasis: "50%",
    flexGrow: 1,
    minHeight: "100vh",
    overflow: "hidden",
    borderRadius: 20,
  },
  leftPaneNarrow: {
    width: "100%",
    minHeight: 240,
    borderRadius: 16,
  },
  illustration: { width: "100%", height: "100%" },
  illustrationNarrow: { height: 240 },

  rightPane: { flexBasis: "50%", flexGrow: 1, minHeight: "100vh" },
  rightPaneNarrow: { width: "100%", minHeight: "auto" },
  rightContent: { padding: 24, maxWidth: 560, width: "100%", alignSelf: "center" },

  // Card de registro (glass)
  card: {
    width: "100%",
    borderRadius: 16,
    padding: 20,
    backgroundColor: PALETTE.cardGlass,
    borderWidth: 1,
    borderColor: PALETTE.borderSubtle,
    ...Platform.select({
      web: { boxShadow: "0 30px 90px rgba(0,0,0,0.45)", backdropFilter: "blur(14px) saturate(120%)" },
      ios: { shadowColor: "#000", shadowOpacity: 0.28, shadowRadius: 18, shadowOffset: { width: 0, height: 10 } },
      android: { elevation: 4 },
    }),
  },
  title: { color: PALETTE.text, fontWeight: "900", fontSize: 20 },
  subtitle: { color: PALETTE.sub, marginTop: 4 },

  labelDark: { color: "rgba(255,255,255,0.92)", marginBottom: 6, fontSize: 13 },
  inputDark: {
    height: 48,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: PALETTE.inputBorder,
    color: PALETTE.text,
    backgroundColor: PALETTE.inputBg,
  },
  errText: { color: "#FCA5A5", fontSize: 12, marginTop: 6 },

  primaryBtn: {
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  primaryBtnText: { color: "#fff", fontWeight: "800", fontSize: 16 },

  altLinkCenter: { color: PALETTE.primary300, fontWeight: "700", textAlign: "center" },

  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },

  roleRow: { flexDirection: "row", gap: 8, marginTop: 6 },
  rolePill: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: PALETTE.inputBorder,
    backgroundColor: PALETTE.inputBg,
  },
  rolePillActive: {
    backgroundColor: "rgba(168,85,247,0.18)", // primary/500 con opacidad
    borderColor: "rgba(168,85,247,0.45)",
  },
  roleText: { color: PALETTE.muted, fontWeight: "700" },
  roleTextActive: { color: PALETTE.text },

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
