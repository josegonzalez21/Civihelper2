// src/screens/CategoryScreen.js
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
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";

import Colors, { spacing, radius } from "../theme/color";
import ServiceCard from "../components/common/ServiceCard";
import EmptyState from "../components/common/EmptyState";
import usePaginatedList from "../components/hooks/usePaginatedList";  
import useCountdown from "../components/hooks/useCountdown";            
import { API_URL, getAuthToken, API_BASE } from "../services/api";

const PAGE_SIZE = 20;

const SORTS = [
  { key: "createdAt", label: "Recientes", order: "desc" },
  { key: "ratingAvg", label: "Mejor valorados", order: "desc" },
  { key: "priceFrom", label: "Más baratos", order: "asc" },
];

export default function CategoryScreen({ navigation, route }) {
  const { id, name } = route.params || {};

  const [sortKey, setSortKey] = useState(SORTS[0].key);
  const [order, setOrder] = useState(SORTS[0].order);

  // Rate limit lock (429)
  const [locked, setLocked] = useState(false);
  const { seconds: lockSeconds, reset: resetLock } = useCountdown(0, {
    autoStart: false,
    onFinish: () => setLocked(false),
  });

  useEffect(() => {
    const isProd = !__DEV__;
    if (isProd && typeof API_BASE === "string" && !API_BASE.startsWith("https://")) {
      console.warn("En producción, use siempre HTTPS. API_BASE:", API_BASE);
    }
  }, []);

  const abortRef = useRef(null);
  const cancelOngoing = useCallback(() => {
    try { abortRef.current?.abort?.(); } catch {}
    abortRef.current = null;
  }, []);

  const applyRateLimitLock = useCallback((ms) => {
    const wait = Math.max(5_000, Math.min(ms, 5 * 60_000));
    setLocked(true);
    resetLock(Math.ceil(wait / 1000), true);
  }, [resetLock]);

  const fetcher = useCallback(
    async ({ page, pageSize, params, signal }) => {
      if (!id || locked) return { items: [], total: 0 };

      cancelOngoing();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      const combinedSignal = signal || ctrl.signal;

      const qs = new URLSearchParams({
        categoryId: String(id),
        page: String(page),
        pageSize: String(pageSize),
        sort: String(params.sortKey),
        order: String(params.order),
      });

      const url = `${API_URL}/services?${qs.toString()}`;
      const headers = { "Content-Type": "application/json" };
      const token = getAuthToken?.();
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch(url, { headers, signal: combinedSignal });

      if (res.status === 429) {
        const ra = res.headers.get("retry-after");
        const wait = ra ? parseInt(ra, 10) * 1000 : 60_000;
        applyRateLimitLock(wait);
        const err = new Error(`Demasiadas solicitudes. Intenta en ${Math.ceil(wait / 1000)} s.`);
        err.code = 429;
        throw err;
      }

      const text = await res.text();
      let data = {};
      try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }

      if (!res.ok) {
        const err = new Error(data?.message || "No se pudieron cargar los servicios.");
        err.code = res.status;
        throw err;
      }

      const list = Array.isArray(data) ? data : data?.items || [];
      const total = Array.isArray(data) ? data.length : Number(data?.total ?? 0);
      return { items: list, total };
    },
    [id, locked, applyRateLimitLock, cancelOngoing]
  );

  const {
    items,
    loading,
    refreshing,
    loadingMore,
    error,
    hasMore,
    loadMore,
    refresh,
    replaceParams,
  } = usePaginatedList({
    mode: "page",
    pageSize: PAGE_SIZE,
    initialPage: 1,
    initialParams: { sortKey, order },
    fetcher,
    getItems: (res) => res.items ?? [],
    getHasMore: (res) => (res.items?.length ?? 0) >= PAGE_SIZE,
    keyExtractor: (it) => String(it?.id),
  });

  useEffect(() => {
    replaceParams({ sortKey, order });
  }, [sortKey, order, replaceParams]);

  useEffect(() => cancelOngoing, [cancelOngoing]);

  const goBack = () => {
    if (navigation?.canGoBack?.()) navigation.goBack();
    else navigation.replace("Home");
  };

  const activeSort = useMemo(
    () => SORTS.find((s) => s.key === sortKey && s.order === order) || SORTS[0],
    [sortKey, order]
  );

  const SortChips = () => (
    <View style={styles.chipsWrap} accessibilityRole="tablist">
      {SORTS.map((s) => {
        const active = s.key === sortKey && s.order === order;
        return (
          <TouchableOpacity
            key={`${s.key}:${s.order}`}
            onPress={() => { setSortKey(s.key); setOrder(s.order); }}
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

  const ListFooter = () =>
    !loadingMore ? null : (
      <View style={{ paddingVertical: 12, alignItems: "center" }}>
        <ActivityIndicator />
      </View>
    );

  const ListEmpty = () => {
    if (locked) {
      return (
        <EmptyState
          title="Bloqueado temporalmente"
          subtitle={`Intenta en ${lockSeconds} segundos`}
          style={{ paddingHorizontal: 16 }}
        />
      );
    }
    if (loading) {
      return (
        <View style={{ paddingTop: 40, alignItems: "center" }}>
          <ActivityIndicator />
          <Text style={{ marginTop: 8, color: Colors.subtext }}>Cargando…</Text>
        </View>
      );
    }
    if (error) {
      return <EmptyState title="No se pudo cargar" subtitle={error} style={{ paddingHorizontal: 16 }} />;
    }
    return (
      <EmptyState
        title="No hay servicios en esta categoría"
        subtitle="Vuelve más tarde o explora otras categorías."
        style={{ paddingHorizontal: 16 }}
      />
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }}>
      <LinearGradient
        colors={[Colors.primary, Colors.primarySoft]}
        style={styles.hero}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.heroTop}>
          <TouchableOpacity onPress={goBack} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Volver">
            <Feather name="arrow-left" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{name || "Categoría"}</Text>
            <Text style={styles.sub}>
              {activeSort.label} {items?.length ? `· ${items.length}+` : ""}
            </Text>
          </View>
          <View style={{ width: 36 }} />
        </View>
        <SortChips />
      </LinearGradient>

      <FlatList
        data={items}
        keyExtractor={(it) => String(it.id)}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        renderItem={({ item }) => (
          <ServiceCard item={item} onPress={(s) => navigation.navigate("ServiceDetail", { id: s.id })} />
        )}
        ListEmptyComponent={ListEmpty}
        ListFooterComponent={ListFooter}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (!loading && !loadingMore && hasMore && !locked) loadMore();
        }}
        keyboardShouldPersistTaps="handled"
        removeClippedSubviews={Platform.OS === "android"}
        accessibilityLabel="Servicios por categoría"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.select({ ios: 6, android: 10, default: 10 }),
    paddingBottom: 14,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  title: { color: "#fff", fontSize: 20, fontWeight: "800" },
  sub: { color: "rgba(255,255,255,0.9)", marginTop: 2 },
  chipsWrap: { flexDirection: "row", gap: 8, marginTop: 6 },
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
});
