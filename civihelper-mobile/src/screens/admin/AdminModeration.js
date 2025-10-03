// src/screens/admin/AdminModeration.js
import React, { useCallback, useEffect, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

import Colors, { spacing, radius, shadows } from "../../theme/color";
import RoleGuard from "../../components/RoleGuard";
// (Opcional) si tienes cliente de API, descomenta y ajusta endpoint
// import { api } from "../../services/api";

/* =========================
   Header (atrás seguro + CTA)
========================= */
function Header() {
  const navigation = useNavigation();
  const showBack = navigation?.canGoBack?.() === true;
  const safeBack = () => {
    if (navigation?.canGoBack?.()) navigation.goBack();
    else navigation.navigate("AdminHome");
  };

  return (
    <LinearGradient
      colors={Colors.gradients?.hero || [Colors.primary, "#111827"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={s.header}
    >
      <View style={s.headerTopRow}>
        {showBack ? (
          <TouchableOpacity
            onPress={safeBack}
            style={s.backBtn}
            accessibilityLabel="Volver"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="arrow-left" size={20} color="#fff" />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={s.headerContent}>
        <Text style={s.kicker}>Panel admin</Text>
        <Text style={s.title}>Moderación</Text>
        <Text style={s.sub}>
          Revisa reportes de usuarios y servicios. Toma acciones rápidas cuando sea necesario.
        </Text>

        <View style={{ flexDirection: "row", gap: 10, marginTop: spacing.md }}>
          <TouchableOpacity
            onPress={() => navigation.navigate("AdminUsers")}
            style={[s.btn, s.btnLight]}
            accessibilityLabel="Ir a Usuarios"
          >
            <Feather name="users" size={16} color={Colors.text} />
            <Text style={s.btnLightTxt}>Usuarios</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate("AdminServices")}
            style={[s.btn, s.btnLight]}
            accessibilityLabel="Ir a Servicios"
          >
            <Feather name="briefcase" size={16} color={Colors.text} />
            <Text style={s.btnLightTxt}>Servicios</Text>
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
}

/* =========================
   Item de reporte (placeholder)
========================= */
function ReportRow({ item, onReview, onBlock, onDismiss }) {
  return (
    <View style={s.card}>
      <View style={s.rowHeader}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
          <View style={s.badgeType}>
            <Text style={s.badgeTypeTxt}>{item.type === "USER" ? "Usuario" : "Servicio"}</Text>
          </View>
          <Text style={s.titleRow} numberOfLines={1}>
            {item.title}
          </Text>
        </View>
        <Text style={s.muted}>{item.date}</Text>
      </View>

      <Text style={s.reason} numberOfLines={2}>
        {item.reason}
      </Text>

      <View style={s.actionsRow}>
        <TouchableOpacity onPress={() => onReview(item)} style={[s.aBtn, s.aBtnGhost]}>
          <Feather name="eye" size={16} color={Colors.text} />
          <Text style={s.aBtnGhostTxt}>Revisar</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onDismiss(item)} style={[s.aBtn, s.aBtnGhost]}>
          <Feather name="check" size={16} color={Colors.text} />
          <Text style={s.aBtnGhostTxt}>Resolver</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onBlock(item)} style={[s.aBtn, s.aBtnDanger]}>
          <Feather name="slash" size={16} color="#fff" />
          <Text style={s.aBtnDangerTxt}>Bloquear</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* =========================
   Pantalla principal
========================= */
export default function AdminModeration() {
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState([]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      // Conecta tu endpoint real aquí:
      // const { data } = await api.get("/admin/moderation/reports?limit=20");
      // setReports(Array.isArray(data) ? data : []);

      // Placeholder demo
      setReports([
        {
          id: "r1",
          type: "SERVICE",
          title: "Servicio: Limpieza de alfombras",
          reason: "Contenido engañoso / precio distinto al publicado.",
          date: "hoy",
        },
        {
          id: "r2",
          type: "USER",
          title: "Usuario: juan.perez",
          reason: "Conducta inapropiada en mensajes.",
          date: "ayer",
        },
      ]);
    } catch (e) {
      Alert.alert("Error", "No se pudo cargar la cola de moderación.");
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onReview = (item) => {
    // Navega a lo que tengas: detalle de servicio/usuario
    // Heurística simple:
    if (item.type === "SERVICE") {
      // Si tienes id de servicio real, pásalo en params
      Alert.alert("Revisar", "Ir a Servicios → buscar y revisar ficha.");
    } else {
      Alert.alert("Revisar", "Ir a Usuarios → buscar y revisar perfil.");
    }
  };

  const onBlock = (item) => {
    Alert.alert(
      "Confirmar bloqueo",
      `¿Bloquear ${item.type === "SERVICE" ? "servicio" : "usuario"}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Bloquear",
          style: "destructive",
          onPress: async () => {
            // Llama a tu endpoint de bloqueo aquí
            // await api.post("/admin/moderation/block", { id: item.id, type: item.type })
            Alert.alert("OK", "Bloqueado (placeholder).");
          },
        },
      ]
    );
  };

  const onDismiss = (item) => {
    Alert.alert(
      "Marcar como resuelto",
      `¿Marcar el reporte como resuelto?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Resolver",
          onPress: async () => {
            // Llama a tu endpoint de resolver aquí
            // await api.post("/admin/moderation/resolve", { id: item.id })
            setReports((prev) => prev.filter((r) => r.id !== item.id));
          },
        },
      ]
    );
  };

  return (
    <RoleGuard allow={["ADMIN"]}>
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }}>
        <Header />

        {loading ? (
          <View style={s.loadingBox}>
            <ActivityIndicator />
            <Text style={s.muted}>Cargando reportes…</Text>
          </View>
        ) : (
          <FlatList
            data={reports}
            keyExtractor={(x) => String(x.id)}
            contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl }}
            ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
            renderItem={({ item }) => (
              <ReportRow item={item} onReview={onReview} onBlock={onBlock} onDismiss={onDismiss} />
            )}
            ListEmptyComponent={
              <View style={s.empty}>
                <Text style={s.muted}>No hay reportes pendientes 🎉</Text>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </RoleGuard>
  );
}

/* =========================
   Estilos
========================= */
const s = StyleSheet.create({
  header: {
    padding: spacing.lg,
    paddingTop: Platform.select({ ios: 10, android: 16 }),
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
    marginBottom: spacing.sm,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  headerContent: { flexDirection: "column", gap: spacing.sm },
  kicker: { color: "#DBEAFE", fontSize: 11, letterSpacing: 1 },
  title: { color: "#fff", fontSize: 22, fontWeight: "800" },
  sub: { color: "rgba(255,255,255,0.92)", marginTop: 2 },

  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  btnLight: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: Colors.border,
    ...shadows.xs,
  },
  btnLightTxt: { color: Colors.text, fontWeight: "800" },

  loadingBox: { padding: spacing.lg, alignItems: "center", gap: 8 },

  card: {
    backgroundColor: Colors.card,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...shadows.md,
  },
  rowHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 6,
  },
  titleRow: { fontSize: 15, fontWeight: "800", color: Colors.text, flexShrink: 1 },
  reason: { color: Colors.text, marginTop: 4 },
  muted: { color: Colors.sub },

  badgeType: {
    backgroundColor: "#EEF2FF",
    borderColor: "#E0E7FF",
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeTypeTxt: { color: Colors.primary, fontWeight: "800", fontSize: 11 },

  actionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: spacing.sm,
  },
  aBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  aBtnGhost: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  aBtnGhostTxt: { color: Colors.text, fontWeight: "700" },
  aBtnDanger: { backgroundColor: "#B91C1C" },
  aBtnDangerTxt: { color: "#fff", fontWeight: "800" },
});
