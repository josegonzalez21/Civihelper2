/**
 * Pantalla de gestión de reseñas del usuario
 * 
 * Muestra todas las reseñas creadas por el usuario actual con funcionalidades de:
 * - Búsqueda/filtrado en tiempo real con debounce
 * - Ordenamiento (recientes, mejores, peores calificaciones)
 * - Paginación infinita
 * - Pull-to-refresh
 * - Eliminación de reseñas
 * - Rate limiting con countdown visual
 * - Navegación al detalle del servicio
 * 
 * @module screens/MyReviewsScreen
 */

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
import { createShadow } from "../utils/shadowHelper";

/* =========================
   CONSTANTES Y CONFIGURACIÓN
========================= */

const Colors = {
  primary: "#1E88E5",
  success: "#43A047",
  text: "#0F172A",
  sub: "#6B7280",
  border: "#E5E7EB",
  card: "#fff",
  bg: "#F5F7FB",
  danger: "#DC2626",
  warning: "#F59E0B",
};

// Configuración de paginación y búsqueda
const PAGE_SIZE = 20;
const DEBOUNCE_MS = 300;
const MAX_Q_LEN = 120;

// Rate limiting
const RATE_LIMIT = {
  MIN_WAIT: 5000, // 5 segundos
  MAX_WAIT: 300000, // 5 minutos
  DEFAULT_WAIT: 60000, // 1 minuto
};

// Opciones de ordenamiento
const SORTS = [
  { key: "createdAt", label: "Recientes", order: "desc" },
  { key: "rating", label: "Mejores", order: "desc" },
  { key: "rating", label: "Peores", order: "asc" },
];

/* =========================
   COMPONENTE PRINCIPAL
========================= */

/**
 * Pantalla de reseñas del usuario
 * 
 * @param {Object} props
 * @param {Object} props.navigation - Objeto de navegación de React Navigation
 */
export default function MyReviewsScreen({ navigation }) {
  const { user } = useAuth();

  // Estado de búsqueda y filtros
  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState(SORTS[0].key);
  const [order, setOrder] = useState(SORTS[0].order);

  // Estado de datos
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  // Estados de carga
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Estado de rate limiting
  const [lockUntil, setLockUntil] = useState(0);
  const [countdown, setCountdown] = useState(null);

  // Referencias
  const abortRef = useRef(null);
  const debounceRef = useRef(null);

  // Computados
  const locked = useMemo(() => Date.now() < lockUntil, [lockUntil]);
  const query = useMemo(
    () => String(q || "").trim().slice(0, MAX_Q_LEN),
    [q]
  );

  /**
   * Encuentra la opción de ordenamiento activa
   */
  const activeSort = useMemo(
    () => SORTS.find((s) => s.key === sortKey && s.order === order) || SORTS[0],
    [sortKey, order]
  );

  /**
   * Verifica configuración de HTTPS en producción
   */
  useEffect(() => {
    if (!__DEV__ && typeof API_BASE === "string") {
      if (!API_BASE.startsWith("https://")) {
        console.warn(
          "⚠️ [SEGURIDAD] En producción, usa siempre HTTPS. API_BASE:",
          API_BASE
        );
      }
    }
  }, []);

  /**
   * Actualiza el countdown del rate limiting
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
   * Limpia el AbortController al desmontar
   */
  useEffect(() => {
    return () => {
      cleanupAbort();
    };
  }, []);

  /**
   * Limpia el AbortController activo
   */
  const cleanupAbort = useCallback(() => {
    try {
      abortRef.current?.abort?.();
    } catch (error) {
      // Silencioso: abort puede lanzar si ya fue cancelado
    }
    abortRef.current = null;
  }, []);

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
   * Obtiene una página de reseñas del servidor
   * 
   * @param {number} pageNum - Número de página a cargar
   * @param {boolean} append - Si true, agrega a los items existentes; si false, reemplaza
   */
  const fetchPage = useCallback(
    async (pageNum, append = false) => {
      // Verifica que exista usuario autenticado
      if (!user?.id) {
        setItems([]);
        setHasMore(false);
        setLoading(false);
        setErrorMsg("Sesión no disponible. Por favor, inicia sesión.");
        return;
      }

      if (locked) return;

      // Cancela request previo si existe
      cleanupAbort();
      const controller = new AbortController();
      abortRef.current = controller;

      // Construye parámetros de búsqueda
      const params = new URLSearchParams({
        userId: String(user.id),
        page: String(pageNum),
        pageSize: String(PAGE_SIZE),
        sort: String(sortKey),
        order: String(order),
      });

      if (query.length >= 2) {
        params.set("search", query);
      }

      const url = `${API_URL}/reviews?${params.toString()}`;

      // Configura headers con autenticación
      const headers = { "Content-Type": "application/json" };
      const token = getAuthToken?.();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      try {
        // Establece estados de carga apropiados
        if (append) {
          setLoadingMore(true);
        } else {
          setLoading(true);
        }

        setErrorMsg("");

        const response = await fetch(url, {
          headers,
          signal: controller.signal,
        });

        // Manejo de rate limiting (429)
        if (response.status === 429) {
          const retryAfter = response.headers.get("retry-after");
          const wait = retryAfter
            ? parseInt(retryAfter, 10) * 1000
            : RATE_LIMIT.DEFAULT_WAIT;

          applyRateLimitLock(wait);
          if (!append) setItems([]);
          setHasMore(false);
          setErrorMsg(
            `Demasiadas solicitudes. Intenta en ${Math.ceil(wait / 1000)} segundos.`
          );
          return;
        }

        // Parsea respuesta
        const text = await response.text();
        let data = {};
        try {
          data = text ? JSON.parse(text) : {};
        } catch {
          data = { raw: text };
        }

        // Manejo de errores HTTP
        if (!response.ok) {
          if (!append) setItems([]);
          setHasMore(false);
          setErrorMsg(data?.message || "No se pudieron cargar tus reseñas.");
          return;
        }

        // Normaliza respuesta (array o objeto con items)
        const list = Array.isArray(data) ? data : data?.items || [];
        const total = Array.isArray(data)
          ? data.length
          : Number(data?.total ?? 0);

        // Actualiza items
        setItems((prev) => (append ? [...prev, ...list] : list));

        // Calcula si hay más páginas
        if (total) {
          const consumed = append ? items.length + list.length : list.length;
          setHasMore(consumed < total);
        } else {
          setHasMore(list.length === PAGE_SIZE);
        }

        setPage(pageNum);
      } catch (error) {
        // Ignora errores de cancelación
        if (error?.name === "AbortError") return;

        console.error("[MyReviewsScreen] Error fetching page:", error);
        if (!append) setItems([]);
        setHasMore(false);
        setErrorMsg("No se pudieron cargar tus reseñas.");
      } finally {
        setLoading(false);
        setLoadingMore(false);
        abortRef.current = null;
      }
    },
    [user?.id, sortKey, order, query, locked, items.length, applyRateLimitLock, cleanupAbort]
  );

  /**
   * Debounce de búsqueda: espera DEBOUNCE_MS antes de ejecutar
   */
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      fetchPage(1, false);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [fetchPage, query, sortKey, order]);

  /**
   * Handler de pull-to-refresh
   */
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchPage(1, false);
    } finally {
      setRefreshing(false);
    }
  }, [fetchPage]);

  /**
   * Handler de paginación infinita
   */
  const handleLoadMore = useCallback(async () => {
    if (loading || loadingMore || !hasMore || locked) return;
    await fetchPage(page + 1, true);
  }, [loading, loadingMore, hasMore, locked, page, fetchPage]);

  /**
   * Limpia el campo de búsqueda
   */
  const handleClearQuery = useCallback(() => {
    setQ("");
  }, []);

  /**
   * Navega hacia atrás o al home
   */
  const handleGoBack = useCallback(() => {
    if (navigation?.canGoBack?.()) {
      navigation.goBack();
    } else {
      navigation.replace("Home");
    }
  }, [navigation]);

  /**
   * Cambia el ordenamiento de las reseñas
   */
  const handleSortChange = useCallback((sortOption) => {
    setSortKey(sortOption.key);
    setOrder(sortOption.order);
  }, []);

  /* =========================
     COMPONENTES INTERNOS
  ========================= */

  /**
   * Chips de ordenamiento
   */
  const SortChips = useCallback(
    () => (
      <View style={styles.chipsWrap} accessibilityRole="tablist">
        {SORTS.map((sortOption) => {
          const active =
            sortOption.key === sortKey && sortOption.order === order;

          return (
            <TouchableOpacity
              key={`${sortOption.key}:${sortOption.order}`}
              onPress={() => handleSortChange(sortOption)}
              style={[styles.chip, active && styles.chipActive]}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`Ordenar por ${sortOption.label}`}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {sortOption.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    ),
    [sortKey, order, handleSortChange]
  );

  /**
   * Barra de header con gradiente
   */
  const HeaderBar = useCallback(
    () => (
      <LinearGradient
        colors={[Colors.primary, Colors.success]}
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

          {/* Título e información */}
          <View style={styles.heroContent}>
            <Text style={styles.title}>Mis reseñas</Text>
            <Text style={styles.sub}>
              {activeSort.label}
              {items?.length ? ` · ${items.length}` : ""}
            </Text>
          </View>

          {/* Espaciador */}
          <View style={styles.spacer} />
        </View>

        {/* Barra de búsqueda */}
        <View style={styles.searchBar} accessibilityRole="search">
          <Feather name="search" size={18} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por servicio o comentario…"
            placeholderTextColor="#9CA3AF"
            value={q}
            onChangeText={(text) => setQ(String(text).slice(0, MAX_Q_LEN))}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!locked}
            accessibilityLabel="Campo de búsqueda de reseñas"
          />
          {!!q && (
            <TouchableOpacity
              onPress={handleClearQuery}
              accessibilityLabel="Limpiar búsqueda"
              accessibilityRole="button"
              style={styles.clearBtn}
            >
              <Feather name="x" size={18} color="#6B7280" />
            </TouchableOpacity>
          )}
        </View>

        {/* Chips de ordenamiento */}
        <SortChips />
      </LinearGradient>
    ),
    [q, items.length, activeSort, locked, handleGoBack, handleClearQuery, SortChips]
  );

  /**
   * Componente de item de reseña
   */
  const ReviewItem = React.memo(function ReviewItem({ item }) {
    const serviceTitle =
      item?.service?.title ||
      item?.serviceTitle ||
      `Servicio #${item?.serviceId ?? "?"}`;
    const serviceId = item?.service?.id || item?.serviceId;

    /**
     * Maneja la eliminación de una reseña
     */
    const handleDelete = useCallback(async () => {
      Alert.alert(
        "Eliminar reseña",
        "¿Estás seguro de que deseas eliminar esta reseña? Esta acción no se puede deshacer.",
        [
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

                let success = false;

                // Intento 1: DELETE /reviews/:id
                try {
                  const res = await fetch(`${API_URL}/reviews/${item.id}`, {
                    method: "DELETE",
                    headers,
                  });
                  success = res.ok || res.status === 204;
                } catch (error) {
                  console.error("Error en DELETE /reviews/:id", error);
                }

                // Intento 2 (fallback): DELETE /services/:serviceId/reviews/:id
                if (!success && serviceId) {
                  try {
                    const res2 = await fetch(
                      `${API_URL}/services/${serviceId}/reviews/${item.id}`,
                      { method: "DELETE", headers }
                    );
                    success = res2.ok || res2.status === 204;
                  } catch (error) {
                    console.error("Error en DELETE /services/:serviceId/reviews/:id", error);
                  }
                }

                if (!success) {
                  throw new Error("No se pudo eliminar la reseña.");
                }

                // Remueve el item de la lista local
                setItems((prev) => prev.filter((r) => r.id !== item.id));

                Alert.alert("Eliminada", "La reseña fue eliminada exitosamente.");
              } catch (error) {
                console.error("[MyReviewsScreen] Error eliminando reseña:", error);
                Alert.alert(
                  "Error",
                  error?.message || "No se pudo eliminar la reseña. Intenta nuevamente."
                );
              }
            },
          },
        ]
      );
    }, [item.id, serviceId]);

    /**
     * Navega al detalle del servicio
     */
    const handleNavigateToService = useCallback(() => {
      if (serviceId) {
        navigation.navigate("ServiceDetail", { id: serviceId });
      }
    }, [serviceId]);

    return (
      <View style={styles.reviewCard} accessibilityRole="article">
        <View style={styles.reviewContent}>
          <Text style={styles.revService} numberOfLines={1}>
            {serviceTitle}
          </Text>

          <View style={styles.ratingRow}>
            <RatingStars rating={Number(item.rating || 0)} size={16} />
            <Text style={styles.revDate}>
              {item.createdAt
                ? new Date(item.createdAt).toLocaleDateString("es-ES", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })
                : ""}
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
              onPress={handleNavigateToService}
              style={styles.iconBtn}
              accessibilityLabel="Ver servicio"
              accessibilityRole="button"
            >
              <Feather name="external-link" size={18} color={Colors.primary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={handleDelete}
            style={[styles.iconBtn, styles.deleteBtn]}
            accessibilityLabel="Eliminar reseña"
            accessibilityRole="button"
          >
            <Feather name="trash-2" size={18} color={Colors.danger} />
          </TouchableOpacity>
        </View>
      </View>
    );
  });

  /**
   * Footer de la lista (indicador de carga)
   */
  const ListFooter = useCallback(() => {
    if (!loadingMore) return null;
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }, [loadingMore]);

  /**
   * Componente cuando la lista está vacía
   */
  const ListEmpty = useCallback(() => {
    if (locked) {
      const seconds = countdown ?? Math.ceil((lockUntil - Date.now()) / 1000);
      return (
        <EmptyState
          title="Bloqueado temporalmente"
          subtitle={`Intenta nuevamente en ${seconds} segundos`}
          style={styles.emptyState}
        />
      );
    }

    if (loading) {
      return (
        <View style={styles.centerContent}>
          <ActivityIndicator color={Colors.primary} />
          <Text style={styles.loadingText}>Cargando reseñas…</Text>
        </View>
      );
    }

    if (errorMsg) {
      return (
        <EmptyState
          title="No se pudo cargar"
          subtitle={errorMsg}
          style={styles.emptyState}
        />
      );
    }

    return (
      <EmptyState
        title="Aún no has publicado reseñas"
        subtitle="¡Comparte tu experiencia para ayudar a otros usuarios!"
        style={styles.emptyState}
      />
    );
  }, [locked, countdown, lockUntil, loading, errorMsg]);

  /**
   * Renderiza un item de la lista
   */
  const renderItem = useCallback(
    ({ item }) => <ReviewItem item={item} />,
    []
  );

  /**
   * Extractor de key para FlatList
   */
  const keyExtractor = useCallback((item) => String(item.id), []);

  /* =========================
     RENDERIZADO
  ========================= */

  return (
    <SafeAreaView style={styles.safeArea}>
      <HeaderBar />

      <FlatList
        data={items}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={ListEmpty}
        ListFooterComponent={ListFooter}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        onEndReachedThreshold={0.4}
        onEndReached={handleLoadMore}
        keyboardShouldPersistTaps="handled"
        removeClippedSubviews={Platform.OS === "android"}
        accessibilityLabel="Listado de mis reseñas"
      />
    </SafeAreaView>
  );
}

/* =========================
   ESTILOS
========================= */

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.bg,
  },

  // Header con gradiente
  hero: {
    paddingHorizontal: 16,
    paddingTop: Platform.select({
      ios: 6,
      android: 10,
      default: 10,
    }),
    paddingBottom: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
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
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
  },

  heroContent: {
    flex: 1,
  },

  title: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
  },

  sub: {
    color: "rgba(255,255,255,0.9)",
    marginTop: 2,
    fontSize: 13,
  },

  spacer: {
    width: 36,
  },

  // Barra de búsqueda
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
    ...createShadow({
      elevation: 2,
      shadowColor: "#000",
      shadowOpacity: 0.06,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
    }),
  },

  searchInput: {
    flex: 1,
    color: "#111827",
    fontSize: 14,
  },

  clearBtn: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    backgroundColor: "#F3F4F6",
  },

  // Chips de ordenamiento
  chipsWrap: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },

  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
    backgroundColor: "rgba(255,255,255,0.12)",
  },

  chipActive: {
    backgroundColor: "#fff",
    borderColor: "#fff",
  },

  chipText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
  },

  chipTextActive: {
    color: Colors.text,
  },

  // Lista
  listContent: {
    padding: 16,
    gap: 10,
  },

  loadingFooter: {
    paddingVertical: 12,
    alignItems: "center",
  },

  // Tarjeta de reseña
  reviewCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    ...createShadow({
      elevation: 2,
      shadowColor: "#000",
      shadowOpacity: 0.08,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
    }),
  },

  reviewContent: {
    flex: 1,
  },

  revService: {
    fontWeight: "800",
    color: Colors.text,
    fontSize: 15,
  },

  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },

  revDate: {
    color: Colors.sub,
    fontSize: 12,
  },

  revComment: {
    color: Colors.sub,
    marginTop: 6,
    lineHeight: 18,
    fontSize: 14,
  },

  // Acciones de la reseña
  revActions: {
    flexDirection: "row",
    alignItems: "center",
  },

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

  deleteBtn: {
    marginLeft: 4,
  },

  // Estados vacíos
  centerContent: {
    paddingTop: 40,
    alignItems: "center",
  },

  loadingText: {
    marginTop: 8,
    color: Colors.sub,
    fontSize: 14,
  },

  emptyState: {
    paddingHorizontal: 16,
  },
});