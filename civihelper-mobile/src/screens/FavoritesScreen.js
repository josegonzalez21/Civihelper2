// src/screens/FavoritesScreen.js
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import ServiceCard from "../components/common/ServiceCard";
import EmptyState from "../components/common/EmptyState";
import { API_URL, getAuthToken, API_BASE } from "../services/api";

const Colors = {
  primary:"#1E88E5",
  success:"#43A047",
  text:"#0F172A",
  sub:"#6B7280",
  border:"#E5E7EB",
  card:"#fff",
  danger:"#DC2626",
  bg:"#F5F7FB",
};

// ⚙️ Config
const PAGE_SIZE = 20;
const DEBOUNCE_MS = 300;
const MAX_Q_LEN = 120;
// Endpoint por defecto (ajústalo si tu API usa /me/favorites)
const FAVORITES_URL = `${API_URL}/favorites`;

export default function FavoritesScreen({ navigation }) {
  const [q, setQ] = useState("");
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Rate-limit lock (429)
  const [lockUntil, setLockUntil] = useState(0);
  const [countdown, setCountdown] = useState(null);

  const locked = Date.now() < lockUntil;
  const query = useMemo(() => String(q || "").trim().slice(0, MAX_Q_LEN), [q]);

  // Aviso HTTPS en prod
  useEffect(() => {
    const isProd = !__DEV__;
    if (isProd && typeof API_BASE === "string" && !API_BASE.startsWith("https://")) {
      console.warn("En producción, use siempre HTTPS. API_BASE:", API_BASE);
    }
  }, []);

  // Countdown visual
  useEffect(() => {
    if (!lockUntil) return;
    const id = setInterval(() => {
      const sec = Math.max(0, Math.ceil((lockUntil - Date.now()) / 1000));
      setCountdown(sec);
      if (sec <= 0) clearInterval(id);
    }, 500);
    return () => clearInterval(id);
  }, [lockUntil]);

  // Abort controller para cancelar el request activo
  const abortRef = useRef(null);
  const cleanupAbort = () => {
    try { abortRef.current?.abort?.(); } catch {}
    abortRef.current = null;
  };

  function applyRateLimitLock(ms) {
    const wait = Math.max(5_000, Math.min(ms, 5 * 60_000)); // 5s..5min
    setLockUntil(Date.now() + wait);
  }

  // --- Fetch core (reusable) ---
  const fetchPage = useCallback(async (pageNum, append = false) => {
    if (locked) return;

    // cancela request previo
    cleanupAbort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const params = new URLSearchParams({
      page: String(pageNum),
      pageSize: String(PAGE_SIZE),
      order: "desc",
      sort: "createdAt",
    });
    if (query.length >= 2) params.set("search", query);

    const url = `${FAVORITES_URL}?${params.toString()}`;

    const headers = { "Content-Type": "application/json" };
    const token = getAuthToken?.();
    if (token) headers.Authorization = `Bearer ${token}`;

    try {
      if (append) setLoadingMore(true);
      else setLoading(true);

      setErrorMsg("");

      const res = await fetch(url, { method: "GET", headers, signal: ctrl.signal });

      // 429 → bloquea usando Retry-After
      if (res.status === 429) {
        const ra = res.headers.get("retry-after");
        const wait = ra ? parseInt(ra, 10) * 1000 : 60_000;
        applyRateLimitLock(wait);
        setErrorMsg(`Demasiadas solicitudes. Intenta en ${Math.ceil(wait/1000)} s.`);
        if (!append) setItems([]);
        setHasMore(false);
        return;
      }

      const text = await res.text();
      let data = {};
      try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }

      if (!res.ok) {
        setErrorMsg(data?.message || "Error de red");
        if (!append) setItems([]);
        setHasMore(false);
        return;
      }

      // Soporta { items, total } o array simple
      const list = Array.isArray(data) ? data : data?.items || [];
      const total = Array.isArray(data) ? data.length : (Number(data?.total) || undefined);

      setItems((prev) => (append ? [...prev, ...list] : list));
      if (typeof total === "number") {
        const consumed = (append ? (items.length + list.length) : list.length);
        setHasMore(consumed < total);
      } else {
        setHasMore(list.length === PAGE_SIZE);
      }
      setPage(pageNum);
    } catch (e) {
      if (e?.name === "AbortError") return; // cancelado
      setErrorMsg("No se pudo cargar favoritos.");
      if (!append) setItems([]);
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      abortRef.current = null;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, locked, items.length]);

  // Debounce búsqueda (también carga inicial)
  const debounceRef = useRef(null);
  useEffect(() => {
    if (locked) {
      cleanupAbort();
      setErrorMsg(`Bloqueado temporalmente ${countdown ?? Math.ceil((lockUntil - Date.now())/1000)} s.`);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchPage(1, false);
    }, DEBOUNCE_MS);
    return () => clearTimeout(debounceRef.current);
  }, [query, locked, countdown, lockUntil, fetchPage]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await fetchPage(1, false); } finally { setRefreshing(false); }
  }, [fetchPage]);

  const loadMore = useCallback(async () => {
    if (loading || loadingMore || !hasMore || locked) return;
    await fetchPage(page + 1, true);
  }, [loading, loadingMore, hasMore, locked, page, fetchPage]);

  const clearQuery = () => {
    setQ("");
    // No vaciamos elementos: la lista completa se recargará por debounce fetchPage(1)
  };

  const renderItem = ({ item }) => (
    <ServiceCard item={item} onPress={(s) => navigation.navigate("ServiceDetail", { id: s.id })} />
  );

  // ===== Header con gradiente + botón atrás + buscador =====
  const ListHeader = () => (
    <LinearGradient
      colors={[Colors.primary, Colors.success]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.hero}
    >
      <View style={styles.heroTop}>
        <TouchableOpacity
          onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.replace("Home"))}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <Feather name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.title}>Tus favoritos</Text>

        {/* placeholder para equilibrar el layout */}
        <View style={styles.backBtn} />
      </View>

      {/* Buscador en card blanca sobre el gradiente */}
      <View style={styles.searchBar} accessibilityRole="search">
        <Feather name="search" size={18} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          placeholder="Filtrar por nombre o categoría…"
          placeholderTextColor="#9CA3AF"
          value={q}
          onChangeText={(t) => setQ(String(t).slice(0, MAX_Q_LEN))}
          returnKeyType="search"
          onSubmitEditing={() => fetchPage(1, false)}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {!!q && (
          <TouchableOpacity onPress={clearQuery} accessibilityLabel="Limpiar búsqueda" style={styles.clearBtn}>
            <Feather name="x" size={18} color="#6B7280" />
          </TouchableOpacity>
        )}
      </View>
    </LinearGradient>
  );

  const ListFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={{ paddingVertical: 12, alignItems: "center" }}>
        <ActivityIndicator />
      </View>
    );
  };

  const ListEmpty = () => {
    if (locked) {
      return (
        <EmptyState
          title="Bloqueado temporalmente"
          subtitle={`Intenta en ${countdown ?? Math.ceil((lockUntil - Date.now())/1000)} segundos`}
          style={{ paddingHorizontal: 16 }}
        />
      );
    }
    if (loading) {
      return (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={{ marginTop: 8, color: Colors.sub }}>Cargando favoritos…</Text>
        </View>
      );
    }
    if (errorMsg) {
      return (
        <EmptyState
          title="Sin resultados"
          subtitle={errorMsg}
          style={{ paddingHorizontal:16 }}
        />
      );
    }
    return (
      <EmptyState
        title="Aún no tienes favoritos"
        subtitle="Toca el ícono de favorito en un servicio para guardarlo aquí."
        style={{ paddingHorizontal:16 }}
      />
    );
  };

  return (
    <SafeAreaView style={{ flex:1, backgroundColor: Colors.bg }}>
      <FlatList
        data={items}
        keyExtractor={(it) => String(it.id)}
        renderItem={renderItem}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        ListFooterComponent={ListFooter}
        stickyHeaderIndices={[0]}          // Header pegajoso
        contentContainerStyle={{ padding: 16, paddingTop: 0, gap: 10 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onEndReachedThreshold={0.4}
        onEndReached={loadMore}
        keyboardShouldPersistTaps="handled"
        removeClippedSubviews={Platform.OS === "android"}
        accessibilityLabel="Listado de favoritos"
      />
    </SafeAreaView>
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
    marginBottom: 12,
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
  title: { color: "#fff", fontSize: 18, fontWeight: "800" },

  searchBar: {
    marginTop: 6,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    height: 46,
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    // Sombra suave
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  searchInput: { flex:1, color:"#111827" },
  clearBtn: {
    width: 28, height: 28, alignItems: "center", justifyContent: "center",
    borderRadius: 999, backgroundColor: "#F3F4F6",
  },

  center: { flex:1, alignItems:"center", justifyContent:"center", paddingTop: 40 },
});
