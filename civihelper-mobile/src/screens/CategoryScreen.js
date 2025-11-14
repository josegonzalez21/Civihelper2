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
  TextInput,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";

import ServiceCard from "../components/common/ServiceCard";
import EmptyState from "../components/common/EmptyState";
import usePaginatedList from "../components/hooks/usePaginatedList";
import useCountdown from "../components/hooks/useCountdown";
import { API_URL, getAuthToken, API_BASE } from "../services/api";
import AppLogo from "../components/common/AppLogo";

// Paleta Páginas Amarillas
const Colors = {
  primary: "#FFD100",
  primaryDark: "#F5C400",
  primaryLight: "#FFF8CC",
  purple: "#7C3AED",
  success: "#10B981",
  text: "#0F172A",
  subtext: "#64748B",
  border: "#E5E7EB",
  card: "#FFFFFF",
  bg: "#FAFAFA",
};

const makeShadow = () =>
  Platform.OS === "android"
    ? { elevation: 2 }
    : { shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } };

const PAGE_SIZE = 20;

const SORTS = [
  { key: "createdAt", label: "Recientes", order: "desc" },
  { key: "ratingAvg", label: "Mejor valorados", order: "desc" },
  { key: "priceFrom", label: "Más baratos", order: "asc" },
  { key: "popularity", label: "Popular", order: "desc" },
];

const FILTERS = [
  { key: "all", label: "Todos", icon: "grid" },
  { key: "verified", label: "Verificados", icon: "check-circle" },
  { key: "topRated", label: "Top Rated", icon: "star" },
  { key: "affordable", label: "Económicos", icon: "dollar-sign" },
];

export default function CategoryScreen({ navigation, route }) {
  const { id, name } = route.params || {};

  const [sortKey, setSortKey] = useState(SORTS[0].key);
  const [order, setOrder] = useState(SORTS[0].order);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterKey, setFilterKey] = useState("all");
  const [showSearch, setShowSearch] = useState(false);

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
    try {
      abortRef.current?.abort?.();
    } catch {}
    abortRef.current = null;
  }, []);

  const applyRateLimitLock = useCallback(
    (ms) => {
      const wait = Math.max(5_000, Math.min(ms, 5 * 60_000));
      setLocked(true);
      resetLock(Math.ceil(wait / 1000), true);
    },
    [resetLock]
  );

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
        ...(searchQuery && { search: searchQuery }),
        ...(filterKey !== "all" && { filter: filterKey }),
      });

      const url = `${API_URL}/services?${qs.toString()}`;
      const headers = { "Content-Type": "application/json" };
      const token = getAuthToken?.();
      if (token) headers.Authorization = `Bearer ${token}`;

      try {
        const res = await fetch(url, { headers, signal: combinedSignal });

        if (res.status === 429) {
          const ra = res.headers.get("retry-after");
          const wait = ra ? parseInt(ra, 10) * 1000 : 60_000;
          applyRateLimitLock(wait);
          const err = new Error(
            `Demasiadas solicitudes. Intenta en ${Math.ceil(wait / 1000)} s.`
          );
          err.code = 429;
          throw err;
        }

        const text = await res.text();
        let data = {};
        try {
          data = text ? JSON.parse(text) : {};
        } catch {
          data = { raw: text };
        }

        if (!res.ok) {
          const err = new Error(
            data?.message || "No se pudieron cargar los servicios."
          );
          err.code = res.status;
          throw err;
        }

        const list = Array.isArray(data) ? data : data?.items || [];
        const total = Array.isArray(data)
          ? data.length
          : Number(data?.total ?? 0);
        return { items: list, total };
      } catch (err) {
        if (err.name === "AbortError") {
          return { items: [], total: 0 };
        }
        throw err;
      }
    },
    [id, locked, searchQuery, filterKey, applyRateLimitLock, cancelOngoing]
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

  useEffect(() => {
    return cancelOngoing;
  }, [cancelOngoing]);

  const goBack = () => {
    if (navigation?.canGoBack?.()) navigation.goBack();
    else navigation.replace("Home");
  };

  const activeSort = useMemo(
    () =>
      SORTS.find((s) => s.key === sortKey && s.order === order) || SORTS[0],
    [sortKey, order]
  );

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
            <Text
              style={[styles.chipText, active && styles.chipTextActive]}
            >
              {s.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const FilterChips = () => (
    <View style={styles.filterWrap}>
      {FILTERS.map((f) => {
        const active = f.key === filterKey;
        return (
          <TouchableOpacity
            key={f.key}
            onPress={() => setFilterKey(f.key)}
            style={[styles.filterChip, active && styles.filterChipActive]}
          >
            <Feather
              name={f.icon}
              size={12}
              color={active ? Colors.text : Colors.subtext}
            />
            <Text
              style={[
                styles.filterChipText,
                active && styles.filterChipTextActive,
              ]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const SearchBar = () => (
    <View style={styles.searchContainer}>
      <Feather name="search" size={16} color={Colors.text} />
      <TextInput
        style={styles.searchInput}
        placeholder="Buscar en esta categoría..."
        placeholderTextColor={Colors.subtext}
        value={searchQuery}
        onChangeText={setSearchQuery}
        returnKeyType="search"
      />
      {searchQuery ? (
        <TouchableOpacity onPress={() => setSearchQuery("")}>
          <Feather name="x" size={16} color={Colors.text} />
        </TouchableOpacity>
      ) : null}
    </View>
  );

  const ListFooter = () =>
    !loadingMore ? null : (
      <View style={{ paddingVertical: 12, alignItems: "center" }}>
        <ActivityIndicator color={Colors.primary} />
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
          <ActivityIndicator color={Colors.primary} />
          <Text style={{ marginTop: 8, color: Colors.subtext }}>Cargando...</Text>
        </View>
      );
    }
    if (error) {
      return (
        <EmptyState
          title="No se pudo cargar"
          subtitle={error}
          style={{ paddingHorizontal: 16 }}
        />
      );
    }
    return (
      <EmptyState
        title={
          searchQuery
            ? "Sin resultados"
            : "No hay servicios en esta categoría"
        }
        subtitle={
          searchQuery
            ? "Intenta con otra búsqueda"
            : "Vuelve más tarde o explora otras categorías."
        }
        style={{ paddingHorizontal: 16 }}
      />
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }}>
      <LinearGradient
        colors={[Colors.primary, Colors.primaryDark]}
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
            <Feather name="arrow-left" size={20} color={Colors.text} />
          </TouchableOpacity>

          <AppLogo
            source={require("../assets/Logo3.png")}
            size={32}
            rounded
          />

          <TouchableOpacity
            onPress={() => setShowSearch(!showSearch)}
            style={styles.searchBtn}
            accessibilityRole="button"
            accessibilityLabel="Buscar"
          >
            <Feather
              name={showSearch ? "x" : "search"}
              size={18}
              color={Colors.text}
            />
          </TouchableOpacity>
        </View>

        <Text style={styles.title}>{name || "Categoría"}</Text>
        <Text style={styles.sub}>
          {activeSort.label} {items?.length ? `· ${items.length}+` : ""}
        </Text>

        {showSearch && <SearchBar />}
        <SortChips />
        <FilterChips />
      </LinearGradient>

      <FlatList
        data={items}
        keyExtractor={(it) => String(it.id)}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        renderItem={({ item }) => (
          <ServiceCard
            item={item}
            onPress={(s) =>
              navigation.navigate("ServiceDetail", { id: s.id })
            }
          />
        )}
        ListEmptyComponent={ListEmpty}
        ListFooterComponent={ListFooter}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={Colors.primary}
          />
        }
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
    paddingHorizontal: 16,
    paddingTop: Platform.select({ ios: 6, android: 10, default: 10 }),
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Colors.card,
    alignItems: "center",
    justifyContent: "center",
    ...makeShadow(),
  },
  searchBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Colors.card,
    alignItems: "center",
    justifyContent: "center",
    ...makeShadow(),
  },
  title: { 
    color: Colors.text, 
    fontSize: 24, 
    fontWeight: "800",
    marginBottom: 4,
  },
  sub: { 
    color: Colors.text, 
    opacity: 0.7, 
    fontSize: 13 
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 12,
    marginBottom: 12,
    backgroundColor: Colors.card,
    borderRadius: 12,
    ...makeShadow(),
  },
  searchInput: {
    flex: 1,
    color: Colors.text,
    fontSize: 14,
    fontWeight: "500",
  },
  chipsWrap: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
    flexWrap: "wrap",
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.card,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: Colors.text,
    borderColor: Colors.text,
  },
  chipText: { 
    color: Colors.text, 
    fontWeight: "700", 
    fontSize: 12 
  },
  chipTextActive: { 
    color: Colors.primary 
  },
  filterWrap: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  filterChip: {
    flex: 1,
    minWidth: 75,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.card,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: Colors.text,
    borderColor: Colors.text,
  },
  filterChipText: {
    color: Colors.subtext,
    fontWeight: "600",
    fontSize: 11,
  },
  filterChipTextActive: {
    color: Colors.primary,
  },
});