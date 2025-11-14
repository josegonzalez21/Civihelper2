// src/screens/MyServicesScreen.js
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { API_URL, getAuthToken } from "../services/api";
import ServiceCard from "../components/common/ServiceCard";
import EmptyState from "../components/common/EmptyState";
import RoleGuard from "../components/RoleGuard";

// Paleta local (puedes reemplazar por tu theme global si prefieres)
const Colors = {
  primary: "#1E88E5",
  success: "#43A047",
  text: "#0F172A",
  sub: "#6B7280",
  border: "#E5E7EB",
  card: "#fff",
  bg: "#F5F7FB",
};

// ===== Helper de sombras moderno (sin shadow* deprecado) =====
const iosShadowMap = {
  xs: "0px 1px 2px rgba(0,0,0,0.12)",
  sm: "0px 2px 6px rgba(0,0,0,0.14)",
  md: "0px 4px 12px rgba(0,0,0,0.16)",
  lg: "0px 8px 24px rgba(0,0,0,0.18)",
};
const makeShadow = (level = "sm") =>
  Platform.OS === "android"
    ? { elevation: level === "xs" ? 1 : level === "sm" ? 3 : level === "md" ? 5 : 8 }
    : { boxShadow: iosShadowMap[level] || iosShadowMap.sm };

export default function MyServicesScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const uid = user?.id;

  const [items, setItems] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // Rate-limit lock (429)
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

  const applyRateLimitLock = (ms) => {
    const wait = Math.max(5_000, Math.min(ms, 5 * 60_000));
    setLockUntil(Date.now() + wait);
  };

  const safeBack = () => {
    if (navigation?.canGoBack?.()) navigation.goBack();
    else navigation.navigate("ProviderHome"); // tab raíz del proveedor
  };

  const url = useMemo(() => {
    const params = new URLSearchParams({
      page: "1",
      pageSize: "50",
      order: "desc",
      sort: "createdAt",
    });
    if (uid) params.set("userId", uid); // o params.set("mine", "1") si tu backend lo soporta
    return `${API_URL}/services?${params.toString()}`;
  }, [uid]);

  const load = useCallback(async () => {
    if (!uid) {
      setItems([]);
      setErrorMsg("No hay usuario autenticado.");
      setLoading(false);
      return;
    }
    if (locked) return;

    try {
      setLoading(true);
      setErrorMsg("");

      const token = getAuthToken?.();
      const res = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      // Manejo 429 con Retry-After
      if (res.status === 429) {
        const ra = res.headers.get("retry-after");
        const wait = ra ? parseInt(ra, 10) * 1000 : 60_000;
        applyRateLimitLock(wait);
        setItems([]);
        setErrorMsg(`Demasiadas solicitudes. Intenta en ${Math.ceil(wait / 1000)} s.`);
        setLoading(false);
        return;
      }

      const text = await res.text();
      let data = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { raw: text };
      }

      if (!res.ok) {
        setItems([]);
        setErrorMsg(data?.message || "No se pudo cargar tus servicios.");
        return;
      }

      const list = Array.isArray(data) ? data : data?.items || [];
      setItems(list);
    } catch (_e) {
      setItems([]);
      setErrorMsg("No se pudo cargar tus servicios.");
    } finally {
      setLoading(false);
    }
  }, [url, uid, locked]);

  useEffect(() => { load(); }, [load]);

  useFocusEffect(
    useCallback(() => {
      // refresca al volver a enfocar (por ejemplo, tras crear/editar)
      load();
    }, [load])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await load(); } finally { setRefreshing(false); }
  }, [load]);

  const header = (
    <LinearGradient
      colors={[Colors.primary, Colors.success]}
      style={styles.hero}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.heroTop}>
        <TouchableOpacity
          onPress={safeBack}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <Feather name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Mis servicios</Text>
        <View style={{ width: 36 }} />
      </View>
      <Text style={styles.sub}>Crea, edita y administra tus publicaciones</Text>
    </LinearGradient>
  );

  const renderItem = ({ item }) => (
    <ServiceCard
      item={item}
      onPress={(s) => navigation.navigate("ServiceDetail", { id: s.id })}
      trailing={(s) => (
        <TouchableOpacity
          onPress={() => navigation.navigate("ServiceEdit", { id: s.id })}
          style={styles.rowBtn}
          accessibilityLabel="Editar servicio"
        >
          <Feather name="edit-2" size={16} color={Colors.primary} />
          <Text style={styles.rowBtnText}>Editar</Text>
        </TouchableOpacity>
      )}
    />
  );

  const ListEmpty = () => {
    if (locked) {
      return (
        <EmptyState
          title="Bloqueado temporalmente"
          subtitle={`Intenta en ${countdown ?? Math.ceil((lockUntil - Date.now()) / 1000)} segundos`}
          style={{ paddingHorizontal: 16 }}
        />
      );
    }
    if (loading) {
      return (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={{ marginTop: 8, color: Colors.sub }}>Cargando…</Text>
        </View>
      );
    }
    if (errorMsg) {
      return (
        <EmptyState
          title="No fue posible cargar"
          subtitle={errorMsg}
          actionLabel="Reintentar"
          onAction={load}
          style={{ paddingHorizontal: 16 }}
        />
      );
    }
    return (
      <EmptyState
        title="Aún no publicas servicios"
        subtitle="¡Crea tu primer servicio y empieza a recibir clientes!"
        actionLabel="Crear servicio"
        onAction={() => navigation.navigate("ServiceCreate")}
        style={{ paddingHorizontal: 16 }}
      />
    );
  };

  return (
    <RoleGuard allow={["PROVIDER"]}>
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }}>
        {header}

        <FlatList
          data={items}
          keyExtractor={(it) => String(it.id)}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 90 }}
          ListEmptyComponent={ListEmpty}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          keyboardShouldPersistTaps="handled"
          removeClippedSubviews={Platform.OS === "android"}
          accessibilityLabel="Listado de mis servicios"
        />

        {/* FAB crear servicio */}
        <TouchableOpacity
          onPress={() => navigation.navigate("ServiceCreate")}
          style={styles.fab}
          accessibilityLabel="Crear servicio"
        >
          <Feather name="plus" size={22} color="#fff" />
        </TouchableOpacity>
      </SafeAreaView>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingHorizontal: 16,
    paddingTop: Platform.select({ ios: 6, android: 10, default: 10 }),
    paddingBottom: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  title: { color: "#fff", fontSize: 20, fontWeight: "800" },
  sub: { color: "rgba(255,255,255,0.9)" },

  rowBtn: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 },
  rowBtnText: { color: Colors.primary, fontWeight: "700" },

  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 40 },

  fab: {
    position: "absolute",
    right: 24,
    bottom: 24,
    width: 56,
    height: 56,
    backgroundColor: Colors.success,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    ...makeShadow("md"),
  },
});
