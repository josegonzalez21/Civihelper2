// src/screens/RegisterScreen.js
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
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
import { FontAwesome } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { validateEmail, runValidationTestsOnce } from "../utils/validation";
import { register as apiRegister, setAuthToken } from "../services/api";

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
  inputRef,
  rightElement,
  icon,
  error,
  helperText,
}) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.inputWrapper}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={[
        styles.inputContainer,
        isFocused && styles.inputContainerFocused,
        error && styles.inputContainerError
      ]}>
        {icon && (
          <View style={styles.inputIconContainer}>
            <FontAwesome name={icon} size={18} color="rgba(255,255,255,0.5)" />
          </View>
        )}
        <TextInput
          ref={inputRef}
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
          style={[styles.input, icon && styles.inputWithIcon]}
        />
        {rightElement}
      </View>
      {helperText && <Text style={styles.helperText}>{helperText}</Text>}
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
});

/* =========================
   COMPONENTE: ROLE SELECTOR
========================= */
const RoleSelector = React.memo(function RoleSelector({ value, onChange }) {
  const roles = [
    { id: "CLIENT", label: "Cliente", icon: "user", description: "Busco servicios" },
    { id: "PROVIDER", label: "Proveedor", icon: "briefcase", description: "Ofrezco servicios" }
  ];

  return (
    <View style={styles.roleSelectorWrapper}>
      <Text style={styles.inputLabel}>Tipo de cuenta</Text>
      <View style={styles.roleContainer}>
        {roles.map((role) => (
          <TouchableOpacity
            key={role.id}
            onPress={() => onChange(role.id)}
            style={[
              styles.roleCard,
              value === role.id && styles.roleCardActive
            ]}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`Seleccionar rol ${role.label}`}
          >
            <View style={[
              styles.roleIconContainer,
              value === role.id && styles.roleIconContainerActive
            ]}>
              <FontAwesome
                name={role.icon}
                size={22}
                color={value === role.id ? "#8b5cf6" : "rgba(255,255,255,0.6)"}
              />
            </View>
            <Text style={[
              styles.roleLabel,
              value === role.id && styles.roleLabelActive
            ]}>
              {role.label}
            </Text>
            <Text style={styles.roleDescription}>{role.description}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
});

/* =========================
   COMPONENTE: PASSWORD STRENGTH
========================= */
const PasswordStrength = React.memo(function PasswordStrength({ password }) {
  const strength = useMemo(() => {
    if (!password) return 0;
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return Math.min(score, 4);
  }, [password]);

  const strengthLabels = ["Muy débil", "Débil", "Aceptable", "Fuerte", "Muy fuerte"];
  const strengthColors = ["#ef4444", "#f59e0b", "#eab308", "#10b981", "#059669"];

  if (!password) return null;

  return (
    <View style={styles.strengthContainer}>
      <View style={styles.strengthBars}>
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={[
              styles.strengthBar,
              i < strength && { backgroundColor: strengthColors[strength] }
            ]}
          />
        ))}
      </View>
      <Text style={[styles.strengthLabel, { color: strengthColors[strength] }]}>
        {strengthLabels[strength]}
      </Text>
    </View>
  );
});

/* =========================
   COMPONENTE: FORMULARIO
========================= */
const RegisterForm = React.memo(function RegisterForm({
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
  validations,
}) {
  const { emailRef, pwdRef, pwd2Ref } = refs || {};
  const { emailInvalid, pwdInvalid, pwd2Invalid } = validations || {};

  return (
    <View style={styles.formContainer}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Crea tu cuenta</Text>
        <Text style={styles.subtitleText}>Únete y comienza a conectar</Text>
      </View>

      {/* Nombre */}
      <InputField
        label="Nombre completo"
        value={name}
        onChangeText={setName}
        placeholder="Tu nombre"
        returnKeyType="next"
        icon="user"
        onSubmitEditing={() => emailRef?.current?.focus()}
      />

      {/* Email */}
      <InputField
        label="Correo electrónico"
        value={email}
        onChangeText={setEmail}
        placeholder="tu@email.com"
        autoComplete="email"
        textContentType="emailAddress"
        keyboardType="email-address"
        returnKeyType="next"
        icon="envelope"
        inputRef={emailRef}
        error={emailInvalid ? "Formato de correo no válido" : null}
        onSubmitEditing={() => pwdRef?.current?.focus()}
      />

      {/* Contraseña */}
      <InputField
        label="Contraseña"
        value={pwd}
        onChangeText={setPwd}
        placeholder="••••••••"
        secureTextEntry={!showPwd}
        autoComplete="password"
        textContentType="newPassword"
        returnKeyType="next"
        icon="lock"
        inputRef={pwdRef}
        error={pwdInvalid ? "Mínimo 8 caracteres con letras y números" : null}
        helperText="Usa al menos 8 caracteres con letras y números"
        rightElement={
          <TouchableOpacity
            onPress={() => setShowPwd(!showPwd)}
            style={styles.eyeButton}
          >
            <FontAwesome
              name={showPwd ? "eye-slash" : "eye"}
              size={18}
              color="rgba(255,255,255,0.6)"
            />
          </TouchableOpacity>
        }
        onSubmitEditing={() => pwd2Ref?.current?.focus()}
      />

      {/* Password Strength */}
      <PasswordStrength password={pwd} />

      {/* Confirmar Contraseña */}
      <InputField
        label="Confirmar contraseña"
        value={pwd2}
        onChangeText={setPwd2}
        placeholder="••••••••"
        secureTextEntry={!showPwd2}
        autoComplete="password"
        textContentType="newPassword"
        returnKeyType="done"
        icon="lock"
        inputRef={pwd2Ref}
        error={pwd2Invalid ? "Las contraseñas no coinciden" : null}
        rightElement={
          <TouchableOpacity
            onPress={() => setShowPwd2(!showPwd2)}
            style={styles.eyeButton}
          >
            <FontAwesome
              name={showPwd2 ? "eye-slash" : "eye"}
              size={18}
              color="rgba(255,255,255,0.6)"
            />
          </TouchableOpacity>
        }
        onSubmitEditing={onSubmit}
      />

      {/* Role Selector */}
      <RoleSelector value={role} onChange={setRole} />

      {/* Register Button */}
      <TouchableOpacity
        disabled={!canSubmit || submitting}
        onPress={onSubmit}
        activeOpacity={0.8}
        style={[styles.registerButton, (!canSubmit || submitting) && styles.registerButtonDisabled]}
        accessibilityRole="button"
      >
        <LinearGradient
          colors={["#8b5cf6", "#7c3aed"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.registerButtonGradient}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.registerButtonText}>Crear cuenta</Text>
          )}
        </LinearGradient>
      </TouchableOpacity>

      {/* Login Link */}
      <View style={styles.loginContainer}>
        <Text style={styles.loginText}>¿Ya tienes una cuenta? </Text>
        <TouchableOpacity onPress={onGoLogin} accessibilityRole="button">
          <Text style={styles.loginLink}>Inicia sesión</Text>
        </TouchableOpacity>
      </View>

      {/* Terms */}
      <Text style={styles.termsText}>
        Al registrarte, aceptas nuestros Términos de Servicio y Política de Privacidad
      </Text>
    </View>
  );
});

/* =========================
   PANTALLA PRINCIPAL
========================= */
export default function RegisterScreen({ navigation }) {
  useEffect(() => runValidationTestsOnce(), []);

  const { login: authLogin } = useAuth();
  const { width } = useWindowDimensions();

  const [name, setName] = useState("");
  const [emailRaw, setEmailRaw] = useState("");
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showPwd2, setShowPwd2] = useState(false);
  const [role, setRole] = useState("CLIENT");
  const [submitting, setSubmitting] = useState(false);

  const emailRef = useRef(null);
  const pwdRef = useRef(null);
  const pwd2Ref = useRef(null);

  const nameTrim = String(name).trim();
  const email = String(emailRaw).trim().toLowerCase();

  const validName = nameTrim.length >= 2;
  const validEmail = validateEmail(email);

  const validPwd = useMemo(() => {
    const v = String(pwd);
    return v.length >= 8 && /[A-Za-z]/.test(v) && /[0-9]/.test(v);
  }, [pwd]);

  const matchPwd = pwd2 === pwd && pwd2.length > 0;

  const canSubmit = useMemo(
    () => validName && validEmail && validPwd && matchPwd && !submitting,
    [validName, validEmail, validPwd, matchPwd, submitting]
  );

  const isWeb = Platform.OS === "web";
  const isNarrow = isWeb && width < 1024;

  // Validaciones para mostrar errores
  const emailInvalid = !!email && !validEmail;
  const pwdInvalid = !!pwd && !validPwd;
  const pwd2Invalid = !!pwd2 && pwd2 !== pwd;

  const onSubmit = useCallback(async () => {
    if (!canSubmit) {
      Alert.alert("Registro", "Revisa los campos del formulario.");
      return;
    }
    try {
      setSubmitting(true);

      const res = await apiRegister(
        nameTrim,
        email,
        String(pwd),
        String(role).toUpperCase()
      );

      if (res?.token && res?.user) {
        if (typeof authLogin === "function") {
          await authLogin(res.token, res.user);
        }
        setAuthToken(res.token);
        navigation.replace("RoleRoot");
        return;
      }

      throw Object.assign(
        new Error(res?.message || "No se pudo crear la cuenta."),
        { status: res?.status }
      );
    } catch (e) {
      if (e?.status === 409) {
        Alert.alert("Error de registro", "Ese correo ya está registrado.");
        return;
      }
      if (e?.status === 429) {
        const wait = e?.retryAfterSeconds != null
          ? `${e.retryAfterSeconds} segundos`
          : "unos instantes";
        Alert.alert("Demasiadas solicitudes", `Intenta nuevamente en ${wait}.`);
        return;
      }
      if (e?.status === 400) {
        Alert.alert(
          "Error de registro",
          "Datos inválidos. La contraseña debe tener al menos 8 caracteres e incluir letras y números."
        );
        return;
      }
      Alert.alert(
        "Error de registro",
        e?.message || "No se pudo crear la cuenta. Inténtalo nuevamente."
      );
    } finally {
      setSubmitting(false);
    }
  }, [canSubmit, nameTrim, email, pwd, role, authLogin, navigation]);

  const onGoLogin = useCallback(() => {
    navigation.navigate("Login");
  }, [navigation]);

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
                    Conectando comunidades
                  </Text>
                </View>
                <Image
                  source={require("../assets/register-illustration.png")}
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
                    validations={{ emailInvalid, pwdInvalid, pwd2Invalid }}
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
                validations={{ emailInvalid, pwdInvalid, pwd2Invalid }}
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
    maxWidth: 480,
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

  inputContainerError: {
    borderColor: "#ef4444",
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

  helperText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
    marginTop: 6,
  },

  errorText: {
    fontSize: 12,
    color: "#ef4444",
    marginTop: 6,
  },

  // Password Strength
  strengthContainer: {
    marginTop: -12,
    marginBottom: 20,
  },

  strengthBars: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },

  strengthBar: {
    flex: 1,
    height: 4,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 2,
  },

  strengthLabel: {
    fontSize: 12,
    fontWeight: "600",
  },

  // Role Selector
  roleSelectorWrapper: {
    marginBottom: 24,
  },

  roleContainer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },

  roleCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.1)",
    padding: 20,
    alignItems: "center",
  },

  roleCardActive: {
    backgroundColor: "rgba(139,92,246,0.1)",
    borderColor: "#8b5cf6",
  },

  roleIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },

  roleIconContainerActive: {
    backgroundColor: "rgba(139,92,246,0.15)",
  },

  roleLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "rgba(255,255,255,0.7)",
    marginBottom: 4,
  },

  roleLabelActive: {
    color: "#fff",
  },

  roleDescription: {
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
    textAlign: "center",
  },

  // Register Button
  registerButton: {
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 24,
  },

  registerButtonDisabled: {
    opacity: 0.5,
  },

  registerButtonGradient: {
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

  registerButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },

  // Login Link
  loginContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },

  loginText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
  },

  loginLink: {
    color: "#8b5cf6",
    fontSize: 14,
    fontWeight: "700",
  },

  // Terms
  termsText: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
  },
});