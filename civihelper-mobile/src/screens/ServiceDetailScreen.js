// src/screens/ServiceDetailScreen.js
import React, { useCallback, useEffect, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import RatingStars from "../components/common/RatingStars";
import PrimaryButton from "../components/common/PrimaryButton";
import { API_URL } from "../services/api";
import { useAuth } from "../context/AuthContext";

// ✅ Usa tu tema unificado (con helpers)
import Colors from "../theme/color";

// Gradiente del CTA (login)
const LOGIN_GRADIENT = ["#7C3AED", "#A855F7"];

export default function ServiceDetailScreen({ route, navigation }) {
  const { id } = route.params || {};
  const { user } = useAuth();

  const [svc, setSvc] = useState(null);
  const [loading, setLoading] = useState(true);

  const goBack = () => {
    if (navigation?.canGoBack?.()) navigation.goBack();
    else navigation.replace("Home");
  };

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/services/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "No se pudo cargar el servicio");
      setSvc(data);
    } catch (e) {
      Alert.alert("Error", e?.message || "No se pudo cargar el servicio.", [{ text: "OK", onPress: goBack }]);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { if (id) load(); }, [id, load]);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }}>
        <LinearGradient
          colors={LOGIN_GRADIENT}
          style={[styles.hero, { paddingBottom: 20 }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.heroTop}>
            <TouchableOpacity onPress={goBack} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Volver">
              <Feather name="arrow-left" size={20} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.title}>Cargando…</Text>
            <View style={{ width: 36 }} />
          </View>
        </LinearGradient>

        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={Colors.primary} />
          <Text style={{ color: Colors.sub, marginTop: 8 }}>Cargando servicio…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!svc) return null;

  const canReview = user?.role === "CLIENT" && user?.id !== svc?.userId;

  const contact = () => {
    Alert.alert("Contacto", "Pronto podrás contactar al proveedor desde aquí.");
  };

  const priceText =
    svc?.priceFrom != null && !Number.isNaN(Number(svc.priceFrom))
      ? `Desde $${Number(svc.priceFrom).toLocaleString()}`
      : "Precio a convenir";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }}>
      {/* Header con gradiente violeta y botón volver */}
      <LinearGradient colors={LOGIN_GRADIENT} style={styles.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={styles.heroTop}>
          <TouchableOpacity onPress={goBack} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Volver">
            <Feather name="arrow-left" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1}>{svc.title}</Text>
          <View style={{ width: 36 }} />
        </View>

        <View style={styles.heroMetaRow}>
          <RatingStars rating={Number(svc?.ratingAvg ?? 0)} showValue />
          <Text style={styles.heroMetaText}>
            {svc?._count?.reviews ? `(${svc._count.reviews} reseñas)` : "Sin reseñas"}
          </Text>
        </View>

        <View style={styles.chipsRow}>
          {svc.city ? (
            <View style={styles.chip}>
              <Feather name="map-pin" size={12} color="#fff" />
              <Text style={styles.chipText}>{svc.city}</Text>
            </View>
          ) : null}
          <View style={styles.chip}>
            <Feather name="tag" size={12} color="#fff" />
            <Text style={styles.chipText}>{priceText}</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Descripción (glass) */}
        <View style={styles.card}>
          <Text style={styles.blockTitle}>Descripción</Text>
          <Text style={styles.desc}>{svc.description}</Text>
        </View>

        {/* Reseñas (glass) */}
        <View style={styles.card}>
          <Text style={styles.blockTitle}>Reseñas recientes</Text>
          {Array.isArray(svc?.reviews) && svc.reviews.length ? (
            svc.reviews.map((r) => (
              <View key={r.id} style={styles.reviewRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.revUser}>{r?.user?.name || "Usuario"}</Text>
                  <Text style={styles.revText}>{r.comment || "Sin comentario"}</Text>
                </View>
                <RatingStars rating={Number(r.rating) || 0} />
              </View>
            ))
          ) : (
            <Text style={{ color: Colors.sub }}>Aún no hay reseñas.</Text>
          )}

          {canReview ? (
            <PrimaryButton onPress={() => navigation.navigate("ReviewCreate", { id })} style={{ marginTop: 10 }} small>
              Escribir reseña
            </PrimaryButton>
          ) : null}
        </View>

        {/* CTA contacto */}
        <PrimaryButton onPress={contact}>Contactar proveedor</PrimaryButton>
      </ScrollView>
    </SafeAreaView>
  );
}

const GLASS_BG = Colors.withOpacity(Colors.palette.white, 0.05);
const GLASS_BORDER = Colors.withOpacity(Colors.palette.white, 0.10);

const styles = StyleSheet.create({
  hero: {
    paddingHorizontal: 16,
    paddingTop: Platform.select({ ios: 6, android: 10, default: 10 }),
    paddingBottom: 16,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
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
  title: { color: "#fff", fontSize: 20, fontWeight: "800", flex: 1 },

  heroMetaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 },
  heroMetaText: { color: "rgba(255,255,255,0.9)" },

  chipsRow: { flexDirection: "row", gap: 8, marginTop: 8, flexWrap: "wrap" },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: Colors.withOpacity("#000", 0.18),
    borderWidth: 1,
    borderColor: Colors.withOpacity("#fff", 0.15),
  },
  chipText: { color: "#fff", fontWeight: "700", fontSize: 12 },

  // --- Card glass ---
  card: {
    backgroundColor: GLASS_BG,
    borderRadius: 16,
    padding: 14,
    borderWidth: Platform.OS === "web" ? 1 : StyleSheet.hairlineWidth,
    borderColor: GLASS_BORDER,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.22, shadowRadius: 12, shadowOffset: { width: 0, height: 8 } },
      android: { elevation: 3 },
      web: { backdropFilter: "blur(12px) saturate(120%)" },
    }),
  },
  blockTitle: { fontSize: 16, fontWeight: "800", color: Colors.text, marginBottom: 6 },
  desc: { color: Colors.sub, lineHeight: 20 },

  reviewRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  revUser: { fontWeight: "700", color: Colors.text },
  revText: { marginTop: 2, color: Colors.sub },
});
