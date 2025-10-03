// src/screens/MyReviewsScreen.js
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Platform,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import RatingStars from "../components/common/RatingStars";
import EmptyState from "../components/common/EmptyState";
import { API_URL, API_BASE, getAuthToken } from "../services/api";
import { useAuth } from "../context/AuthContext";

const Colors = {
  primary: "#1E88E5",
  success: "#43A047",
  text: "#0F172A",
  sub: "#6B7280",
  border: "#E5E7EB",
  card: "#fff",
  bg: "#F5F7FB",
  danger: "#DC2626",
};

const PAGE_SIZE = 20;
const DEBOUNCE_MS = 300;
const MAX_Q_LEN = 120;

const SORTS = [
  { key: "createdAt", label: "Recientes", order: "desc" },
  { key: "rating", label: "Mejores", order: "desc" },
  { key: "rating", label: "Peores", order: "asc" },
];

export default function MyReviewsScreen({ navigation }) {
  const { user } = useAuth();

  const [q, setQ] = useState("");
  const query = useMemo(() => String(q || "").trim().slice(0, MAX_Q_LEN), [q]);

  const [sortKey, setSortKey] = useState(SORTS[0].key);
  const [order, setOrder] = useState(SORTS[0].order);

  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Rate-limit lock (429)
  const [lockUntil, setLockUntil] = useState(0);
  const [countdown, setCountdown] = useState(null);
  const locked = Date.now() < lockUntil;

  // HTTPS en prod
  useEffect(() => {
    const isProd = !__DEV__;
    if (isProd && typeof API_BASE === "string" && !API_BASE.startsWith("https://")) {
      console.warn("En producción, use siempre HTTPS. API_BASE:", API_BASE);
    }
  }, []);

  // contador visual
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

  const goBack = () => {
    if (navigation?.canGoBack?.()) navigation.goBack();
    else navigation.replace("Home");
  };

  // AbortController
  const abortRef = useRef(null);
  const cleanupAbort = () => {
    try {
      abortRef.current?.abort?.();
    } catch {}
    abortRef.current = null;
  };

  const fetchPage = useCallback(
    async (pageNum, append = false) => {
      if (!user?.id) {
        setItems([]);
        setHasMore(false);
        setLoading(false);
        setErrorMsg("Sesión no disponible.");
        return;
      }
      if (locked) return;

      cleanupAbort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      const params = new URLSearchParams({
        userId: String(user.id), // backend esperado: /reviews?userId=
        page: String(pageNum),
        pageSize: String(PAGE_SIZE),
        sort: String(sortKey),
        order: String(order),
      });
      if (query.length >= 2) params.set("search", query);

      const url = `${API_URL}/reviews?${params.toString()}`;

      const headers = { "Content-Type": "application/json" };
      const token = getAuthToken?.();
      if (token) headers.Authorization = `Bearer ${token}`;

      try {
        if (append) setLoadingMore(true);
        else setLoading(true);

        setErrorMsg("");

        const res = await fetch(url, { headers, signal: ctrl.signal });

        // 429 -> Retry-After
        if (res.status === 429) {
          const ra = res.headers.get("retry-after");
          const wait = ra ? parseInt(ra, 10) * 1000 : 60_000;
          applyRateLimitLock(wait);
          if (!append) setItems([]);
          setHasMore(false);
          setErrorMsg(`Demasiadas solicitudes. Intenta en ${Math.ceil(wait / 1000)} s.`);
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
          if (!append) setItems([]);
          setHasMore(false);
          setErrorMsg(data?.message || "No se pudieron cargar tus reseñas.");
          return;
        }

        // Admite array directo o { items, total }
        const list = Array.isArray(data) ? data : data?.items || [];
        const total = Array.isArray(data) ? data.length : Number(data?.total ?? 0);

        setItems((prev) => (append ? [...prev, ...list] : list));
        if (total) {
          const consumed = append ? items.length + list.length : list.length;
          setHasMore(consumed < total);
        } else {
          setHasMore(list.length === PAGE_SIZE);
        }
        setPage(pageNum);
      } catch (e) {
        if (e?.name === "AbortError") return;
        if (!append) setItems([]);
        setHasMore(false);
        setErrorMsg("No se pudieron cargar tus reseñas.");
      } finally {
        setLoading(false);
        setLoadingMore(false);
        abortRef.current = null;
      }
    },
    [user?.id, sortKey, order, query, locked, items.length]
  );

  // carga inicial y cuando cambian filtros / q
  const debounceRef = useRef(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchPage(1, false);
    }, DEBOUNCE_MS);
    return () => clearTimeout(debounceRef.current);
  }, [fetchPage, query, sortKey, order]);

  useEffect(() => {
    return () => cleanupAbort();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchPage(1, false);
    } finally {
      setRefreshing(false);
    }
  }, [fetchPage]);

  const loadMore = useCallback(async () => {
    if (loading || loadingMore || !hasMore || locked) return;
    await fetchPage(page + 1, true);
  }, [loading, loadingMore, hasMore, locked, page, fetchPage]);

  const clearQuery = () => setQ("");

  const activeSort = useMemo(
    () => SORTS.find((s) => s.key === sortKey && s.order === order) || SORTS[0],
    [sortKey, order]
  );

  /* ===== UI components internos ===== */

  const SortChips = () => (
    <View style={styles.chipsWrap} accessibilityRole="tablist">
      {SORTS.map((s) => {
        const active = s.key === sortKey && s.order === order;
        return (
          <TouchableOpacity
            key={`${s.key}:${s.order}`}
            onPress={() => {
              setSortKey(s.key);
              setOrder(s.order);
            }}
            style={[styles.chip, active && styles.chipActive]}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{s.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const HeaderBar = () => (
    <LinearGradient
      colors={[Colors.primary, Colors.success]}
      style={styles.hero}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.heroTop}>
        <TouchableOpacity
          onPress={goBack}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <Feather name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Mis reseñas</Text>
          <Text style={styles.sub}>
            {activeSort.label}
            {items?.length ? ` · ${items.length}+` : ""}
          </Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      {/* Buscador */}
      <View style={styles.searchBar} accessibilityRole="search">
        <Feather name="search" size={18} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por servicio o comentario…"
          placeholderTextColor="#9CA3AF"
          value={q}
          onChangeText={(t) => setQ(String(t).slice(0, MAX_Q_LEN))}
          returnKeyType="search"
        />
        {!!q && (
          <TouchableOpacity onPress={clearQuery} accessibilityLabel="Limpiar búsqueda" style={styles.clearBtn}>
            <Feather name="x" size={18} color="#6B7280" />
          </TouchableOpacity>
        )}
      </View>

      {/* Chips de orden */}
      <SortChips />
    </LinearGradient>
  );

  /* Tarjeta de reseña */
  const ReviewItem = ({ item }) => {
    const serviceTitle = item?.service?.title || item?.serviceTitle || `Servicio #${item?.serviceId ?? "?"}`;
    const serviceId = item?.service?.id || item?.serviceId;

    const remove = async () => {
      Alert.alert("Eliminar reseña", "¿Deseas borrar esta reseña?", [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              const token = getAuthToken?.();
              const headers = {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              };

              // Intento 1: DELETE /reviews/:id
              let ok = false;
              try {
                const res = await fetch(`${API_URL}/reviews/${item.id}`, { method: "DELETE", headers });
                ok = res.ok || res.status === 204;
              } catch {}

              // Intento 2 (fallback): DELETE /services/:serviceId/reviews/:id
              if (!ok && serviceId) {
                try {
                  const res2 = await fetch(`${API_URL}/services/${serviceId}/reviews/${item.id}`, {
                    method: "DELETE",
                    headers,
                  });
                  ok = res2.ok || res2.status === 204;
                } catch {}
              }

              if (!ok) throw new Error("No se pudo eliminar la reseña.");
              setItems((prev) => prev.filter((r) => r.id !== item.id));
            } catch (e) {
              Alert.alert("Error", e?.message || "No se pudo eliminar la reseña.");
            }
          },
        },
      ]);
    };

    return (
      <View style={styles.reviewCard} accessibilityRole="button">
        <View style={{ flex: 1 }}>
          <Text style={styles.revService} numberOfLines={1}>
            {serviceTitle}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
            <RatingStars rating={Number(item.rating || 0)} />
            <Text style={styles.revDate}>
              {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ""}
            </Text>
          </View>
          {!!item.comment && (
            <Text style={styles.revComment} numberOfLines={3}>
              {item.comment}
            </Text>
          )}
        </View>

        <View style={styles.revActions}>
          {!!serviceId && (
            <TouchableOpacity
              onPress={() => navigation.navigate("ServiceDetail", { id: serviceId })}
              style={styles.iconBtn}
              accessibilityLabel="Ver servicio"
            >
              <Feather name="external-link" size={18} color={Colors.primary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={remove} style={[styles.iconBtn, { marginLeft: 4 }]} accessibilityLabel="Eliminar reseña">
            <Feather name="trash-2" size={18} color={Colors.danger} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

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
          subtitle={`Intenta en ${countdown ?? Math.ceil((lockUntil - Date.now()) / 1000)} segundos`}
          style={{ paddingHorizontal: 16 }}
        />
      );
    }
    if (loading) {
      return (
        <View style={{ paddingTop: 40, alignItems: "center" }}>
          <ActivityIndicator />
          <Text style={{ marginTop: 8, color: Colors.sub }}>Cargando…</Text>
        </View>
      );
    }
    if (errorMsg) {
      return (
        <EmptyState
          title="No se pudo cargar"
          subtitle={errorMsg}
          style={{ paddingHorizontal: 16 }}
        />
      );
    }
    return (
      <EmptyState
        title="Aún no has publicado reseñas"
        subtitle="¡Comparte tu experiencia para ayudar a otros!"
        style={{ paddingHorizontal: 16 }}
      />
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }}>
      <HeaderBar />

      <FlatList
        data={items}
        keyExtractor={(it) => String(it.id)}
        renderItem={({ item }) => <ReviewItem item={item} />}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        ListEmptyComponent={ListEmpty}
        ListFooterComponent={ListFooter}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onEndReachedThreshold={0.4}
        onEndReached={loadMore}
        keyboardShouldPersistTaps="handled"
        removeClippedSubviews={Platform.OS === "android"}
        accessibilityLabel="Listado de mis reseñas"
      />
    </SafeAreaView>
  );
}

/* ========== Estilos ========== */
const styles = StyleSheet.create({
  hero: {
    paddingHorizontal: 16,
    paddingTop: Platform.select({ ios: 6, android: 10, default: 10 }),
    paddingBottom: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  heroTop: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
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
  sub: { color: "rgba(255,255,255,0.9)", marginTop: 2 },

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
  },
  searchInput: { flex: 1, color: "#111827" },
  clearBtn: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    backgroundColor: "#F3F4F6",
  },

  chipsWrap: { flexDirection: "row", gap: 8, marginTop: 8 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  chipActive: { backgroundColor: "#fff", borderColor: "#fff" },
  chipText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  chipTextActive: { color: Colors.text },

  reviewCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  revService: { fontWeight: "800", color: Colors.text },
  revDate: { color: Colors.sub, fontSize: 12 },
  revComment: { color: Colors.sub, marginTop: 6, lineHeight: 18 },

  revActions: { flexDirection: "row", alignItems: "center" },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
});
