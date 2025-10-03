// src/screens/ReviewCreateScreen.js
import React, { useEffect, useMemo, useState } from "react";
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

// ✅ Tema unificado (coincide con Login/Admin)
import Colors, { spacing, radius, shadows } from "../theme/color";

const LOGIN_GRADIENT = Colors?.gradients?.login || ["#7C3AED", "#A855F7"];

export default function ReviewCreateScreen({ route, navigation }) {
  const serviceId = route?.params?.id || route?.params?.serviceId;

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  // rate-limit local
  const [lockUntil, setLockUntil] = useState(0);
  const [countdown, setCountdown] = useState(null);
  const locked = Date.now() < lockUntil;

  useEffect(() => {
    if (!serviceId) {
      Alert.alert("Falta información", "No se encontró el servicio para reseñar.", [
        { text: "OK", onPress: () => (navigation.canGoBack() ? navigation.goBack() : navigation.replace("Home")) },
      ]);
    }
  }, [serviceId, navigation]);

  useEffect(() => {
    if (!lockUntil) return;
    const id = setInterval(() => {
      const sec = Math.max(0, Math.ceil((lockUntil - Date.now()) / 1000));
      setCountdown(sec);
      if (sec <= 0) clearInterval(id);
    }, 500);
    return () => clearInterval(id);
  }, [lockUntil]);

  const valid = useMemo(() => rating >= 1 && rating <= 5 && comment.trim().length >= 5, [rating, comment]);

  const applyRateLimitLock = (ms) => {
    const wait = Math.max(5_000, Math.min(ms, 5 * 60_000)); // 5s..5min
    setLockUntil(Date.now() + wait);
  };

  const send = async () => {
    if (!valid || locked || !serviceId) return;
    try {
      setSaving(true);
      const token = getAuthToken?.();
      const res = await fetch(`${API_URL}/services/${serviceId}/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ rating, comment: comment.trim() }),
      });

      // Manejo 429
      if (res.status === 429) {
        const ra = res.headers.get("retry-after");
        const wait = ra ? parseInt(ra, 10) * 1000 : 60_000;
        applyRateLimitLock(wait);
        Alert.alert("Demasiadas solicitudes", `Intenta nuevamente en ${Math.ceil(wait / 1000)} segundos.`);
        return;
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "No se pudo enviar la reseña");

      Alert.alert("¡Gracias!", "Tu reseña fue publicada.");
      navigation.replace("ServiceDetail", { id: serviceId });
    } catch (e) {
      Alert.alert("Error", e?.message || "No se pudo publicar la reseña");
    } finally {
      setSaving(false);
    }
  };

  const Star = ({ i }) => (
    <TouchableOpacity
      onPress={() => setRating(i)}
      accessibilityRole="button"
      accessibilityLabel={`Calificar ${i} ${i === 1 ? "estrella" : "estrellas"}`}
      style={{ padding: spacing(0.25) }}
    >
      <Feather
        name="star"
        size={26}
        color={i <= rating ? (Colors.warn || "#F59E0B") : "#D1D5DB"}
      />
    </TouchableOpacity>
  );

  const goBack = () => {
    if (navigation?.canGoBack?.()) navigation.goBack();
    else navigation.replace("Home");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }}>
      {/* Header con gradiente violeta (igual a login) */}
      <LinearGradient colors={LOGIN_GRADIENT} style={s.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={s.heroTop}>
          <TouchableOpacity
            onPress={goBack}
            style={s.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Volver"
          >
            <Feather name="arrow-left" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={s.title}>Escribir reseña</Text>
          {saving ? <ActivityIndicator color="#fff" /> : <View style={{ width: 20 }} />}
        </View>
        <Text style={s.sub}>Comparte tu experiencia</Text>
      </LinearGradient>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ padding: spacing(2), gap: spacing(1.5), paddingBottom: spacing(3) }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={s.card}>
            <Text style={s.blockTitle}>Tu calificación</Text>
            <View style={s.starsRow}>
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} i={i} />
              ))}
              <Text style={s.score}>{rating.toFixed(0)}</Text>
            </View>

            <Text style={[s.blockTitle, { marginTop: spacing(1.5) }]}>Comentario</Text>
            <TextInput
              style={[s.input, { height: 120, textAlignVertical: "top" }]}
              value={comment}
              onChangeText={setComment}
              placeholder="¿Qué te gustó y qué se puede mejorar?"
              placeholderTextColor={Colors.withOpacity(Colors.text, 0.45)}
              multiline
            />
            {comment.length > 0 && comment.trim().length < 5 && (
              <Text style={s.err}>Escribe al menos 5 caracteres.</Text>
            )}

            <PrimaryButton onPress={send} disabled={!valid || locked} loading={saving} style={{ marginTop: spacing(1.5) }}>
              {locked ? `Bloqueado ${countdown ?? Math.ceil((lockUntil - Date.now()) / 1000)}s` : "Publicar reseña"}
            </PrimaryButton>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  hero: {
    paddingHorizontal: spacing(2),
    paddingTop: Platform.select({ ios: 6, android: 10, default: 10 }),
    paddingBottom: spacing(2),
    borderBottomLeftRadius: radius(2.75),
    borderBottomRightRadius: radius(2.75),
    ...shadows.lg,
  },
  heroTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing(1) },
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
  title: { color: "#fff", fontSize: 20, fontWeight: "800" },
  sub: { color: "rgba(255,255,255,0.92)", marginTop: spacing(0.5) },

  card: {
    backgroundColor: Colors.card,
    borderRadius: radius(2),
    padding: spacing(1.75),
    borderWidth: 1,
    borderColor: Colors.border,
    ...shadows.md,
  },
  blockTitle: { fontSize: 14, fontWeight: "800", color: Colors.text, marginBottom: spacing(0.75) },

  starsRow: { flexDirection: "row", alignItems: "center", gap: spacing(1) },
  score: { marginLeft: spacing(0.75), color: Colors.sub, fontWeight: "700" },

  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: radius(1.5),
    padding: spacing(1.25),
    backgroundColor: "#fff",
    color: Colors.text,
  },
  err: { color: Colors.danger, marginTop: spacing(0.75), fontSize: 12 },
});
