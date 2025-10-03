// src/screens/SearchScreen.js
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

// ✅ Tema unificado (mismo del Login/Admin)
import Colors, { spacing, radius, shadows } from "../theme/color";

const LOGIN_GRADIENT = Colors?.gradients?.login || ["#7C3AED", "#A855F7"];

const PAGE_SIZE = 20;
const DEBOUNCE_MS = 300;
const MAX_Q_LEN = 120;

export default function SearchScreen({ navigation }) {
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

  const canSearch = useMemo(() => q.trim().length >= 2, [q]);
  const locked = Date.now() < lockUntil;

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

    const query = String(q || "").trim().slice(0, MAX_Q_LEN);
    if (query.length < 2) {
      setItems([]);
      setHasMore(false);
      setErrorMsg("");
      return;
    }

    // cancela request previo
    cleanupAbort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const url = `${API_URL}/services?search=${encodeURIComponent(query)}&page=${pageNum}&pageSize=${PAGE_SIZE}&order=desc&sort=createdAt`;

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
        setItems((prev) => (append ? prev : []));
        setHasMore(false);
        return;
      }

      const text = await res.text();
      let data = {};
      try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }

      if (!res.ok) {
        setErrorMsg(data?.message || "Error de red");
        setItems((prev) => (append ? prev : []));
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
      if (e?.name === "AbortError") return; // cancelado: no mostrar error
      setErrorMsg("No se pudo cargar resultados.");
      if (!append) setItems([]);
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      abortRef.current = null;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, locked, items.length]);

  // Debounce
  const debounceRef = useRef(null);
  useEffect(() => {
    if (!canSearch || locked) {
      cleanupAbort();
      setItems([]);
      setHasMore(false);
      setErrorMsg(locked ? `Bloqueado temporalmente ${countdown ?? Math.ceil((lockUntil - Date.now())/1000)} s.` : "");
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchPage(1, false);
    }, DEBOUNCE_MS);
    return () => clearTimeout(debounceRef.current);
  }, [q, canSearch, locked, countdown, lockUntil, fetchPage]);

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
    setItems([]);
    setHasMore(false);
    setErrorMsg("");
  };

  const renderItem = ({ item }) => (
    <ServiceCard item={item} onPress={(s) => navigation.navigate("ServiceDetail", { id: s.id })} />
  );

  // ===== Header con gradiente + botón atrás + buscador =====
  const ListHeader = () => (
    <LinearGradient
      colors={LOGIN_GRADIENT}
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
        <Text style={styles.title}>Buscar</Text>
        <View style={styles.backBtn} />
      </View>

      {/* Buscador en card (coherente con el tema) */}
      <View style={styles.searchBar} accessibilityRole="search">
        <Feather name="search" size={18} color={Colors.withOpacity(Colors.text, 0.45)} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar servicios o categorías…"
          placeholderTextColor={Colors.withOpacity(Colors.text, 0.45)}
          value={q}
          onChangeText={(t) => setQ(String(t).slice(0, MAX_Q_LEN))}
          returnKeyType="search"
          onSubmitEditing={() => fetchPage(1, false)}
          autoFocus
          autoCapitalize="none"
          autoCorrect={false}
        />
        {!!q && (
          <TouchableOpacity onPress={clearQuery} accessibilityLabel="Limpiar búsqueda" style={styles.clearBtn}>
            <Feather name="x" size={18} color={Colors.sub} />
          </TouchableOpacity>
        )}
      </View>
    </LinearGradient>
  );

  const ListFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={{ paddingVertical: spacing(1.25), alignItems: "center" }}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  };

  const ListEmpty = () => {
    if (locked) {
      return (
        <EmptyState
          title="Bloqueado temporalmente"
          subtitle={`Intenta en ${countdown ?? Math.ceil((lockUntil - Date.now())/1000)} segundos`}
          style={{ paddingHorizontal: spacing(2) }}
        />
      );
    }
    if (loading) {
      return (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} />
          <Text style={{ marginTop: spacing(0.75), color: Colors.sub }}>Buscando…</Text>
        </View>
      );
    }
    if (!canSearch) {
      return (
        <EmptyState
          title="Empieza a buscar"
          subtitle="Escribe al menos 2 caracteres"
          style={{ paddingHorizontal: spacing(2) }}
        />
      );
    }
    if (errorMsg) {
      return (
        <EmptyState
          title="Sin resultados"
          subtitle={errorMsg || "No encontramos coincidencias"}
          style={{ paddingHorizontal: spacing(2) }}
        />
      );
    }
    return (
      <EmptyState
        title="Sin resultados"
        subtitle="No encontramos coincidencias"
        style={{ paddingHorizontal: spacing(2) }}
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
        stickyHeaderIndices={[0]} // Header pegajoso
        contentContainerStyle={{ padding: spacing(2), paddingTop: 0, gap: spacing(1) }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onEndReachedThreshold={0.4}
        onEndReached={loadMore}
        keyboardShouldPersistTaps="handled"
        removeClippedSubviews={Platform.OS === "android"}
        accessibilityLabel="Resultados de búsqueda"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingHorizontal: spacing(2),
    paddingTop: Platform.select({ ios: 6, android: 10, default: 10 }),
    paddingBottom: spacing(2),
    borderBottomLeftRadius: radius(2.5),
    borderBottomRightRadius: radius(2.5),
    ...shadows.lg,
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
  title: { color: "#fff", fontSize: 18, fontWeight: "800" },

  searchBar: {
    backgroundColor: Colors.card,
    borderRadius: radius(1.75),
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: spacing(1.25),
    height: 46,
    alignItems: "center",
    flexDirection: "row",
    gap: spacing(1),
    ...shadows.md,
  },
  searchInput: { flex: 1, color: Colors.text },
  clearBtn: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    backgroundColor: Colors.withOpacity(Colors.text, 0.06),
  },

  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: spacing(3) },
});
