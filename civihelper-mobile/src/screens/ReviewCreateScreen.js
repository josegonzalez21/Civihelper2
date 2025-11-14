/**
 * Pantalla de creación de reseñas para servicios
 * 
 * Permite a los usuarios calificar y comentar sobre servicios utilizados.
 * Incluye:
 * - Sistema de calificación por estrellas (1-5)
 * - Campo de comentario con validación
 * - Rate limiting para prevenir spam
 * - Diseño consistente con el resto de la app
 * 
 * @module screens/ReviewCreateScreen
 */

import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TextInput,
  Alert,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import PrimaryButton from "../components/common/PrimaryButton";
import { API_URL, getAuthToken } from "../services/api";
import { createShadow } from "../utils/shadowHelper";

// Tema unificado (coincide con Login/Admin)
import Colors, { spacing, radius } from "../theme/color";

/* =========================
   CONSTANTES
========================= */

const LOGIN_GRADIENT = Colors?.gradients?.login || ["#7C3AED", "#A855F7"];

const RATING_LIMITS = {
  MIN: 1,
  MAX: 5,
};

const COMMENT_MIN_LENGTH = 5;

const RATE_LIMIT = {
  MIN_WAIT: 5000, // 5 segundos
  MAX_WAIT: 300000, // 5 minutos
  DEFAULT_WAIT: 60000, // 1 minuto
};

/* =========================
   COMPONENTE PRINCIPAL
========================= */

/**
 * Pantalla de creación de reseñas
 * 
 * @param {Object} props
 * @param {Object} props.route - Objeto de ruta con parámetros
 * @param {string} props.route.params.id - ID del servicio a reseñar
 * @param {Object} props.navigation - Objeto de navegación de React Navigation
 */
export default function ReviewCreateScreen({ route, navigation }) {
  // Extrae el ID del servicio de los parámetros de ruta
  const serviceId = route?.params?.id || route?.params?.serviceId;

  // Estado del formulario
  const [rating, setRating] = useState(RATING_LIMITS.MAX);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  // Estado de rate limiting
  const [lockUntil, setLockUntil] = useState(0);
  const [countdown, setCountdown] = useState(null);
  const locked = useMemo(() => Date.now() < lockUntil, [lockUntil]);

  /**
   * Verifica que exista un ID de servicio válido
   * Si no existe, muestra alerta y redirige
   */
  useEffect(() => {
    if (!serviceId) {
      Alert.alert(
        "Falta información",
        "No se encontró el servicio para reseñar.",
        [
          {
            text: "OK",
            onPress: () => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.replace("Home");
              }
            },
          },
        ]
      );
    }
  }, [serviceId, navigation]);

  /**
   * Actualiza el countdown del bloqueo por rate limiting
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
   * Valida que el formulario esté completo y correcto
   */
  const isValid = useMemo(
    () =>
      rating >= RATING_LIMITS.MIN &&
      rating <= RATING_LIMITS.MAX &&
      comment.trim().length >= COMMENT_MIN_LENGTH,
    [rating, comment]
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
   * Envía la reseña al servidor
   */
  const handleSubmit = useCallback(async () => {
    if (!isValid || locked || !serviceId) return;

    try {
      setSaving(true);
      const token = getAuthToken?.();

      const response = await fetch(`${API_URL}/services/${serviceId}/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          rating,
          comment: comment.trim(),
        }),
      });

      // Manejo de rate limiting (429 Too Many Requests)
      if (response.status === 429) {
        const retryAfter = response.headers.get("retry-after");
        const wait = retryAfter
          ? parseInt(retryAfter, 10) * 1000
          : RATE_LIMIT.DEFAULT_WAIT;

        applyRateLimitLock(wait);
        Alert.alert(
          "Demasiadas solicitudes",
          `Por favor, intenta nuevamente en ${Math.ceil(wait / 1000)} segundos.`
        );
        return;
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.message || "No se pudo enviar la reseña");
      }

      Alert.alert("¡Gracias!", "Tu reseña fue publicada exitosamente.");
      navigation.replace("ServiceDetail", { id: serviceId });
    } catch (error) {
      console.error("[ReviewCreateScreen] Error enviando reseña:", error);
      Alert.alert(
        "Error",
        error?.message || "No se pudo publicar la reseña. Intenta nuevamente."
      );
    } finally {
      setSaving(false);
    }
  }, [isValid, locked, serviceId, rating, comment, applyRateLimitLock, navigation]);

  /**
   * Navega hacia atrás o al home si no hay historial
   */
  const handleGoBack = useCallback(() => {
    if (navigation?.canGoBack?.()) {
      navigation.goBack();
    } else {
      navigation.replace("Home");
    }
  }, [navigation]);

  /**
   * Calcula el texto del botón según el estado
   */
  const buttonText = useMemo(() => {
    if (locked) {
      const seconds = countdown ?? Math.ceil((lockUntil - Date.now()) / 1000);
      return `Bloqueado ${seconds}s`;
    }
    return "Publicar reseña";
  }, [locked, countdown, lockUntil]);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header con gradiente violeta */}
      <LinearGradient
        colors={LOGIN_GRADIENT}
        style={styles.hero}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.heroTop}>
          {/* Botón de retroceso */}
          <TouchableOpacity
            onPress={handleGoBack}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Volver"
          >
            <Feather name="arrow-left" size={20} color="#fff" />
          </TouchableOpacity>

          {/* Título */}
          <Text style={styles.title}>Escribir reseña</Text>

          {/* Indicador de carga o espaciador */}
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <View style={styles.spacer} />
          )}
        </View>

        <Text style={styles.subtitle}>Comparte tu experiencia</Text>
      </LinearGradient>

      {/* Contenido del formulario */}
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
            {/* Sección de calificación */}
            <Text style={styles.blockTitle}>Tu calificación</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((starValue) => (
                <StarButton
                  key={starValue}
                  value={starValue}
                  currentRating={rating}
                  onPress={setRating}
                />
              ))}
              <Text style={styles.scoreText}>{rating.toFixed(0)}</Text>
            </View>

            {/* Sección de comentario */}
            <Text style={[styles.blockTitle, styles.commentTitle]}>
              Comentario
            </Text>
            <TextInput
              style={styles.input}
              value={comment}
              onChangeText={setComment}
              placeholder="¿Qué te gustó y qué se puede mejorar?"
              placeholderTextColor={Colors.withOpacity?.(Colors.text, 0.45) || "#9CA3AF"}
              multiline
              textAlignVertical="top"
              maxLength={500}
              editable={!locked && !saving}
            />

            {/* Mensaje de error de validación */}
            {comment.length > 0 && comment.trim().length < COMMENT_MIN_LENGTH && (
              <Text style={styles.errorText}>
                Escribe al menos {COMMENT_MIN_LENGTH} caracteres.
              </Text>
            )}

            {/* Botón de envío */}
            <PrimaryButton
              onPress={handleSubmit}
              disabled={!isValid || locked}
              loading={saving}
              style={styles.submitButton}
            >
              {buttonText}
            </PrimaryButton>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* =========================
   COMPONENTE: BOTÓN DE ESTRELLA
========================= */

/**
 * Componente de estrella individual para calificación
 * 
 * @param {Object} props
 * @param {number} props.value - Valor de la estrella (1-5)
 * @param {number} props.currentRating - Calificación actual seleccionada
 * @param {Function} props.onPress - Callback al presionar la estrella
 */
const StarButton = React.memo(function StarButton({ value, currentRating, onPress }) {
  const isActive = value <= currentRating;
  const starColor = isActive ? (Colors.warn || "#F59E0B") : "#D1D5DB";

  const handlePress = useCallback(() => {
    onPress(value);
  }, [value, onPress]);

  return (
    <TouchableOpacity
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`Calificar ${value} ${value === 1 ? "estrella" : "estrellas"}`}
      accessibilityState={{ selected: isActive }}
      style={styles.starButton}
    >
      <Feather name="star" size={26} color={starColor} />
    </TouchableOpacity>
  );
});

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

  // Header
  hero: {
    paddingHorizontal: spacing(2),
    paddingTop: Platform.select({
      ios: 6,
      android: 10,
      default: 10,
    }),
    paddingBottom: spacing(2),
    borderBottomLeftRadius: radius(2.75),
    borderBottomRightRadius: radius(2.75),
    ...createShadow({
      elevation: 8,
      shadowColor: "#000",
      shadowOpacity: 0.3,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
    }),
  },

  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing(1),
  },

  backBtn: {
    width: 36,
    height: 36,
    borderRadius: radius(1.25),
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.45)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
  },

  title: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
  },

  spacer: {
    width: 20,
  },

  subtitle: {
    color: "rgba(255,255,255,0.92)",
    marginTop: spacing(0.5),
  },

  // Contenido
  scrollContent: {
    padding: spacing(2),
    gap: spacing(1.5),
    paddingBottom: spacing(3),
  },

  card: {
    backgroundColor: Colors.card || "#FFFFFF",
    borderRadius: radius(2),
    padding: spacing(1.75),
    borderWidth: 1,
    borderColor: Colors.border || "#E5E7EB",
    ...createShadow({
      elevation: 4,
      shadowColor: "#000",
      shadowOpacity: 0.25,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
    }),
  },

  blockTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: Colors.text || "#111827",
    marginBottom: spacing(0.75),
  },

  commentTitle: {
    marginTop: spacing(1.5),
  },

  // Calificación con estrellas
  starsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(1),
  },

  starButton: {
    padding: spacing(0.25),
  },

  scoreText: {
    marginLeft: spacing(0.75),
    color: Colors.sub || "#6B7280",
    fontWeight: "700",
  },

  // Campo de comentario
  input: {
    borderWidth: 1,
    borderColor: Colors.border || "#E5E7EB",
    borderRadius: radius(1.5),
    padding: spacing(1.25),
    backgroundColor: "#fff",
    color: Colors.text || "#111827",
    height: 120,
    fontSize: 14,
  },

  errorText: {
    color: Colors.danger || "#EF4444",
    marginTop: spacing(0.75),
    fontSize: 12,
  },

  submitButton: {
    marginTop: spacing(1.5),
  },
});